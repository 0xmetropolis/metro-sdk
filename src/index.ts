import { ethers } from 'ethers';
import Pod from './Pod';
import Proposal from './Proposal';
import { multiPodCreate, podifySafe, enableController } from './pod-create';
import { Pod as PodType, Proposal as ProposalType, ProposalStatus } from './types';
import { init, config } from './config';
import { checkAddress } from './lib/utils';
import {
  fetchPodUsers,
  fetchUserPodIds,
  fetchAdminPodIds,
  customSubgraphQuery,
} from './lib/services/subgraph';
import { getSafeTransactionByHash } from './lib/services/transaction-service';

/**
 * Gets a pod object.
 *
 * @param identifier - Pod ID (as number), safe address, or ENS name
 */
async function getPod(identifier: string | number): Promise<Pod> {
  return new Pod(identifier);
}

/**
 * Gets the super proposal that the sub proposal relates to
 * @throws If this proposal is not a sub proposal
 * @throws If the found super proposal does not relate to this sub proposal.
 * @returns
 */
async function getSuperProposal(proposal: Proposal): Promise<Proposal> {
  if (!proposal.isSubProposal) throw new Error('This proposal is not a sub proposal');
  // Getting the safe transaction for the super proposal.
  const safeTransaction = await getSafeTransactionByHash(proposal.parameters[0].value);
  const pod = await getPod(safeTransaction.safe);
  return pod.getProposal(safeTransaction.nonce);
}

/**
 * Fetches an array of Pod objects that a user is a member of
 *
 * @param address - user address
 */
async function getUserPods(address: string): Promise<Pod[]> {
  try {
    ethers.utils.getAddress(address);
  } catch {
    throw new TypeError(`Invalid address provided to getUserPods: ${address}`);
  }
  const userPodIds = await fetchUserPodIds(address);
  return Promise.all(userPodIds.map(async pod => new Pod(pod)));
}

/**
 * Gets an array of Pod objects that a user is the admin of
 * @param address - user address
 */
async function getAdminPods(address: string): Promise<Pod[]> {
  checkAddress(address);
  const adminPodIds = await fetchAdminPodIds(address);
  return Promise.all(adminPodIds.map(async pod => new Pod(pod)));
}

export {
  init,
  config,
  getPod,
  getSuperProposal,
  getUserPods,
  getAdminPods,
  fetchPodUsers,
  fetchUserPodIds,
  fetchAdminPodIds,
  customSubgraphQuery,
  multiPodCreate,
  podifySafe,
  enableController,
  PodType as Pod,
  ProposalType as Proposal,
  ProposalStatus,
};
