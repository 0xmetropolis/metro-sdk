import axios from 'axios';
import { ethers } from 'ethers';
import Pod from './Pod';
import { Pod as PodType, Proposal as ProposalType, ProposalStatus } from './types';
import { init, config } from './config';
import { checkAddress } from './lib/utils';
import { fetchUserPodIds, fetchAdminPodIds } from './lib/services/subgraph';

/**
 * Gets a pod object.
 *
 * @param identifier - Pod ID (as number), safe address, or ENS name
 */
async function getPod(identifier: string | number): Promise<Pod> {
  return new Pod(identifier);
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
  getUserPods,
  getAdminPods,
  PodType as Pod,
  ProposalType as Proposal,
  ProposalStatus,
};
