import { getPod } from '../src';
import { adminPodAddress, dummyAccount } from '../env.json';
import { setup, sleep } from './utils';

async function main() {
  const { walletOne, walletTwo } = setup();

  // Get the pod we're working with

  const adminTest = await getPod(adminPodAddress);

  // We mint/burn the dummy account based on whether its a member or not.
  const isMember = await adminTest.isMember(dummyAccount);
  if (isMember) {
    await adminTest.proposeBurnMember(dummyAccount, walletOne);
  } else {
    await adminTest.proposeMintMember(dummyAccount, walletOne);
  }

  const proposal = (await adminTest.getProposals())[0];

  await proposal.approve(walletTwo);
  await proposal.executeApprove(walletTwo);

  // Let gnosis catch up.
  await sleep(5000);

  if (proposal.status !== 'executed') throw new Error('Proposal status not right');
  const refetchProposal = (await adminTest.getProposals())[0];
  if (!refetchProposal.safeTransaction.isExecuted)
    throw new Error('Proposal not executed according to gnosis');
}

main();
