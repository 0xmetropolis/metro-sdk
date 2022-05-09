import { ethers } from 'ethers';
import {
  getSafeInfo,
  getGasEstimation,
  getSafeTxHash,
  submitSafeTransactionToService,
  getSafeTransactionsBySafe,
  approveSafeTransaction,
} from './transaction-service';

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
    nonce,
    operation: 0,
    baseGas: 0,
    gasPrice: '0',
  };

  // The input doesn't have a contractTransactionHash,
  // We need to generate one from the transaction-service.
  const safeTxHash = await getSafeTxHash(data);

  const createdSafeTransaction = await submitSafeTransactionToService({ safeTxHash, ...data });
  await approveSafeTransaction(createdSafeTransaction, signer);
}
