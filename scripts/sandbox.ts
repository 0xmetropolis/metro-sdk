import { ethers } from 'ethers';
import { init } from '../src';
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
  const { walletOne } = setup(4);

  // await multiPodCreate(multiPodInput, walletOne);
  // const multiParent = await getPod('multi-parent-c.pod.eth');
  // console.log('multiParent', multiParent);
  // const members = await multiParent.getMembers();
  // console.log(await multiParent.getMembers());

  // const multiChild = await getPod('multi-child-c.pod.eth');
  // console.log('multiParent', multiChild);
  // console.log(await multiChild.getMembers());

  // const multiChild2 = await getPod('multi-child2-c.pod.eth');
  // console.log('multiParent', multiChild2);
  // console.log(await multiChild2.getMembers());
}

main();
