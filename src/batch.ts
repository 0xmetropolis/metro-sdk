import { ethers } from 'ethers';
import { checkAddress, getMetropolisContract, handleEthersError } from './lib/utils';

/**
 * Batch transfers pod memberships. If a signer is provided, it will execute the transaction. Otherwise it will return the unsigned tx.
 *
 * @param fromAddress - Address that is giving up membership
 * @param toAddress - Address that will receive membership
 * @param podIds - Array of pod IDs for transferring membership
 * @param signer - If a signer is provided, then the tx will execute. Otherwise, an unsigned transaction will be returned.
 * @throws If toAddress is already a member
 * @throws if fromAddress is not a member
 * @throws If provided signer is not the fromAddress
 */
export default async function batchTransferMembership(
  fromAddress: string,
  toAddress: string,
  podIds: number[],
  signer?: ethers.Signer,
): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> {
  const checkedFrom = checkAddress(fromAddress);
  const checkedTo = checkAddress(toAddress);

  try {
    const MemberToken = getMetropolisContract('MemberToken', signer);
    const valueArray = new Array(podIds.length).fill(1);
    if (signer) {
      return MemberToken.safeBatchTransferFrom(
        checkedFrom,
        checkedTo,
        podIds,
        valueArray,
        ethers.constants.HashZero,
      );
    }
    return (await MemberToken.populateTransaction.safeBatchTransferFrom(
      checkedFrom,
      checkedTo,
      podIds,
      valueArray,
      ethers.constants.HashZero,
    )) as { to: string; data: string };
  } catch (err) {
    return handleEthersError(err);
  }
}
