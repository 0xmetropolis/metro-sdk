import { ethers } from 'ethers';
import axios from 'axios';
import { init, getPod } from '../src';
import * as createSafe from '../src/lib/services/create-safe-transaction';
import { userAddress2, constructGqlGetUsers, getSafeTransactionFixture } from './fixtures';
import * as fetchers from '../src/fetchers';
import * as utils from '../src/lib/utils';

// Some of these tests run long.
jest.setTimeout(7500);

const expectedPod = {
  admin: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
  id: 6,
  name: '1-member-pods.pod.eth',
  safe: '0xC99cE75a83B068DABF48c48f91C62a30fe0afBd2',
  member: '0x61De0bbb6C8215Af3f821FE4884A28bc737f98D3', // random member
};

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : expectedPod.admin;
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValueOnce(admin) },
    Safe: {
      address: expectedPod.safe,
      nonce: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 5),
      }),
      getThreshold: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 10),
      }),
    },
    podId: expectedPod.id,
    Name: { name: expectedPod.name },
  });
}

const provider = new ethers.providers.InfuraProvider('goerli', {
  infura: '69ecf3b10bc24c6a972972666fe950c8',
});

beforeAll(async () => {
  init({ provider, network: 5 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

test('Mint via admin persona throws if signer is not included', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod(expectedPod.name);
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: expectedPod.admin }]);
  const personas = await pod.getPersonas(expectedPod.admin);
  await expect(pod.callAsPersona(pod.mintMember, [expectedPod.admin], personas[0])).rejects.toThrow(
    'Expected sender to be signer, but received',
  );
});

test('Mint via admin persona calls the function as an admin', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod(expectedPod.name);
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: expectedPod.admin }]);
  const personas = await pod.getPersonas(expectedPod.admin);

  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(expectedPod.admin),
  };

  const mockMint = jest.fn();
  jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
    mint: mockMint,
  });

  await pod.callAsPersona(pod.mintMember, [expectedPod.admin], personas[0], mockSigner);
  // expect(mockMint).toHaveBeenCalled();
  expect(mockMint).toHaveBeenCalledWith(
    expectedPod.admin,
    expectedPod.id,
    ethers.constants.HashZero,
  );
});

test('Mint via admin persona throws if the signer is not the admin', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod(expectedPod.name);
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: expectedPod.admin }]);
  const personas = await pod.getPersonas(expectedPod.admin);

  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(expectedPod.member),
  };

  const mockMint = jest.fn();
  jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
    mint: mockMint,
  });

  await expect(
    pod.callAsPersona(pod.mintMember, [expectedPod.admin], personas[0], mockSigner),
  ).rejects.toThrow('Signer was not admin');
});

test('Mint via member persona creates a proposal', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([expectedPod.member]));
  const pod = await getPod(expectedPod.name);
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'member', address: expectedPod.member }]);
  const personas = await pod.getPersonas(expectedPod.member);

  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  await pod.callAsPersona(pod.mintMember, [userAddress2], personas[0]);

  expect(create).toHaveBeenCalled();
});

test('Mint via member persona throws if the persona address is not a member', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([expectedPod.member]));
  const pod = await getPod(expectedPod.name);
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'member', address: userAddress2 }]);
  const personas = await pod.getPersonas(expectedPod.member);

  await expect(pod.callAsPersona(pod.mintMember, [userAddress2], personas[0])).rejects.toThrow(
    'Sender must be a member of this pod or one of its sub pods',
  );
});

test('Mint via adminPodMember persona creates a proposal', async () => {
  mockGetPodFetchersByAddress({
    overrideAdmin: '0xa60DDcba1C0160595BA435b7fed98783EC13cE05',
  });
  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce(constructGqlGetUsers(['0xf0C7d25c942264D6F21871c05d3dB3b98344b499']));
  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  const pod = await getPod('1-root-as-admin.pod.eth');
  const personas = await pod.getPersonas('0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d');

  await pod.callAsPersona(
    pod.mintMember,
    [userAddress2],
    personas[0],
    '0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d',
  );
  expect(create).toHaveBeenCalled();
});

test('Mint via adminPodMember persona should throw if sender is not an admin pod member', async () => {
  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce(constructGqlGetUsers(['0xf0C7d25c942264D6F21871c05d3dB3b98344b499']));

  const pod = await getPod('1-root-as-admin.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([
    {
      type: 'adminPodMember',
      address: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E',
    },
  ]);
  const personas = await pod.getPersonas('0x08A9C4898e045A4E176C2cbf4Ca86aEf9f6EA478');

  await expect(
    pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], userAddress2),
  ).rejects.toThrow('Sender must be a member of the admin pod');
});

test('Mint via subPodMember persona creates a proposal', async () => {
  mockGetPodFetchersByAddress();
  jest
    .spyOn(axios, 'post')
    .mockResolvedValue(constructGqlGetUsers(['0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d']));
  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  const pod = await getPod('1-member-pods.pod.eth');
  const personas = await pod.getPersonas('0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d');

  await pod.callAsPersona(
    pod.mintMember,
    [userAddress2],
    personas[0],
    '0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d',
  );
  expect(create).toHaveBeenCalled();
});

test('Mint via subPodMember persona should throw if sender is not a sub pod member', async () => {
  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce(constructGqlGetUsers(['0xf0C7d25c942264D6F21871c05d3dB3b98344b499']));

  const pod = await getPod('1-root-as-admin.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([
    {
      type: 'subPodMember',
      address: '0x203D96211d5f0e0De9788302505dd37D26a28005',
    },
  ]);
  const personas = await pod.getPersonas('0x08A9C4898e045A4E176C2cbf4Ca86aEf9f6EA478');

  await expect(
    pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], userAddress2),
  ).rejects.toThrow('Sub pod was not a member of this pod');
});

test('Mint via subPodMember persona should throw if the sub pod is not a member of the pod', async () => {
  const pod = await getPod(expectedPod.name);
  pod.getPersonas = jest.fn().mockResolvedValue([
    {
      type: 'subPodMember',
      address: '0x203D96211d5f0e0De9788302505dd37D26a28005',
    },
  ]);
  const personas = await pod.getPersonas('0x08A9C4898e045A4E176C2cbf4Ca86aEf9f6EA478');

  await expect(pod.callAsPersona(pod.mintMember, [userAddress2], personas[0])).rejects.toThrow(
    'Sub pod was not a member of this pod',
  );
});
