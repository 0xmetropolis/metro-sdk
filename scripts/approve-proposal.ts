import { getPod } from '../src';
import { adminPodAddress, dummyAccount } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, walletTwo } = setup();

  // Get the pod we're working with

  const pod = await getPod(adminPodAddress);

  if ((await pod.getProposals({ status: 'queued' }))[0].status !== 'executed') {
    throw new Error(
      'Super pod had an active/queued transaction. This script expects no enqueued transactions',
    );
  }

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await pod.isMember(dummyAccount);
  let data;
  if (isMember) {
    data = pod.populateBurn(dummyAccount);
  } else {
    data = pod.populateMint(dummyAccount);
  }

  const proposal = await pod.propose(data, walletOne.address)

  // const [proposal] = await pod.getProposals();

  await proposal.approve(walletOne);
  await proposal.approve(walletTwo);
  await proposal.executeApprove(walletTwo);

  // Let gnosis catch up.
  await sleep(5000);

  if (proposal.status !== 'executed') throw new Error('Proposal status not right');
  const refetchProposal = (await pod.getProposals())[0];
  if (!refetchProposal.safeTransaction.isExecuted)
    throw new Error('Proposal not executed according to gnosis');
}

main();
