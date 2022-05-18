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

describe('admin actions', () => {
  test('As an admin, I should be able to mint a member to a pod', async () => {
    provider = new ethers.providers.InfuraProvider('mainnet', {
      infura: '69ecf3b10bc24c6a972972666fe950c8',
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
    jest.spyOn(utils, 'getContract').mockReturnValueOnce({
      mint: mockMint,
    });
    const pod = await sdk.getPod(orcanautAddress);

    await pod.mint(userAddress, provider.getSigner()).asAdmin();
    expect(mockMint).toHaveBeenCalledWith(userAddress, orcanautPod.id, ethers.constants.HashZero);
  });
});
