import { ethers } from 'ethers';
import { init } from '../src';
import { getPod } from '../src';
import { adminPodAddress } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, dummyAccount } = setup(4);

  const pod = await getPod('multi-child2.pod.eth');
  console.log('pod', pod);
  await pod.propose(await pod.ejectSafe(), walletOne.address);

  // await pod.propose(
  //   (await pod.burnMember(walletOne.address)) as { data: string; to: string },
  //   walletOne.address,
  // );

  // console.log('dummyAccount', dummyAccount);
  // await pod.ejectSafe(dummyAccount);
}

main();
