import { getPod } from '../src';
import { adminPodAddress, dummyAccount, subPodAddress } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, walletTwo } = setup();

  // Get the pod we're working with
  const adminPod = await getPod(adminPodAddress);
  const subPod = await getPod(subPodAddress);

  if ((await adminPod.getProposals({ queued: true }))[0].status !== 'executed') {
    throw new Error(
      'Super pod had an active/queued transaction. This script expects no enqueued transactions',
    );
  }

  console.log('subPod.admin', subPod.admin);

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await subPod.isMember(dummyAccount);
  if (isMember) {
    await subPod.burnMemberFromAdminPod(adminPod, dummyAccount, walletOne);
  } else {
    await subPod.mintMemberFromAdminPod(adminPod, dummyAccount, walletOne);
  }

  const proposal = (await adminPod.getProposals())[0];

  await proposal.approve(walletTwo);
  await proposal.executeApprove(walletTwo);
}

main();
