import { ethers } from 'ethers';
import { init } from '../src';
import { getPod, multiPodCreate } from '../src';
import { accountOne, accountTwo, adminPodAddress } from '../env.json';
import { setup, sleep } from './utils';
import { enableController, podifySafe } from '../src/pod-create';
import {
  approveSafeTransaction,
  getSafeTransactionsBySafe,
} from '../src/lib/services/transaction-service';

// const multiPodInput = [
//   {
//     label: 'multi-parent-c',
//     members: ['multi-child-c', accountOne],
//     threshold: 1,
//     admin: accountOne,
//   },
//   {
//     label: 'multi-child-c',
//     members: [accountOne, accountTwo],
//     threshold: 1,
//   },
//   {
//     label: 'multi-child2-c',
//     members: [accountOne, accountTwo],
//     threshold: 1,
//     admin: 'multi-parent-c',
//   },
// ];

async function main() {
  const { walletOne } = setup(4);

  const pod = await getPod('multi-parent-c.pod.eth');
  console.log('pod', pod);

  await enableController('0x9C493fba4aDb9Bf029cCeF6Bda78bb1B14a61fd0', walletOne);

  await podifySafe(
    {
      admin: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
      name: 'remake',
      safe: '0x9C493fba4aDb9Bf029cCeF6Bda78bb1B14a61fd0',
    },
    walletOne,
  );

  // const [safeTx] = await getSafeTransactionsBySafe('0x9C493fba4aDb9Bf029cCeF6Bda78bb1B14a61fd0');
  // // await approveSafeTransaction(safeTx, walletOne);
  // const pod = await getPod('multi-parent.pod.eth');
  // console.log('pod', pod);

  // await pod.ejectSafe(walletOne);
}

main();
