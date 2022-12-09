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
    Safe: {
      address: orcanautAddress,
      nonce: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 5),
      }),
      getThreshold: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockImplementation(() => 10),
      }),
    },
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
}

beforeAll(async () => {
  provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: process.env.INFURA_KEY,
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

describe('admin actions', () => {
  test('Mint member should throw if given an invalid address', async () => {
    mockGetPodFetchersByAddress();
    const mockMint = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      mint: mockMint,
    });
    const pod = await sdk.getPod(orcanautAddress);
    await expect(pod.mintMember('wrongpod')).rejects.toThrow('Invalid address');
  });

  test('As an admin, I should be able to mint a member to a pod', async () => {
    provider = new ethers.providers.InfuraProvider('mainnet', {
      infura: process.env.INFURA_KEY,
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    provider.getSigner = () => {
      return {
        getAddress: jest.fn().mockResolvedValue(orcanautPod.admin),
      };
    };

    mockGetPodFetchersByAddress();
    const mockMint = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      mint: mockMint,
    });
    const pod = await sdk.getPod(orcanautAddress);

    await pod.mintMember(userAddress, provider.getSigner());
    expect(mockMint).toHaveBeenCalledWith(userAddress, orcanautPod.id, ethers.constants.HashZero);
  });

  test('As an admin, I should be able to burn a member from a pod', async () => {
    mockGetPodFetchersByAddress();
    const mockBurn = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      burn: mockBurn,
    });

    const pod = await sdk.getPod(orcanautAddress);
    // Should return a metamask transaction
    await pod.burnMember(userAddress, provider.getSigner());
    expect(mockBurn).toHaveBeenCalledWith(userAddress, orcanautPod.id);
  });

  test('As an admin, I should be able to transfer my admin rights to another address', async () => {
    mockGetPodFetchersByAddress();
    const mockTransferAdmin = jest.fn();
    jest.spyOn(ethers, 'Contract').mockReturnValue({
      updatePodAdmin: mockTransferAdmin,
    });
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(orcanautPod.admin),
    };

    const pod = await sdk.getPod(orcanautAddress);
    // Should return a metamask transaction
    await pod.transferAdmin(userAddress, mockSigner);
    expect(mockTransferAdmin).toHaveBeenCalledWith(orcanautPod.id, userAddress);
  });
});

describe('member actions', () => {
  test('As a pod member, I should be able to transfer my membership', async () => {
    mockGetPodFetchersByAddress();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValue(orcanautPod.members[0]),
    };
    const mockTransfer = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      safeTransferFrom: mockTransfer,
    });
    const pod = await sdk.getPod(orcanautAddress);

    await pod.transferMembership(await mockSigner.getAddress(), userAddress, mockSigner);
    expect(mockTransfer).toHaveBeenCalledWith(
      orcanautPod.members[0],
      userAddress,
      orcanautPod.id,
      1,
      ethers.constants.HashZero,
    );
  });

  test('transferMembership should throw if the fromAddress is not a member', async () => {
    mockGetPodFetchersByAddress();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValue(userAddress2),
    };
    const pod = await sdk.getPod(orcanautAddress);

    // Attempting to transfer membership to already existing member.
    await expect(
      pod.transferMembership(await mockSigner.getAddress(), orcanautPod.members[0], mockSigner),
    ).rejects.toThrow('was not a member of this pod');
  });
});

test('batchMintAndBurn should throw if the pod is not on an applicable version', async () => {
  mockGetPodFetchersByAddress();
  const pod = await sdk.getPod(orcanautAddress);
  await expect(pod.batchMintAndBurn([], [])).rejects.toThrow(
    'you may need to upgrade to the latest',
  );
});
