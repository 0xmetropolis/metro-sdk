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
  const { walletOne, dummyAccount } = setup(4);

  const pod = await getPod('multi-child2.pod.eth');
  console.log('pod', pod);
  // await pod.propose(
  //   (await pod.burnMember(walletOne.address)) as { data: string; to: string },
  //   walletOne.address,
  // );
  const [props] = await pod.getProposals();
  await props.approve(walletOne);
  console.log('props', props[0]);
  // await pod.propose(await pod.ejectSafe(), walletOne.address);

  // await pod.propose(
  //   (await pod.burnMember(walletOne.address)) as { data: string; to: string },
  //   walletOne.address,
  // );

  // console.log('dummyAccount', dummyAccount);
  // await pod.ejectSafe(dummyAccount);
}

main();
