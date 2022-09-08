import { ethers } from 'ethers';
import axios from 'axios';
import { init, getPod } from '../src';
import * as createSafe from '../src/lib/services/create-safe-transaction';

import {
  userAddress,
  userAddress2,
  constructGqlGetUsers,
  getSafeTransactionFixture,
} from './fixtures';
import * as fetchers from '../src/fetchers';
import * as utils from '../src/lib/utils';

// Some of these tests run long.
jest.setTimeout(7500);

const gmPod = {
  admin: '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888',
  id: 6,
  name: 'gm.pod.eth',
  safe: '0x81CC4c1411044C09b7a888Af225176fac87A5CE3',
  member: '0x5f0b18a0a47a276c8a0EaD0E0ceaAD6fC3976eD1', // random member
};

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : gmPod.admin;
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValueOnce(admin) },
    Safe: {
      address: gmPod.safe,
      nonce: jest.fn().mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 5) }),
      getThreshold: jest
        .fn()
        .mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 10) }),
    },
    podId: gmPod.id,
    Name: { name: gmPod.name },
  });
}

const provider = new ethers.providers.InfuraProvider('rinkeby', {
  infura: '69ecf3b10bc24c6a972972666fe950c8',
});

beforeAll(async () => {
  init({ provider, network: 4 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

test('Mint via admin persona throws if signer is not included', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod('gm.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: gmPod.admin }]);
  const personas = await pod.getPersonas(gmPod.admin);
  await expect(pod.callAsPersona(pod.mintMember, [gmPod.admin], personas[0])).rejects.toThrow(
    'Expected sender to be signer, but received',
  );
});

test('Mint via admin persona calls the function as an admin', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod('gm.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: gmPod.admin }]);
  const personas = await pod.getPersonas(gmPod.admin);

  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(gmPod.admin),
  };

  const mockMint = jest.fn();
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    mint: mockMint,
  });

  await pod.callAsPersona(pod.mintMember, [gmPod.admin], personas[0], mockSigner);
  // expect(mockMint).toHaveBeenCalled();
  expect(mockMint).toHaveBeenCalledWith(gmPod.admin, gmPod.id, ethers.constants.HashZero);
});

test('Mint via admin persona throws if the signer is not the admin', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod('gm.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: gmPod.admin }]);
  const personas = await pod.getPersonas(gmPod.admin);

  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(gmPod.member),
  };

  const mockMint = jest.fn();
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    mint: mockMint,
  });

  await expect(
    pod.callAsPersona(pod.mintMember, [gmPod.admin], personas[0], mockSigner),
  ).rejects.toThrow('Signer was not admin');
});

test('Mint via member persona creates a proposal', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([gmPod.member]));
  const pod = await getPod('gm.pod.eth');
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
  const pod = await getPod('gm.pod.eth');
  pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'member', address: userAddress2 }]);
  const personas = await pod.getPersonas(gmPod.member);

  await expect(pod.callAsPersona(pod.mintMember, [userAddress2], personas[0])).rejects.toThrow(
    'Sender must be a member of this pod or one of its sub pods',
  );
});

test('Mint via adminPodMember persona creates a proposal', async () => {
  mockGetPodFetchersByAddress({ overrideAdmin: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E' });
  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce(constructGqlGetUsers(['0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E']));
  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  const pod = await getPod('yerda.pod.eth');
  pod.getPersonas = jest
    .fn()
    .mockResolvedValue([
      { type: 'adminPodMember', address: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E' },
    ]);
  const personas = await pod.getPersonas('0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E');

  await pod.callAsPersona(
    pod.mintMember,
    [userAddress2],
    personas[0],
    '0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E',
  );
  expect(create).toHaveBeenCalled();
});

test('Mint via adminPodMember persona should throw if sender is not an admin pod member', async () => {
  mockGetPodFetchersByAddress({ overrideAdmin: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E' });
  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce(constructGqlGetUsers(['0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E']));
  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  const pod = await getPod('yerda.pod.eth');
  pod.getPersonas = jest
    .fn()
    .mockResolvedValue([
      { type: 'adminPodMember', address: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E' },
    ]);
  const personas = await pod.getPersonas('0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E');

  await expect(
    pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], userAddress2),
  ).rejects.toThrow('Sender must be a member of the admin pod');
});

test('Mint via subPodMember persona creates a proposal', async () => {
  mockGetPodFetchersByAddress();
  jest
    .spyOn(axios, 'post')
    .mockResolvedValue(constructGqlGetUsers(['0x42260b4876A8eDC03eEfcB75015688614aEEDb61']));
  const create = jest
    .spyOn(createSafe, 'createSafeTransaction')
    .mockResolvedValue(getSafeTransactionFixture());

  const pod = await getPod('gm.pod.eth');
  pod.getPersonas = jest
    .fn()
    .mockResolvedValue([
      { type: 'subPodMember', address: '0x42260b4876A8eDC03eEfcB75015688614aEEDb61' },
    ]);
  const personas = await pod.getPersonas('0xc7BDD438CbEd7701DA476aeBec99cF2Db4d65bb7');

  await pod.callAsPersona(
    pod.mintMember,
    [userAddress2],
    personas[0],
    '0xc7BDD438CbEd7701DA476aeBec99cF2Db4d65bb7',
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

//   const pod = await getPod('gm.pod.eth');
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

//   const pod = await getPod('gm.pod.eth');
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
