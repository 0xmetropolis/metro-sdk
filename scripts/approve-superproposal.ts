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

  console.log('Executing subproposal');
  const subProposal = (await subPod.getProposals())[0];
  await subProposal.executeApprove(walletOne);

  // Let the tx service catch up
  console.log('Letting tx service catch up...');
  await sleep(40000);

  console.log('Approving + executing superproposal');
  let superProposal = (await adminPod.getProposals())[0];

  console.log('superProposal', superProposal);
  await superProposal.approve(walletOne);
  // Refetch
  [superProposal] = await adminPod.getProposals();
  await superProposal.executeApprove(walletOne);

  console.log('We did it! 🎉');
  console.log('At least I think so. Check the pod page to be sure lol');
}

main();
