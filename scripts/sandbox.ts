import { ethers } from 'ethers';
import { customSubgraphQuery, getUserPods, init } from '../src';
import { getPod, multiPodCreate } from '../src';
import { accountOne, accountTwo, adminPodAddress } from '../env.json';
import { setup, sleep } from './utils';

const multiPodInput = [
  {
    label: 'multi-parent-c',
    members: ['multi-child-c', accountOne],
    threshold: 1,
    admin: accountOne,
  },
  {
    label: 'multi-child-c',
    members: [accountOne, accountTwo],
    threshold: 1,
  },
  {
    label: 'multi-child2-c',
    members: [accountOne, accountTwo],
    threshold: 1,
    admin: 'multi-parent-c',
  },
];

async function main() {
  const { walletOne, dummyAccount } = setup(4);

  const butt = await customSubgraphQuery(`{
    pods(where: {
      id_in: [1, 2, 3]
    }) {
      id
      users {
        id
      }
      admin
    }
  }`);
  console.log('butt', butt);
}

main();
