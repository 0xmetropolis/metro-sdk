/* eslint-disable no-console */
import { getPod } from '../src';
import { adminPodAddress, dummyAccount, subPodAddress, subPodTwoAddress } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, walletTwo } = setup();

  const superPod = await getPod(adminPodAddress);
  const subPod = await getPod(subPodAddress);
  const subPodTwo = await getPod(subPodTwoAddress);

  if (
    (await superPod.getProposals({ status: 'queued' }))[0].status !== 'executed' ||
    (await subPod.getProposals({ status: 'queued' }))[0].status !== 'executed' ||
    (await subPodTwo.getProposals({ status: 'queued' }))[0].status !== 'executed'
  ) {
    throw new Error(
      'Admin or sub pod had an active/queued transaction. This script expects no enqueued transactions',
    );
  }

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await superPod.isMember(dummyAccount);
  console.log('Creating super proposal');
  let data;
  try {
    if (isMember) {
      data = superPod.populateBurn(dummyAccount);
    } else {
      data = superPod.populateMint(dummyAccount);
    }
    await superPod.propose(data, subPod.safe);
  } catch (err) {
    console.log(err);
    throw new Error('Error creating proposal on subpod');
  }

  let [superProposal] = await superPod.getProposals();
  console.log('superProposal', superProposal);

  console.log('Rejecting the first sub proposal');
  // This would approve the proposal, and then reject it
  const subProposal = await subPod.propose(superProposal, await walletOne.getAddress());
  await subProposal.reject(walletOne);
  await subProposal.executeReject(walletOne);

  console.log('Rejecting the second sub proposal');
  const subProposal2 = await subPodTwo.propose(superProposal, walletOne.address);
  await subProposal2.reject(walletOne);
  await subProposal2.executeReject(walletOne);

  console.log('Letting tx service catch up...');
  await sleep(40000);

  [superProposal] = await superPod.getProposals();
  console.log('superProposal', superProposal);
  await superProposal.executeReject(walletOne);

  console.log('Rejection seems to have worked, now waiting to refetch from Gnosis');

  await sleep(30000);
  [superProposal] = await superPod.getProposals();

  console.log(`Gnosis says the proposal status is ${superProposal.status}`);
  console.log('If that seems wrong, it (probably) is slow, check the pod page to be sure');
}

main();
