import { ethers } from 'ethers';
import { init } from '../src';
import { getPod } from '../src';
import { adminPodAddress, dummyAccount } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne } = setup();

  const pod = await getPod('0x338219389080C32420f139ae1bb95F7E1e1b6Cf3');
  const props = await pod.getProposals();
  await props[0].reject(walletOne);
  await sleep(5000);
  await props[0].executeReject(walletOne);
}

main();
