/* eslint-disable jest/prefer-todo */
import { ethers } from 'ethers';
import axios from 'axios';
import contracts from '@orcaprotocol/contracts';
import * as sdk from '../src';
import * as utils from '../src/lib/utils';
import * as fetchers from '../src/fetchers';
import * as createSafe from '../src/lib/services/create-safe-transaction';
import {
  artNautPod,
  orcaCorePod,
  memberTokenAddress,
  orcanautAddress,
  orcanautPod,
  userAddress,
  userAddress2,
  constructGqlGetUsers,
} from './fixtures';

// Tests for any token, or token-like functionality (this includes admin transfers)

let provider;

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : orcanautPod.admin;
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: {
      podAdmin: jest.fn().mockResolvedValue(admin),
      address: '0x242e1E6cF6C30d36988D8019d0fE2e187325CCEd',
    },
    safe: orcanautAddress,
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
}

beforeAll(async () => {
  provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  provider.getSigner = () => {
    return {
      getAddress: jest.fn().mockResolvedValue(userAddress),
    };
  };
  sdk.init({ provider, network: 1 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

test('Pod members should be able to propose a mint member', async () => {
  const pod = await sdk.getPod(orcanautAddress);
  await pod.propose(pod.mint());
});

test('Pod members should be able to propose arbitrary functions', async () => {
  const pod = await sdk.getPod(orcanautAddress);
  await pod.propose(await MemberToken.functions.mint(
    dummyAccount,
    pod.id,
    ethers.constants.HashZero
  ));
  // Check to see if createSafeTransaction is called correctly
});

test('Propose function should throw if the function would throw', async () => {
  // Propose function should throw if attempting to mint an already existing member.
});

test('Admin pod members should be able to create a proposal to mint to a sub pod', async () => {
  const adminPod = await sdk.getPod(orcanautAddress);
  const subPod = await sdk.getPod(artNautPod.id);
  await adminPod.propose(await subPod.mint());
});

test('Admin pod members should be able to propose arbitrary functions', async () => {
  const adminPod = await sdk.getPod(orcanautAddress);
  const subPod = await sdk.getPod(artNautPod.id);
  await adminPod.propose(await MemberToken.functions.mint(
    dummyAccount,
    subPod.id,
    ethers.constants.HashZero
  ));
});

test('Sub pod members should be able to propose a super pod mint', async () => {
  const superPod = await sdk.getPod(orcanautAddress);
  const subPod = await sdk.getPod(artNautPod.id);
  await subPod.propose(await superPod.propose(await superPod.mint()));
});

test('Sub pod members should be able to propose an arbitrary super proposal', async () => {
  const superPod = await sdk.getPod(orcanautAddress);
  const subPod = await sdk.getPod(artNautPod.id);
  await subPod.propose(await superPod.propose(await superPod.mint()));
});

test('If propose function is passed a Proposal, assume that is a super proposal and create an approval proposal', async () => {
  // test goes here lol.
})

// To think about:
// What does the propose function need to return? 
