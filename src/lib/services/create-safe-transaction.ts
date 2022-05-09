// This module has helper functions for the transaction service
import { ethers } from 'ethers';
import {
  getSafeInfo,
  getSafeTransactionsBySafe,
  getGasEstimation,
  getSafeTxHash,
  submitSafeTransactionToService,
  approveSafeTransaction,
} from './transaction-service';

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
  const [{ threshold }, safeTransaction, safeTxGas] = await Promise.all([
    getSafeInfo(input.safe),
    getSafeTransactionsBySafe(input.safe, { limit: 1 }),
    getGasEstimation(input),
  ]);

  // If safeTransaction is an empty array, then this is the first tx on the safe.
  const isFirst = safeTransaction.length === 0;

  // If it's the first one, set it to 0. Otherwise we need to increment to avoid collision.
  const nonce = isFirst ? 0 : safeTransaction[0].nonce + 1;

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
