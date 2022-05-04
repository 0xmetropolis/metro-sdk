import { getPod } from '../src';
import { adminPodAddress, dummyAccount } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, walletTwo } = setup();

  const superPod = await getPod(adminPodAddress);

  if ((await superPod.getProposals({ queued: true }))[0].status !== 'executed') {
    throw new Error(
      'Super pod had an active/queued transaction. This script expects no enqueued transactions',
    );
  }

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await superPod.isMember(dummyAccount);
  if (isMember) {
    await superPod.proposeBurnMember(dummyAccount, walletOne);
  } else {
    await superPod.proposeMintMember(dummyAccount, walletOne);
  }

  const proposal = (await superPod.getProposals())[0];

  // await proposal.reject(walletOne);
  // await proposal.reject(walletTwo);
  await proposal.executeReject(walletTwo);

  // Let gnosis catch up.
  await sleep(5000);

  if (proposal.status !== 'executed') throw new Error('Proposal status not right');
  const refetchProposal = (await superPod.getProposals())[0];
  if (!refetchProposal.safeTransaction.isExecuted)
    throw new Error('Proposal not executed according to gnosis');
}

main();
