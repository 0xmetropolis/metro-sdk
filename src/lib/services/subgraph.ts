import axios from 'axios';
import { config } from '../../config';

/**
 * Returns an array of addresses of all pod members.
 * @param id
 */
export async function fetchPodUsers(id: number): Promise<string[]> {
  const { data } = await axios.post(config.subgraphUrl, {
    query: `query GetPodUsers($id: ID!) {
          pod(id: $id) {
            users {
              user {
                id
              }
            }
          }
        }`,
    variables: { id },
  });
  const { users } = data.data.pod || { users: [] };
  return users.map(user => user.user.id);
}

/**
 * Returns a list of Pod IDs from subgraph that user is a member of.
 * This function bypasses Pod construction and is mostly used for optimization purposes.
 * If you're unsure on what function to use, use `getUserPods` instead.
 * @param address
 */
export async function fetchUserPodIds(address: string): Promise<number[]> {
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
  const podIds = pods.map(({ pod }) => parseInt(pod.id, 10));
  return podIds;
}

/**
 * Returns an array of Pod IDs from sub graph that an address is the admin of
 * This function bypasses Pod construction and is mostly used for optimization purposes.
 * If you're unsure on what function to use, use `getAdminPods` instead.
 * @param address
 */
export async function fetchAdminPodIds(address: string): Promise<number[]> {
  const { data } = await axios.post(config.subgraphUrl, {
    query: `query GetUserPods($id: ID!) {
        user(id: $id) {
          adminPods
        }
      }`,
    variables: { id: address.toLowerCase() },
  });
  const { adminPods } = data.data.user || { adminPods: [] };
  const podIds = adminPods.map(pod => parseInt(pod, 10));
  return podIds;
}
