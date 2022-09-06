import { ethers } from 'ethers';
import { customSubgraphQuery, getUserPods, init, podifySafe } from '../src';
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

  // await podifySafe({
  //   admin: walletTwo.address,
  //   name: 'blargh',
  //   safe: '0x49E55999e9c47589Fd953747edffA1a754d9f8B5',
  // }, walletTwo);

  const pod = await getPod('admin-test.pod.eth');
  await pod.migratePodToLatest(walletOne);
  console.log('pod', pod);

  // await pod.callAsPersona(pod.mintMember, args, {
  //   persona: 'admin',
  //   signer: walletOne,
  //   fromSubPod: 'subPod',
  // });
  // await pod.callAsPersona(pod.mintMember, [adminPodAddress], { persona: })
}

main();