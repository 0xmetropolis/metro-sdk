import axios from 'axios';
import { ethers } from 'ethers';
import Pod from './Pod';
import { init, config } from './config';

async function getPod(address: string): Promise<Pod> {
  return new Pod(address);
}

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
  const { pods } = data.data.user || { pods: [] };
  // Remove GraphQL nested layer for UserPod
  const unsortedPods = pods.map(({ pod }) => parseInt(pod.id, 10));
  return Promise.all(unsortedPods.map(async pod => new Pod(pod)));
}

export { init, config, getPod, getUserPods };
