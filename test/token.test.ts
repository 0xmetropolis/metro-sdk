/* eslint-disable jest/prefer-todo */
import { ethers } from 'ethers';
import * as sdk from '../src';
import * as utils from '../src/lib/utils';
import * as fetchers from '../src/fetchers';
import * as txService from '../src/lib/services/transaction-service';
import {
  gqlGetUsers,
  memberTokenAddress,
  orcanautAddress,
  orcanautPod,
  userAddress,
  userAddress2,
} from './fixtures';

let provider;

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : orcanautPod.admin;
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValue(admin) },
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
    return userAddress2;
  };
  sdk.init({ provider, network: 1 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

test('Mint member should throw if given an invalid address', async () => {
  mockGetPodFetchersByAddress();
  const mockMint = jest.fn();
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    mint: mockMint,
  });
  const pod = await sdk.getPod(orcanautAddress);
  await expect(pod.mintMember('wrongpod', provider.getSigner())).rejects.toThrow('Invalid address');
});

test('As an admin, I should be able to mint a member to a pod', async () => {
  mockGetPodFetchersByAddress();
  const mockMint = jest.fn();
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    mint: mockMint,
  });
  const pod = await sdk.getPod(orcanautAddress);

  await pod.mintMember(userAddress, provider.getSigner());
  expect(mockMint).toHaveBeenCalledWith(userAddress, orcanautPod.id, ethers.constants.HashZero);
});

test('As an admin, I should be able to burn a member from a pod', async () => {
  mockGetPodFetchersByAddress();
  const mockBurn = jest.fn();
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    burn: mockBurn,
  });

  const pod = await sdk.getPod(orcanautAddress);
  // Should return a metamask transaction
  await pod.burnMember(userAddress, provider.getSigner());
  expect(mockBurn).toHaveBeenCalledWith(userAddress, orcanautPod.id);
});

test('As a pod member, I should be able to create a proposal to mint a member', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    address: memberTokenAddress,
  });
  const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});
  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
  };

  const pod = await sdk.getPod(orcanautAddress);
  await pod.proposeMintMember(userAddress, mockSigner);
  expect(createSafeTx).toHaveBeenCalledWith(
    {
      sender: userAddress2,
      safe: orcanautPod.safe,
      to: memberTokenAddress,
      data: '0x94d008ef0000000000000000000000004b4c43f66ec007d1dbe28f03dac975aab5fbb8880000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
    },
    mockSigner,
  );
});

test('As a pod member, I should be able to create a proposal to burn a member', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    address: memberTokenAddress,
  });
  const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});
  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
  };

  const pod = await sdk.getPod(orcanautAddress);
  await pod.proposeBurnMember(userAddress, mockSigner);
  expect(createSafeTx).toHaveBeenCalledWith(
    {
      sender: userAddress2,
      safe: orcanautPod.safe,
      to: memberTokenAddress,
      data: '0x9dc29fac0000000000000000000000004b4c43f66ec007d1dbe28f03dac975aab5fbb8880000000000000000000000000000000000000000000000000000000000000001',
    },
    mockSigner,
  );
});
