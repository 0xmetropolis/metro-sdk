/* eslint-disable jest/prefer-todo */
import { ethers } from 'ethers';
import axios from 'axios';
import * as sdk from '../src';
import * as fetchers from '../src/fetchers';
import * as createSafe from '../src/lib/services/create-safe-transaction';
import {
  artNautPod,
  orcanautAddress,
  orcanautPod,
  userAddress,
  constructGqlGetUsers,
  erc20TransferTransaction,
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
    Safe: {
      address: orcanautPod.safe,
      nonce: jest.fn().mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 5) }),
      getThreshold: jest
        .fn()
        .mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 10) }),
    },    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
}

function setupAdminAndSubPod() {
  jest
    .spyOn(fetchers, 'getPodFetchersByAddressOrEns')
    .mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: {
        podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin),
        address: '0x17FDC2Eaf2bd46f3e1052CCbccD9e6AD0296C42c',
      },
      Safe: {
        address: orcanautAddress,
        nonce: jest.fn().mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 5) }),
        getThreshold: jest
          .fn()
          .mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 10) }),
      },
      podId: orcanautPod.id,
      Name: { name: orcanautPod.ensName },
    })
    .mockResolvedValueOnce({
      // Mock artNaut admin to be orcanaut pod.
      Controller: {
        podAdmin: jest.fn().mockResolvedValue(orcanautPod.safe),
        address: '0x17FDC2Eaf2bd46f3e1052CCbccD9e6AD0296C42c',
      },
      Safe: {
        address: artNautPod.safe,
        nonce: jest.fn().mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 5) }),
        getThreshold: jest
          .fn()
          .mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 10) }),
      },
      podId: artNautPod.id,
      Name: { name: artNautPod.ensName },
    });
  jest
    .spyOn(axios, 'post')
    .mockResolvedValueOnce(constructGqlGetUsers(orcanautPod.members))
    .mockResolvedValueOnce(constructGqlGetUsers(artNautPod.members));
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

test('Subpod members should be able to propose a mint member', async () => {
  mockGetPodFetchersByAddress();
  // Arbitrary return value.
  const create = jest.spyOn(createSafe, 'createSafeTransaction').mockResolvedValue(erc20TransferTransaction);
  const pod = await sdk.getPod(orcanautAddress);

  const mint = pod.populateMint(userAddress);
  await pod.propose(mint, artNautPod.members[0]);
  
  expect(create).toHaveBeenCalledWith({
    sender: orcanautPod.members[0],
    to: mint.to,
    data: mint.data,
    safe: pod.safe,
  });
});

test('Sub pod members should be able to propose a super pod mint', async () => {
  setupAdminAndSubPod();
  const create = jest.spyOn(createSafe, 'createSafeTransaction').mockResolvedValue(erc20TransferTransaction);

  const superPod = await sdk.getPod(orcanautAddress);
  const subPod = await sdk.getPod(artNautPod.safe);
  const mint = superPod.populateMint(userAddress);

  await subPod.propose(
    await superPod.propose(
      mint,
      orcanautPod.members[0]
    ),
    artNautPod.members[0]
  );
  expect(create).toHaveBeenNthCalledWith(1, {
    sender: orcanautPod.members[0],
    to: mint.to,
    data: mint.data,
    safe: superPod.safe,
  });
  expect(create).toHaveBeenNthCalledWith(2, {
    sender: artNautPod.members[0],
    to: orcanautPod.safe,
    data: '0xd4d9bdcda382f3f9a3fc80b8694b97906354918858b8e5c8147304ff4dc6311f95ac2b93',
    safe: subPod.safe,
  });
});
