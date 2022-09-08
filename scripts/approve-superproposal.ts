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
  console.log('Creating super proposal + sub proposal on subPod');
  let data;
  try {
    if (isMember) {
      data = superPod.burnMember(dummyAccount);
    } else {
      data = superPod.mintMember(dummyAccount);
    }
    await superPod.propose(data, subPod.safe);
  } catch (err) {
    console.log(err);
    throw new Error('Error creating proposal on subpod');
  }

  await sleep(5000);

  let [superProposal] = await superPod.getProposals();
  if (superProposal.status !== 'active') {
    await sleep(5000);
    [superProposal] = await superPod.getProposals();
  }

  console.log('Approving super proposal from sub pods');
  await subPod.propose(superProposal, walletOne.address);
  await subPodTwo.propose(superProposal, walletOne.address);
  await sleep(5000);

  console.log('Executing both sub proposals');
  const subProposal = (await subPod.getProposals())[0];
  await subProposal.approve(walletOne);
  await subProposal.executeApprove(walletOne);

  const subProposalTwo = (await subPodTwo.getProposals())[0];
  await subProposalTwo.approve(walletOne);
  await subProposalTwo.executeApprove(walletOne);

  console.log('Letting the blockchain + transaction service catch up');
  await sleep(40000);

  console.log('Approving + executing superproposal');
  [superProposal] = await superPod.getProposals();
  await superProposal.executeApprove(walletOne);

  console.log('We did it! 🎉');
  console.log('At least I think so. Check the pod page to be sure lol');
}

main();
