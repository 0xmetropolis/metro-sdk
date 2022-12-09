import { ethers } from 'ethers';
import axios from 'axios';
import { init, getPod } from '../src';
import * as createSafe from '../src/lib/services/create-safe-transaction';
import { userAddress2, constructGqlGetUsers, getSafeTransactionFixture } from './fixtures';
import * as fetchers from '../src/fetchers';
import * as utils from '../src/lib/utils';

// Some of these tests run long.
jest.setTimeout(7500);

const adminAddress = '0xf0C7d25c942264D6F21871c05d3dB3b98344b499';
const adminPodAddress = '0xa60DDcba1C0160595BA435b7fed98783EC13cE05';
const podId = 6;
const podName = '1-member-pods.pod.eth';
const adminPodName = '1-root-as-admin.pod.eth';
const podAddress = '0xC99cE75a83B068DABF48c48f91C62a30fe0afBd2';
const subPodAddress = '0x203D96211d5f0e0De9788302505dd37D26a28005';
const podMemberOne = '0x61De0bbb6C8215Af3f821FE4884A28bc737f98D3';
const podMemberTwo = '0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d';
const podMemberThree = '0x08A9C4898e045A4E176C2cbf4Ca86aEf9f6EA478';
const adminPodAddressTwo = '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E';

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : adminAddress;
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValueOnce(admin) },
    Safe: {
      address: podAddress,
      nonce: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 5),
      }),
      getThreshold: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 10),
      }),
    },
    podId: podId,
    Name: { name: podName },
  });
}

const provider = new ethers.providers.InfuraProvider('goerli', {
  infura: process.env.INFURA_KEY,
});

beforeAll(async () => {
  init({ provider, network: 5 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('admin member persona', () => {
  test('Mint via admin persona throws if signer is not included', async () => {
    mockGetPodFetchersByAddress();
    const pod = await getPod(podName);
    pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: adminAddress }]);
    const personas = await pod.getPersonas(adminAddress);
    await expect(pod.callAsPersona(pod.mintMember, [adminAddress], personas[0])).rejects.toThrow(
      'Expected sender to be signer, but received',
    );
  });

  test('Mint via admin persona calls the function as an admin', async () => {
    mockGetPodFetchersByAddress();
    const pod = await getPod(podName);
    pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: adminAddress }]);
    const personas = await pod.getPersonas(adminAddress);

    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(adminAddress),
    };

    const mockMint = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      mint: mockMint,
    });

    await pod.callAsPersona(pod.mintMember, [adminAddress], personas[0], mockSigner);
    // expect(mockMint).toHaveBeenCalled();
    expect(mockMint).toHaveBeenCalledWith(adminAddress, podId, ethers.constants.HashZero);
  });

  test('Mint via admin persona throws if the signer is not the admin', async () => {
    mockGetPodFetchersByAddress();
    const pod = await getPod(podName);
    pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'admin', address: adminAddress }]);
    const personas = await pod.getPersonas(adminAddress);

    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(podMemberOne),
    };

    const mockMint = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      mint: mockMint,
    });

    await expect(
      pod.callAsPersona(pod.mintMember, [adminAddress], personas[0], mockSigner),
    ).rejects.toThrow('Signer was not admin');
  });
});

describe('member persona', () => {
  test('Mint via member persona creates a proposal', async () => {
    mockGetPodFetchersByAddress();
    jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([podMemberOne]));
    const pod = await getPod(podName);
    pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'member', address: podMemberOne }]);
    const personas = await pod.getPersonas(podMemberOne);

    const create = jest
      .spyOn(createSafe, 'createSafeTransaction')
      .mockResolvedValue(getSafeTransactionFixture());

    await pod.callAsPersona(pod.mintMember, [userAddress2], personas[0]);

    expect(create).toHaveBeenCalled();
  });

  test('Mint via member persona throws if the persona address is not a member', async () => {
    mockGetPodFetchersByAddress();
    jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([podMemberOne]));
    const pod = await getPod(podName);
    pod.getPersonas = jest.fn().mockResolvedValue([{ type: 'member', address: userAddress2 }]);
    const personas = await pod.getPersonas(podMemberOne);

    await expect(pod.callAsPersona(pod.mintMember, [userAddress2], personas[0])).rejects.toThrow(
      'Sender must be a member of this pod or one of its sub pods',
    );
  });
});

describe('admin member pod persona', () => {
  test('Mint via adminPodMember persona creates a proposal', async () => {
    mockGetPodFetchersByAddress({
      overrideAdmin: adminPodAddress,
    });
    jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([adminAddress]));
    const create = jest
      .spyOn(createSafe, 'createSafeTransaction')
      .mockResolvedValue(getSafeTransactionFixture());

    const pod = await getPod(adminPodName);
    const personas = await pod.getPersonas(podMemberTwo);

    await pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], podMemberTwo);
    expect(create).toHaveBeenCalled();
  });

  test('Mint via adminPodMember persona should throw if sender is not an admin pod member', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([adminAddress]));

    const pod = await getPod(adminPodName);
    pod.getPersonas = jest.fn().mockResolvedValue([
      {
        type: 'adminPodMember',
        address: adminPodAddressTwo,
      },
    ]);
    const personas = await pod.getPersonas(podMemberThree);

    await expect(
      pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], userAddress2),
    ).rejects.toThrow('Sender must be a member of the admin pod');
  });
});

describe('subd pod member persona', () => {
  test('Mint via subPodMember persona creates a proposal', async () => {
    mockGetPodFetchersByAddress();
    jest.spyOn(axios, 'post').mockResolvedValue(constructGqlGetUsers([podMemberTwo]));
    const create = jest
      .spyOn(createSafe, 'createSafeTransaction')
      .mockResolvedValue(getSafeTransactionFixture());

    const pod = await getPod(podName);
    const personas = await pod.getPersonas(podMemberTwo);

    await pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], podMemberTwo);
    expect(create).toHaveBeenCalled();
  });

  test('Mint via subPodMember persona should throw if sender is not a sub pod member', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([adminAddress]));

    const pod = await getPod(adminPodName);
    pod.getPersonas = jest.fn().mockResolvedValue([
      {
        type: 'subPodMember',
        address: subPodAddress,
      },
    ]);
    const personas = await pod.getPersonas(podMemberThree);

    await expect(
      pod.callAsPersona(pod.mintMember, [userAddress2], personas[0], userAddress2),
    ).rejects.toThrow('Sub pod is not a member of this pod');
  });

  test('Mint via subPodMember persona should throw if the sub pod is not a member of the pod', async () => {
    const pod = await getPod(podName);
    pod.getPersonas = jest.fn().mockResolvedValue([
      {
        type: 'subPodMember',
        address: subPodAddress,
      },
    ]);
    const personas = await pod.getPersonas(podMemberThree);

    await expect(pod.callAsPersona(pod.mintMember, [userAddress2], personas[0])).rejects.toThrow(
      'Sub pod is not a member of this pod',
    );
  });
});
