import { getPod } from '../src';
import { adminPodAddress, dummyAccount, subPodAddress } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, walletTwo } = setup();

  const adminPod = await getPod(adminPodAddress);
  const subPod = await getPod(subPodAddress);

  if (
    (await adminPod.getProposals({ queued: true }))[0].status !== 'executed' ||
    (await subPod.getProposals({ queued: true }))[0].status !== 'executed'
  ) {
    throw new Error(
      'Admin or sub pod had an active/queued transaction. This script expects no enqueued transactions',
    );
  }

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await adminPod.isMember(dummyAccount);
  console.log('Creating ');
  try {
    if (isMember) {
      console.log('Burning');
      await adminPod.proposeBurnMemberFromPod(subPod, dummyAccount, walletOne);
    } else {
      console.log('Minting');
      await adminPod.proposeMintMemberFromPod(subPod, dummyAccount, walletOne);
    }
  } catch (err) {
    console.log(err);
    throw new Error('Error creating proposal on subpod');
  }

  console.log('Rejecting the subproposal');
  const [subProposal] = await subPod.getProposals();
  // await subProposal.executeApprove(walletOne);
  await subProposal.reject(walletOne);

  await subProposal.executeReject(walletOne);

  console.log('Letting tx service catch up...');
  await sleep(40000);

  console.log('Rejecting the super proposal');
  let [superProposal] = await adminPod.getProposals();
  console.log('superProposal', superProposal);
  await superProposal.reject(walletOne);
  await sleep(40000);
  [superProposal] = await adminPod.getProposals();
  await superProposal.executeReject(walletOne);

  console.log('Rejection seems to have worked, now waiting to refetch from Gnosis');

  await sleep(30000);
  [superProposal] = await adminPod.getProposals();

  console.log(`Gnosis says the proposal status is ${superProposal.status}`);
  console.log('If that seems wrong, it (probably) is slow, check the pod page to be sure');
}

main();
