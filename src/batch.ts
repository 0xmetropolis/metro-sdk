import { ethers } from 'ethers';
import {
  checkAddress,
  getMetropolisContract,
  handleEthersError,
  getIsSameVersion,
} from './lib/utils';
import Pod from './Pod';

/**
 * Batch transfers pod memberships. If a signer is provided, it will execute the transaction. Otherwise it will return the unsigned tx.
 *
 * @param fromAddress - Address that is giving up membership
 * @param toAddress - Address that will receive membership
 * @param podIds - Array of pod IDs for which the toAddress will receive membership
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
  // we need to get the pod object for the podIds for the member and version checks
  const pods = await Promise.all(podIds.map(async podId => new Pod(podId)));
  // check the fromAddress
  const checkedFrom = checkAddress(fromAddress);
  // check the toAddress
  const checkedTo = checkAddress(toAddress);

  if (signer) {
    const signerAddress = await signer.getAddress();
    if (checkedFrom !== signerAddress) throw new Error('Signer did not match the from address');
    // we have to check all the pods to ensure the signer is a member of each one
    const isPodMember = await Promise.all(pods.map(async pod => pod.isMember(signerAddress)));
    // if any value in the isPodMember array is false, throw an erray
    if (isPodMember.includes(false)) {
      throw new Error(`Signer ${signerAddress} is not a member of this pod`);
    }
  }

  // check to see if all pods have the same controller version
  const isSameVersion = getIsSameVersion(pods.map(pod => pod.controller));
  if (!isSameVersion) {
    throw new Error('All pods must be on the same controller version');
  }

  try {
    const MemberToken = getMetropolisContract('MemberToken', signer);
    // this has to be the same length as the podIds array
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
