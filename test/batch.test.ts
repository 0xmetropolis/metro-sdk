import { ethers } from 'ethers';
import { batchTransferMembership, init } from '../src';
import {
  orcanautAddress,
  orcanautPod,
  metropolis1WithAdminPod,
  userAddress3,
  podIds,
} from './fixtures';
import * as fetchers from '../src/fetchers';
import * as utils from '../src/lib/utils';

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
  const provider = new ethers.providers.InfuraProvider('goerli', {
    infura: process.env.INFURA_KEY,
  });
  init({ provider, network: 5 });
});

const mockSigner = {
  getAddress: jest.fn().mockResolvedValue(metropolis1WithAdminPod?.members[3]),
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('batch transfer memberships', () => {
  test('should be able to transfer membership rights of multiple pods to a single address', async () => {
    mockGetPodFetchersByAddress();
    const mockBatchTransfer = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      safeBatchTransferFrom: mockBatchTransfer,
    });

    await batchTransferMembership(await mockSigner.getAddress(), userAddress3, podIds, mockSigner);

    expect(mockBatchTransfer).toHaveBeenCalledWith(
      metropolis1WithAdminPod?.members[3],
      userAddress3,
      podIds,
      [1, 1],
      ethers.constants.HashZero,
    );
  });
  test('should throw if the signer is not a member of each pod', async () => {
    mockGetPodFetchersByAddress();
    const mockBatchTransfer = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      safeBatchTransferFrom: mockBatchTransfer,
    });

    await expect(
      batchTransferMembership(await mockSigner.getAddress(), userAddress3, [1, 11], mockSigner),
    ).rejects.toThrow(`Signer ${await mockSigner.getAddress()} is not a member of this pod`);
  });

  test('should throw if the toAddress is already a pod member', async () => {
    mockGetPodFetchersByAddress();
    const mockBatchTransfer = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      safeBatchTransferFrom: mockBatchTransfer,
    });

    await expect(
      batchTransferMembership(
        await mockSigner.getAddress(),
        metropolis1WithAdminPod?.members[1],
        podIds,
        mockSigner,
      ),
    ).rejects.toThrow(
      `Signer ${metropolis1WithAdminPod?.members[1]} is already a member of this pod`,
    );
  });
  test('should throw if the signer does not match the fromAddress', async () => {
    mockGetPodFetchersByAddress();
    const mockBatchTransfer = jest.fn();
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      safeBatchTransferFrom: mockBatchTransfer,
    });

    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(metropolis1WithAdminPod?.members[1]),
    };

    await expect(
      batchTransferMembership(
        metropolis1WithAdminPod?.members[3],
        userAddress3,
        podIds,
        mockSigner,
      ),
    ).rejects.toThrow('Signer did not match the from address');
  });
});
