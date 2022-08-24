import { ethers } from 'ethers';
import { getUserPods, init } from '../src';
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

  console.time();
  const pods = await getUserPods('0x1cC62cE7cb56ed99513823064295761f9b7C856e');
  console.log('pods', pods);
  console.log('pods.length', pods.length);
  console.timeEnd();
}

main();
