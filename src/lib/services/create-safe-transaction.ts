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
  getSafeTransactionByHash,
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
export async function createSafeTransaction(input: {
  safe: string;
  to: string;
  value?: string;
  data?: string;
  sender: string;
  nonce?: number;
}): Promise<SafeTransaction> {
  const [{ nonce, threshold }, [lastTx, lastTx2], safeTxGas] = await Promise.all([
    getSafeInfo(input.safe),
    getSafeTransactionsBySafe(input.safe, { limit: 2, status: 'queued' }),
    getGasEstimation(input),
  ]);

  // TODO: This is clunky, but a quick fix to just check if the last "proposal" (i.e.,
  // last 2 transactions) is still active. I think we should probably pass the Pod obj
  // into this function, but we also need to implement a refetch function in the Pod obj.
  // This also assumes that there's no more than 2 SafeTransactions for a given nonce.
  if (!input.nonce) {
    // Skip this check if we're overriding, e.g., making a super reject
    if (lastTx !== undefined && lastTx2 !== undefined && lastTx.nonce === lastTx2.nonce) {
      // If neither of the last txs are executed.
      if (!(lastTx.isExecuted || lastTx2.isExecuted)) {
        throw new Error('Pod already has an active proposal');
      }
    } else if (lastTx !== undefined && !lastTx.isExecuted) {
      throw new Error('Pod already has an active proposal');
    }
  }

  const data = {
    safe: input.safe,
    to: ethers.utils.getAddress(input.to),
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
  superProposalTxHash: string,
  subPod: Pod,
  signer: ethers.Signer,
) {
  const superProposal = await getSafeTransactionByHash(superProposalTxHash);
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
  const subRejectTransaction = await createSafeTransaction({
    safe: subPod.safe,
    to: superProposal.safe,
    data: encodeFunctionData('GnosisSafe', 'approveHash', [superReject.safeTxHash]),
    sender: await signer.getAddress(),
    // If the sub approve exists, use the same nonce. Otherwise createSafeTransaction will auto-populate
    // the appropriate nonce if we pass null.
    nonce: subApprove ? subApprove.id : null,
  });
  await approveSafeTransaction(subRejectTransaction, signer);
}
