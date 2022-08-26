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

/**
 * Makes a custom call on the subgraph by passing a query in directly.
 * Note that this data will likely require manual transformation to be usable.
 *
 * Example: Making a call to retrieve pod IDs 1 through 3:
 *
 * ```js
 * await customSubgraphQuery(`{
 *    pods(where: {
 *      id_in: [1, 2, 3]
 *    }) {
 *      id
 *      users {
 *        id
 *      }
 *      admin
 *    }
 *  }`
 *
 * Which will return:
 *
 * ```
 * {
 *  pods: [
 *    {
 *      id: '1',
 *      users: [Array],
 *      admin: '0x0000000000000000000000000000000000000000'
 *    },
 *    {
 *      id: '2',
 *      users: [Array],
 *      admin: '0x0000000000000000000000000000000000000000'
 *    },
 *    {
 *      id: '3',
 *      users: [Array],
 *      admin: '0x4b4c43f66ec007d1dbe28f03dac975aab5fbb888'
 *    }
 *  ]
 * }
 *  ```
 *
 * Note these are not Pod objects as defined by the SDK.
 *
 * @param query - GraphQL query
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function customSubgraphQuery(query: string): Promise<any> {
  const { data } = await axios.post(config.subgraphUrl, {
    query,
  });
  return data.data;
}
