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
    (await superPod.getProposals({ queued: true }))[0].status !== 'executed' ||
    (await subPod.getProposals({ queued: true }))[0].status !== 'executed' ||
    (await subPodTwo.getProposals({ queued: true }))[0].status !== 'executed'
  ) {
    throw new Error(
      'Admin or sub pod had an active/queued transaction. This script expects no enqueued transactions',
    );
  }

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await superPod.isMember(dummyAccount);
  console.log('Creating super proposal');
  try {
    if (isMember) {
      console.log('Burning');
      await superPod.proposeBurnMemberFromPod(subPod, dummyAccount, walletOne);
    } else {
      console.log('Minting');
      await superPod.proposeMintMemberFromPod(subPod, dummyAccount, walletOne);
    }
  } catch (err) {
    console.log(err);
    throw new Error('Error creating proposal on subpod');
  }

  let [superProposal] = await superPod.getProposals();

  console.log('Rejecting the first sub proposal');
  await superProposal.rejectFromSubPod(subPod, walletOne);
  const [subProposal] = await subPod.getProposals();
  console.log('Executing the sub proposal reject');
  await subProposal.executeReject(walletOne);

  console.log('Rejecting super proposal from subPodTwo');
  [superProposal] = await superPod.getProposals();
  await superProposal.rejectFromSubPod(subPod, walletTwo);

  console.log('Creating the second sub reject');
  await superProposal.rejectFromSubPod(subPodTwo, walletOne);
  await sleep(5000);

  console.log('Executing the second reject');
  const [subProposalTwo] = await subPodTwo.getProposals();
  console.log('subProposalTwo', subProposalTwo);
  await subProposalTwo.executeReject(walletOne);

  console.log('Letting tx service catch up...');
  await sleep(40000);

  [superProposal] = await superPod.getProposals();
  await superProposal.executeReject(walletOne);

  console.log('Rejection seems to have worked, now waiting to refetch from Gnosis');

  await sleep(30000);
  [superProposal] = await superPod.getProposals();

  console.log(`Gnosis says the proposal status is ${superProposal.status}`);
  console.log('If that seems wrong, it (probably) is slow, check the pod page to be sure');
}

main();
