import { init, getPod } from '../src';

const orcanautAddress = 'orca.naut.pod.xyz';
const signer = 'whatever';

test.todo('As an admin, I should be able to mint a member to a pod', async () => {
  const pod = await getPod(orcanautAddress);
  const signer = 'ethers signer, such as metamask';
  // Should return a metamask transaction receipt or whatever
  await pod.mintMember('newMemberAddress', signer);
});

test.todo('As an admin, I should be able to burn a member from a pod', async () => {
  const pod = await getPod(orcanautAddress);
  const signer = 'ethers signer, such as metamask';
  // Should return a metamask transaction
  await pod.burnMember('memberToBurn', signer);
});

test.todo('As a pod member, I should be able to create a proposal to mint a member', async () => {
  const pod = await getPod(orcanautAddress);
  const signer = 'ethers signer, such as metamask';
  // Should return a Proposal object
  await pod.proposeMintMember('newMemberAddress', signer);
});

test.todo('As a pod member, I should be able to create a proposal to burn a member', async () => {
  const pod = await getPod(orcanautAddress);
  const signer = 'ethers signer, such as metamask';
  // Should return a Proposal object
  await pod.proposeBurnMember('newMemberAddress', signer);
});
