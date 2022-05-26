import { ethers } from 'ethers';
import type Pod from '../../Pod';
import {
  SafeTransaction,
  getSafeInfo,
  getGasEstimation,
  getSafeTxHash,
  submitSafeTransactionToService,
  getSafeTransactionsBySafe,
  approveSafeTransaction,
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
export async function createSafeTransaction(input: {
  safe: string;
  to: string;
  value?: string;
  data?: string;
  sender: string;
  nonce?: number;
}): Promise<SafeTransaction> {
  const [{ nonce, threshold }, [lastTx], safeTxGas] = await Promise.all([
    getSafeInfo(input.safe),
    getSafeTransactionsBySafe(input.safe, { limit: 1, status: 'queued' }),
    getGasEstimation(input),
  ]);

  if (!lastTx.isExecuted) {
    throw new Error('Pod already has an active proposal');
  }

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

  return createdSafeTransaction;
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
    await createSafeTransaction({
      safe: subPod.safe,
      to: superProposal.safe,
      data: encodeFunctionData('GnosisSafe', 'approveHash', [superProposalHash]),
      sender: signerAddress,
    });
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

/**
 * Creates and approves a sub proposal to approve a super proposal
 * @param superProposal
 * @param subPod
 * @param signer
 */
export async function approveSuperProposal(
  superProposal: SafeTransaction,
  subPod: Pod,
  signer: ethers.Signer,
) {
  const signerAddress = await signer.getAddress();
  if (!(await subPod.isMember(signerAddress))) {
    throw new Error(`Signer was not a member of subpod ${subPod.ensName}`);
  }

  // TODO: There's an (unlikely) chance that we might fail to get all queued/active proposals
  // Need to handle that down the line.
  const subPodProposals = await subPod.getProposals({ status: 'queued', limit: 10 });

  // Look for existing sub proposal
  const subProposal = subPodProposals.find(
    proposal =>
      proposal.method === 'approveHash' &&
      proposal.parameters[0].value === superProposal.safeTxHash &&
      proposal.status !== 'executed',
  );
  if (subProposal) {
    if (subProposal.approvals.includes(signerAddress))
      throw new Error('Signer already approved sub proposal');
    try {
      // Approve the existing sub proposal
      await approveSafeTransaction(subProposal.safeTransaction, signer);
    } catch (err) {
      throw new Error(`Error when approving sub proposal: ${err}`);
    }
    return;
  }

  // Otherwise, we have to create the sub proposal
  try {
    // createSafeTransaction also approves the transaction.
    await createSafeTransaction({
      safe: subPod.safe,
      to: superProposal.safe,
      data: encodeFunctionData('GnosisSafe', 'approveHash', [superProposal.safeTxHash]),
      sender: signerAddress,
    });
  } catch (err) {
    throw new Error(`Error when creating sub proposal: ${err.response.data}`);
  }
}

/**
 * Rejects a super proposal
 *
 * Super proposal rejections, from the sub proposal point of view, are separate approveHash calls that approve
 * a rejection transaction on the super pod
 *
 * @param superProposalTxHash - The transaction hash that identifies the original super proposal (i.e., not the rejection super proposal)
 * @param subProposal - The sub proposal related to the superProposalTxHash
 * @param signer - Signer of sub pod member
 */
export async function rejectSuperProposal(
  superProposal: SafeTransaction,
  subPod: Pod,
  signer: ethers.Signer,
) {
  const superPodTransactions = await getSafeTransactionsBySafe(superProposal.safe, {
    nonce: superProposal.nonce,
  });

  // The super reject, i.e., the transaction that rejects the super proposal
  let superReject = superPodTransactions.find(
    safeTx => safeTx.data === null && safeTx.to === superProposal.safe,
  );
  if (!superReject) {
    // No such tx, we have to create ourselves. This is a standard Gnosis reject
    // This will not sign the transaction because we're just passing the pod safe.
    superReject = await createRejectTransaction(superProposal, subPod.safe);
  }

  const signerAddress = await signer.getAddress();

  // TODO: There's an (unlikely) chance that we might fail to get all queued/active proposals
  // Need to handle that down the line.
  const subPodProposals = await subPod.getProposals({ status: 'queued', limit: 10 });
  const subReject = subPodProposals.find(
    proposal =>
      proposal.method === 'approveHash' &&
      // Looking for an approveHash that is NOT for the super proposal we have, that should be the reject
      // TODO: This theoretically fails if there are two unrelated super proposals being voted on simultaneously.
      proposal.parameters[0].value !== superProposal.safeTxHash &&
      proposal.status !== 'executed',
  );
  // If subReject exists, we can just approve it and end the call.
  if (subReject) {
    if (subReject.approvals.includes(signerAddress))
      throw new Error('Signer already approved sub proposal');
    try {
      // Approve the existing sub proposal
      await approveSafeTransaction(subReject.safeTransaction, signer);
      return;
    } catch (err) {
      throw new Error(`Error when approving sub proposal: ${err}`);
    }
  }

  // If sub reject does not exist, we need to create it.
  // Find the matching sub approve so we know what nonce to use.
  const subApprove = subPodProposals.find(
    proposal =>
      proposal.method === 'approveHash' &&
      // Looking for an approveHash that is NOT for the super proposal we have, that should be the reject
      // TODO: This theoretically fails if there are two unrelated super proposals being voted on simultaneously.
      proposal.parameters[0].value === superProposal.safeTxHash &&
      proposal.status !== 'executed',
  );

  // Create the sub reject. This is _not_ a standard Gnosis reject
  // Instead, we need to create a sub proposal that approves the super reject proposal.
  await createSafeTransaction({
    safe: subPod.safe,
    to: superProposal.safe,
    data: encodeFunctionData('GnosisSafe', 'approveHash', [superReject.safeTxHash]),
    sender: await signer.getAddress(),
    // If the sub approve exists, use the same nonce. Otherwise createSafeTransaction will auto-populate
    // the appropriate nonce if we pass null.
    nonce: subApprove ? subApprove.id : null,
  });
}
