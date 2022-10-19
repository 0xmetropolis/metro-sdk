import { getPod } from '../src';
import { adminPodAddress, dummyAccount, subPodAddress } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, walletTwo } = setup();

  // Get the pod we're working with
  const adminPod = await getPod(adminPodAddress);
  const subPod = await getPod(subPodAddress);

  if ((await adminPod.getProposals({ status: 'queued' }))[0].status !== ('passed' || 'rejected')) {
    throw new Error(
      'Super pod had an active/queued transaction. This script expects no enqueued transactions',
    );
  }

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await subPod.isMember(dummyAccount);
  let data;
  if (isMember) {
    data = subPod.populateBurn(dummyAccount);
  } else {
    data = subPod.populateMint(dummyAccount);
  }

  const proposal = await adminPod.propose(data, walletOne.address);
  await proposal.approve(walletOne);
  await proposal.approve(walletTwo);
  await proposal.executeApprove(walletOne);
}

main();
