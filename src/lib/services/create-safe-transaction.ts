import { ethers } from 'ethers';
import type Pod from '../../Pod';
import type Proposal from '../../Proposal';
import {
  getSafeInfo,
  getGasEstimation,
  getSafeTxHash,
  submitSafeTransactionToService,
  getSafeTransactionsBySafe,
  approveSafeTransaction,
  getSafeTransactionByHash,
  createRejectTransaction,
} from './transaction-service';
import { encodeFunctionData } from '../utils';
/**
 * Gets the nonce of the next transaction for a safe
 * @param safeAddress - safe address
 * @returns Nonce of next transaction
 */
export async function getNextNonce(safeAddress: string): Promise<number> {
  const txs = await getSafeTransactionsBySafe(safeAddress, { limit: 1 });
  // If the length is 0, that means this is the first transaction, so nonce is 0.
  // otherwise, txs[0] is the latest nonce, including queued transactions.
  const nonce = txs.length === 0 ? 0 : txs[0].nonce + 1;
  return nonce;
}

/**
 * Creates safe transaction
 * @param input.safe - Address of Gnosis safe
 * @param input.to - Smart contract address (i.e., MemberToken)
 * @param input.value - Value to send
 * @param input.data - Transaction data
 * @param input.sender - Address that is initiating the transaction
 * @returns {SafeTransaction}
 */
// eslint-disable-next-line import/prefer-default-export
export async function createSafeTransaction(
  input: {
    safe: string;
    to: string;
    value?: string;
    data?: string;
    sender: string;
    nonce?: number;
  },
  signer: ethers.Signer,
) {
  const [{ threshold }, nonce, safeTxGas] = await Promise.all([
    getSafeInfo(input.safe),
    getNextNonce(input.safe),
    getGasEstimation(input),
  ]);

  const data = {
    safe: input.safe,
    to: input.to,
    value: input.value || '0',
    data: input.data || ethers.constants.HashZero,
    sender: ethers.utils.getAddress(input.sender), // Get the checksummed address
    confirmationsRequired: threshold,
    safeTxGas,
    // If provided an override nonce
    nonce: input.nonce ? input.nonce : nonce,
    operation: 0,
    baseGas: 0,
    gasPrice: '0',
  };

  // The input doesn't have a contractTransactionHash,
  // We need to generate one from the transaction-service.
  const safeTxHash = await getSafeTxHash(data);

  const createdSafeTransaction = await submitSafeTransactionToService({ safeTxHash, ...data });
  await approveSafeTransaction(createdSafeTransaction, signer);

  return createdSafeTransaction;
}

export async function rejectSuperProposal(
  superProposalTxHash: string,
  subProposal: Proposal,
  signer: ethers.Signer,
) {
  const subPod = subProposal.pod;
  // Fetch the superProposal
  const superProposal = await getSafeTransactionByHash(superProposalTxHash);
  const superPodTransactions = await getSafeTransactionsBySafe(superProposal.safe, {
    nonce: superProposal.nonce,
  });

  // The super reject, i.e., the transaction that rejects the super proposal
  let superReject = superPodTransactions.find(
    safeTx => safeTx.data === null && safeTx.to === superProposal.safe,
  );
  // Need to create a super reject ourselves. This is a standard Gnosis reject.
  if (!superReject) {
    // This will not sign the transaction because we're just passing the pod safe.
    superReject = await createRejectTransaction(superProposal, subPod.safe);
  }

  // The sub reject, i.e., the transaction that approves the super reject
  const subPodTransactions = await getSafeTransactionsBySafe(subPod.safe, {
    nonce: subProposal.id,
  });
  let subReject = subPodTransactions.find(
    safeTx =>
      safeTx.dataDecoded.method === 'approveHash' &&
      safeTx.dataDecoded.parameters[0].value === superReject.safeTxHash,
  );

  // Need to create the sub reject. This is _not_ a standard Gnosis reject
  // Instead, we need to approve the super reject proposal.
  if (!subReject) {
    // This will create + approve the sub reject
    subReject = await createSafeTransaction(
      {
        safe: subPod.safe,
        to: superProposal.safe,
        data: encodeFunctionData('GnosisSafe', 'approveHash', [superReject.safeTxHash]),
        sender: await signer.getAddress(),
        nonce: subProposal.id,
      },
      signer,
    );
  } else {
    // Just need to approve subReject
    await approveSafeTransaction(subReject, signer);
  }
}

/**
 * Creates a nested proposal (i.e., a proposal on a subpod to perform an action to the superpod)
 * @param superProposal
 * @param input.safe - Subpod safe address
 * @param input.to - Contract address the transaction should be executed against
 * @param input.value - Value
 * @param input.data - Transaction data that should be performed by the superpod
 * @param input.sender - Sender of transaction (i.e., subpod member)
 * @param signer - Signer of subpod member
 * @returns
 */
export async function createNestedProposal(
  superProposal: {
    safe: string;
    to: string;
    value?: string;
    data?: string;
    sender: string;
  },
  subPod: Pod,
  signer: ethers.Signer,
) {
  const [{ threshold: superThreshold }, [{ nonce: superNonce }], superTxGas] = await Promise.all([
    getSafeInfo(superProposal.safe),
    getSafeTransactionsBySafe(superProposal.safe, { limit: 1 }),
    getGasEstimation(superProposal),
  ]);

  // Data for the proposal that will be created on the superpod.
  // This will be sent from the subpod
  const superProposalData = {
    safe: superProposal.safe,
    to: superProposal.to,
    value: superProposal.value || '0',
    data: superProposal.data || ethers.constants.HashZero,
    sender: ethers.utils.getAddress(subPod.safe), // Get the checksummed address
    confirmationsRequired: superThreshold,
    safeTxGas: superTxGas,
    nonce: superNonce + 1, // We got the latest transaction, so add 1 to it.
    operation: 0,
    baseGas: 0,
    gasPrice: '0',
  };
  const superProposalHash = await getSafeTxHash(superProposalData);

  // Creating the sub proposal
  const signerAddress = await signer.getAddress();
  try {
    await createSafeTransaction(
      {
        safe: subPod.safe,
        to: superProposal.safe,
        data: encodeFunctionData('GnosisSafe', 'approveHash', [superProposalHash]),
        sender: signerAddress,
      },
      signer,
    );
  } catch (err) {
    throw new Error(`Error when creating subproposal: ${err.response.data}`);
  }

  // Creating the super proposal
  try {
    await submitSafeTransactionToService({
      ...superProposalData,
      safeTxHash: superProposalHash,
    });
  } catch (err) {
    throw new Error(`Error when creating superproposal: ${err.response.data}`);
  }
}
