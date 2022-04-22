import axios from 'axios';
import { ethers } from 'ethers';
import Pod from './Pod';
import { Pod as PodType, Proposal as ProposalType, ProposalStatus } from './types';
import { init, config } from './config';
import { checkAddress } from './lib/utils';

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
  const { data } = await axios.post(config.subgraphUrl, {
    query: `query GetUserPods($id: ID!) {
        user(id: $id) {
          pods {
            id
            pod {
              id
            }
          }
        }
      }`,
    variables: { id: address.toLowerCase() },
  });
  const { pods } = data?.data?.user || { pods: [] };
  // Remove GraphQL nested layer for UserPod
  const unsortedPods = pods.map(({ pod }) => parseInt(pod.id, 10));
  return Promise.all(unsortedPods.map(async pod => new Pod(pod)));
}

/**
 * Gets an array of Pod objects that a user is the admin of
 * @param address - user address
 */
async function getAdminPods(address: string): Promise<Pod[]> {
  checkAddress(address);

  const { data } = await axios.post(config.subgraphUrl, {
    query: `query GetUserPods($id: ID!) {
        user(id: $id) {
          adminPods
        }
      }`,
    variables: { id: address.toLowerCase() },
  });
  const { adminPods } = data.data.user || { adminPods: [] };
  return Promise.all(adminPods.map(async pod => new Pod(parseInt(pod, 10))));
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
