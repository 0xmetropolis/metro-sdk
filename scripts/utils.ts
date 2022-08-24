import { ethers } from 'ethers';
import { init, getPod } from '../src';
import {
  accountOnePrivateKey,
  accountTwoPrivateKey,
  dummyAccountPrivateKey,
  adminPodAddress,
  subPodAddress,
  subPodTwoAddress,
} from '../env.json';

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function setup(network = 4) {
  const networkName = network === 1 ? 'mainnet' : 'rinkeby';
  const provider = new ethers.providers.InfuraProvider(
    networkName,
    '69ecf3b10bc24c6a972972666fe950c8',
  );
  init({ provider, network });

  // Get two accounts
  const walletOne = new ethers.Wallet(accountOnePrivateKey, provider);
  const walletTwo = new ethers.Wallet(accountTwoPrivateKey, provider);
  const dummyAccount = new ethers.Wallet(dummyAccountPrivateKey, provider);
  return { walletOne, walletTwo, dummyAccount };
}

/**
 * Logs out the latest proposal for each of the pods.
 */
export async function report() {
  const superPod = await getPod(adminPodAddress);
  const [props1] = await superPod.getProposals({ status: 'queued', limit: 1 });
  console.log('props1', props1);
  const subPod = await getPod(subPodAddress);
  const [props2] = await subPod.getProposals({ status: 'queued', limit: 1 });
  console.log('props2', props2);
  const subPod2 = await getPod(subPodTwoAddress);
  const [props3] = await subPod2.getProposals({ status: 'queued', limit: 1 });
  console.log('props3', props3);
}

/**
 * Flushes out all active transactions from the 3 pods we're using.
 * You will probably have to run this a few times, and it takes a while
 * for Gnosis to catch up after a run.
 */
export async function flush(walletOne, walletTwo) {
  const superPod = await getPod(adminPodAddress);
  const props1 = await superPod.getProposals({ status: 'queued', limit: 1 });
  const subPod = await getPod(subPodAddress);
  const subPodTwo = await getPod(subPodTwoAddress);

  [superPod, subPod, subPodTwo].forEach(async pod => {
    const props = await pod.getProposals({ status: 'queued' });
    if (props[0].status === 'active') {
      console.log('we in here');
      try {
        await props[0].approve(walletOne);
      } catch (err) {
        // nothing
      }
      try {
        await props[0].approve(walletTwo);
      } catch (err) {
        // nothing
      }
      try {
        await props[0].executeApprove(walletOne);
      } catch (err) {
        console.log('was unable to execute tx');
        // nothing
      }
    }
  });
}
