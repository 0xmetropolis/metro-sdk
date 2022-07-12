import { ethers } from 'ethers';
import { init } from '../src';
import { getPod } from '../src';
import { adminPodAddress } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, dummyAccount } = setup();

  const pod = await getPod('wutang.pod.eth');
  const props = await pod.getProposals();
  console.log('props', props[0]);
  await props[0].reject(dummyAccount);
  await sleep(5000);
  await props[0].executeReject(dummyAccount);
}

main();
