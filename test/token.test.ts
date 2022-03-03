/* eslint-disable jest/prefer-todo */
import { ethers } from 'ethers';
import { init, getPod } from '../src';

const orcanautAddress = 'orcanauts.pod.xyz';
let provider;

beforeAll(async () => {
  provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  provider.getSigner = () => {};
  init({ provider, network: 1 });
});

test('Mint member should throw if given an invalid address', async () => {
  // const pod = await getPod(orcanautAddress);
  // await expect(pod.mintMember('wrongpod', provider.getSigner())).rejects.toThrow('Invalid address');
});

test('As an admin, I should be able to mint a member to a pod', async () => {
  // const pod = await getPod(orcanautAddress);
  // Should return a metamask transaction receipt or whatever
  // await pod.mintMember('newMemberAddress', provider.getSigner());
});

test('As an admin, I should be able to burn a member from a pod', async () => {
  // const pod = await getPod(orcanautAddress);
  // Should return a metamask transaction
  // await pod.burnMember('memberToBurn', provider.getSigner());
});

test('As a pod member, I should be able to create a proposal to mint a member', async () => {
  // const pod = await getPod(orcanautAddress);
  // Should return a Proposal object
  // await pod.proposeMintMember('newMemberAddress', provider.getSigner());
});

test('As a pod member, I should be able to create a proposal to burn a member', async () => {
  // const pod = await getPod(orcanautAddress);
  // Should return a Proposal object
  // await pod.proposeBurnMember('newMemberAddress', provider.getSigner());
});
