import { ethers } from 'ethers';
import { init } from '../src';
import { getPod } from '../src';
import { adminPodAddress } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, dummyAccount } = setup(1);

  const pod = await getPod('eject.pod.xyz');
  console.log('pod', pod);
  // console.log('dummyAccount', dummyAccount);
  // await pod.ejectSafe(dummyAccount);
}

main();
