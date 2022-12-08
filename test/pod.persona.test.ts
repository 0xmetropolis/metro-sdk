import { ethers } from 'ethers';
import axios from 'axios';
import { init, getPod } from '../src';
import * as createSafe from '../src/lib/services/create-safe-transaction';
import { userAddress2, constructGqlGetUsers, getSafeTransactionFixture } from './fixtures';
import * as fetchers from '../src/fetchers';
import * as utils from '../src/lib/utils';

// Some of these tests run long.
jest.setTimeout(7500);

const gmPod = {
  admin: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
  id: 6,
  name: '1-member-pods.pod.eth',
  safe: '0xC99cE75a83B068DABF48c48f91C62a30fe0afBd2',
  member: '0x61De0bbb6C8215Af3f821FE4884A28bc737f98D3', // random member
};

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : gmPod.admin;
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValueOnce(admin) },
    Safe: {
      address: gmPod.safe,
      nonce: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 5),
      }),
      getThreshold: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 10),
      }),
    },
    podId: gmPod.id,
    Name: { name: gmPod.name },
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
  const pod = await getPod('1-member-pods.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: gmPod.admin }]);
  const personas = await pod.getPersonas(gmPod.admin);
  await expect(pod.callAsPersona(pod.mintMember, [gmPod.admin], personas[0])).rejects.toThrow(
    'Expected sender to be signer, but received',
  );
});

test('Mint via admin persona calls the function as an admin', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod('1-member-pods.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: gmPod.admin }]);
  const personas = await pod.getPersonas(gmPod.admin);

  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(gmPod.admin),
  };

  const mockMint = jest.fn();
  jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
    mint: mockMint,
  });

  await pod.callAsPersona(pod.mintMember, [gmPod.admin], personas[0], mockSigner);
  // expect(mockMint).toHaveBeenCalled();
  expect(mockMint).toHaveBeenCalledWith(gmPod.admin, gmPod.id, ethers.constants.HashZero);
});

test('Mint via admin persona throws if the signer is not the admin', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod('1-member-pods.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: gmPod.admin }]);
  const personas = await pod.getPersonas(gmPod.admin);

  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(gmPod.member),
  };

  const mockMint = jest.fn();
  jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
    mint: mockMint,
  });

  await expect(
    pod.callAsPersona(pod.mintMember, [gmPod.admin], personas[0], mockSigner),
  ).rejects.toThrow('Signer was not admin');
});

test('Mint via member persona creates a proposal', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([gmPod.member]));
  const pod = await getPod('1-member-pods.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'member', address: gmPod.member }]);
  const personas = await pod.getPersonas(gmPod.member);

  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  await pod.callAsPersona(pod.mintMember, [userAddress2], personas[0]);

  expect(create).toHaveBeenCalled();
});

test('Mint via member persona throws if the persona address is not a member', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([gmPod.member]));
  const pod = await getPod('1-member-pods.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'member', address: userAddress2 }]);
  const personas = await pod.getPersonas(gmPod.member);

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

  const pod = await getPod('yerda.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([
    {
      type: 'adminPodMember',
      address: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E',
    },
  ]);
  const personas = await pod.getPersonas('0xf0C7d25c942264D6F21871c05d3dB3b98344b499');

  await pod.callAsPersona(
    pod.mintMember,
    [userAddress2],
    personas[0],
    '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
  );
  expect(create).toHaveBeenCalled();
});

test('Mint via adminPodMember persona should throw if sender is not an admin pod member', async () => {
  mockGetPodFetchersByAddress({
    overrideAdmin: '0xa60DDcba1C0160595BA435b7fed98783EC13cE05',
  });
  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce(constructGqlGetUsers(['0xf0C7d25c942264D6F21871c05d3dB3b98344b499']));
  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  const pod = await getPod('yerda.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([
    {
      type: 'adminPodMember',
      address: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E',
    },
  ]);
  const personas = await pod.getPersonas('0xf0C7d25c942264D6F21871c05d3dB3b98344b499');

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

// TODO: Commenting these out because the persona behavior might change in the near future
// but redoing these tests would take a lot of work so I don't want to refactor them right now
// just to change them again - WK
// test('Mint via subPodMember persona should throw if sender is not a sub pod member', async () => {
//   mockGetPodFetchersByAddress({ overrideAdmin: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E' });
//   jest
//     .spyOn(axios, 'post')
//     .mockResolvedValueOnce(constructGqlGetUsers(['0x42260b4876A8eDC03eEfcB75015688614aEEDb61']));
//   const create = jest
//     .spyOn(createSafe, 'createSafeTransaction')
//     .mockResolvedValue(getSafeTransactionFixture());

//   const pod = await getPod('1-member-pods.pod.eth');
//   pod.getPersonas = jest
//     .fn()
//     .mockResolvedValue([
//       { type: 'subPodMember', address: '0x42260b4876A8eDC03eEfcB75015688614aEEDb61' },
//     ]);
//   const personas = await pod.getPersonas('0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E');

//   await expect(
//     pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], userAddress2),
//   ).rejects.toThrow('Sender must be a member of the sub pod');
// });

// test('Mint via subPodMember persona should throw if the sub pod is not a member of the pod', async () => {
//   mockGetPodFetchersByAddress({ overrideAdmin: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E' });
//   jest
//     .spyOn(axios, 'post')
//     .mockResolvedValueOnce(constructGqlGetUsers(['0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E']));
//   const create = jest
//     .spyOn(createSafe, 'createSafeTransaction')
//     .mockResolvedValue(getSafeTransactionFixture());

//   const pod = await getPod('1-member-pods.pod.eth');
//   pod.getPersonas = jest
//     .fn()
//     .mockResolvedValue([
//       { type: 'subPodMember', address: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E' },
//     ]);
//   const personas = await pod.getPersonas('0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E');

//   await expect(
//     pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], userAddress),
//   ).rejects.toThrow('Sender must be a member of the sub pod');
// });
