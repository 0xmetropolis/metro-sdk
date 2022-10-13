import { ethers } from 'ethers';
import { init } from '../src';
import * as txService from '../src/lib/services/transaction-service';
import * as createTx from '../src/lib/services/create-safe-transaction';
import * as utils from '../src/lib/utils';
import {
  createPod,
  multiPodCreate,
  getControllerFromModules,
  enableController,
  podifySafe,
} from '../src/pod-create';
import { userAddress, userAddress2, orcanautAddress } from './fixtures';

beforeAll(async () => {
  const provider = new ethers.providers.InfuraProvider('goerli', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  init({ provider, network: 5 });
});

const mockSigner = {
  getAddress: jest.fn().mockResolvedValue(userAddress),
};

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('pod create', () => {
  test('Pod create should call the smart contract with the appropriate formatting', async () => {
    const mockCreate = jest.fn();
    jest
      .spyOn(ethers, 'Contract')
      .mockReturnValueOnce({
        getNextAvailablePodId: jest.fn().mockResolvedValueOnce({
          toNumber: jest.fn().mockReturnValueOnce(100),
        }),
      })
      .mockReturnValueOnce({
        createPod: mockCreate,
      });
    await createPod(
      { members: [userAddress, userAddress2], admin: userAddress, threshold: 1, name: 'test' },
      mockSigner,
    );
    expect(mockCreate).toHaveBeenCalledWith(
      [userAddress, userAddress2],
      1,
      userAddress,
      '0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658',
      'test.pod.eth',
      100,
      'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000064-image',
    );
  });

  test('Pod create with no signer should return an unsigned transaction', async () => {
    const unsignedTx = await createPod({
      members: [userAddress, userAddress2],
      admin: userAddress,
      threshold: 1,
      name: 'test',
    });
    expect(unsignedTx.data.startsWith('0x7d49f1db0000000000000000000000000000000000')).toBe(true);
    expect(unsignedTx.to).toEqual('0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185');
  });
});

describe('podifySafe', () => {
  test('isControllerEnabled should return a deployment if the safe has a Controller module enabled', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValueOnce({
      // This is a valid Controller
      modules: ['0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185'],
    });
    const enabled = await getControllerFromModules('valuedoesntmatter');
    expect(enabled).toBeTruthy;
    expect(enabled.abi).toBeTruthy;
  });

  test('isControllerEnabled should return false if no Controller module has been enabled', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValueOnce({
      // This is not a valid Controller
      modules: ['0x5bc9beb5b7e359ec95e001536d18f6c908570402'],
    });
    const enabled = await getControllerFromModules('valuedoesntmatter');
    expect(enabled).toBeFalsy;
  });

  test('isControllerEnabled should return false if no modules have been enabled', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValueOnce({
      modules: [],
    });
    const enabled = await getControllerFromModules('valuedoesntmatter');
    expect(enabled).toBeFalsy;
  });

  test('isControllerEnabled can accept an array of modules directly', async () => {
    const getSafe = jest.spyOn(txService, 'getSafeInfo');
    const enabled = await getControllerFromModules(['0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185']);
    expect(enabled).toBeTruthy;
    expect(getSafe).toHaveBeenCalledTimes(0);
  });

  test('isControllerEnabled array of modules that are not Controller', async () => {
    const getSafe = jest.spyOn(txService, 'getSafeInfo');
    // This is not a valid controller
    const enabled = await getControllerFromModules(['0x5bc9beb5b7e359ec95e001536d18f6c908570402']);
    expect(enabled).toBeFalsy;
    expect(getSafe).toHaveBeenCalledTimes(0);
  });

  test('enableController should create a safe transaction', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValue({
      modules: [],
      owners: [userAddress],
    });
    const mockSafeTx = jest.spyOn(createTx, 'createSafeTransaction').mockResolvedValueOnce({});
    const mockApproveTx = jest
      .spyOn(txService, 'approveSafeTransaction')
      .mockImplementation(() => {});
    await enableController('valuedoesntmatter', mockSigner);
    expect(mockSafeTx).toBeCalledWith({
      data: '0x610b5925000000000000000000000000e64e35db269ee0846a5bf14d7eb9a2af4c1ed185',
      safe: 'valuedoesntmatter',
      sender: '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888',
      to: 'valuedoesntmatter',
    });
    expect(mockApproveTx).toHaveBeenCalled();
  });

  test('enableController should throw if the signer is not a safe owner', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValue({
      modules: [],
      owners: [userAddress2],
    });
    await expect(enableController('valuedoesntmatter', mockSigner)).rejects.toThrow(
      'Sender was not safe owner',
    );
  });

  test('enableController should throw if the pod module was already enabled', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValue({
      modules: ['0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185'],
      owners: [userAddress],
    });
    await expect(enableController('valuedoesntmatter', mockSigner)).rejects.toThrow(
      'Pod module was already enabled',
    );
  });

  test('podifySafe should reject if signer is not safe owner', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValue({
      modules: ['0x5bc9beb5b7e359ec95e001536d18f6c908570401'],
      owners: [userAddress2],
    });
    await expect(
      podifySafe({ admin: userAddress, name: 'test', safe: orcanautAddress }, mockSigner),
    ).rejects.toThrow('Sender was not safe owner');
  });

  test('podifySafe should make a smart contract call', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValue({
      modules: ['0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185'],
      owners: [userAddress],
    });
    const mockCreatePod = jest.fn();
    jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
      createPodWithSafe: mockCreatePod,
    });
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      getNextAvailablePodId: jest.fn().mockResolvedValue({
        toString: jest.fn().mockReturnValueOnce(100),
      }),
    });
    await podifySafe({ admin: userAddress, name: 'test', safe: orcanautAddress }, mockSigner);
    expect(mockCreatePod).toHaveBeenCalledWith(
      userAddress,
      orcanautAddress,
      '0x9c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb658',
      'test.pod.eth',
      100,
      'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000064-image',
    );
  });

  test('podifySafe should return an unsigned transaction if not provided signer', async () => {
    jest.spyOn(txService, 'getSafeInfo').mockResolvedValue({
      modules: ['0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185'],
      owners: [userAddress],
    });
    jest.spyOn(utils, 'getMetropolisContract').mockReturnValueOnce({
      getNextAvailablePodId: jest.fn().mockResolvedValue({
        toString: jest.fn().mockReturnValueOnce(100),
      }),
    });
    const unsignedTx = await podifySafe({
      admin: userAddress,
      name: 'test',
      safe: orcanautAddress,
    });
    expect(unsignedTx).toEqual({
      data: '0x3ef3a75c0000000000000000000000004b4c43f66ec007d1dbe28f03dac975aab5fbb88800000000000000000000000097f7dcdf56934cf87a2d5df860fd881fa84ad1429c22ff5f21f0b81b113e63f7db6da94fedef11b2119b4088b89664fb9a3cb65800000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000c746573742e706f642e6574680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007968747470733a2f2f6f72636170726f746f636f6c2d6e66742e76657263656c2e6170702f6173736574732f746573746e65742f303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303030303036342d696d61676500000000000000',
      to: '0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185',
    });
  });
});

const multiPodInput = [
  {
    label: 'orcanauts',
    members: ['art-nauts', 'gov-nauts'],
    threshold: 1,
  },
  {
    label: 'art-nauts',
    members: [userAddress, userAddress2],
    threshold: 1,
  },
  {
    label: 'gov-nauts',
    members: [userAddress, userAddress2],
    threshold: 1,
    admin: 'orcanauts',
  },
];

describe('multi pod create', () => {
  test('It should call the smart contract with the appropriate formatting', async () => {
    const mockCreate = jest.fn();
    jest
      .spyOn(ethers, 'Contract')
      .mockReturnValueOnce({
        getNextAvailablePodId: jest.fn().mockResolvedValueOnce({
          toNumber: jest.fn().mockReturnValueOnce(100),
        }),
      })
      .mockReturnValueOnce({
        createPods: mockCreate,
      });
    await multiPodCreate(multiPodInput);
    expect(mockCreate).toHaveBeenCalledWith(
      '0xE64E35db269ee0846a5BF14d7EB9a2Af4C1ed185',
      [
        [userAddress, userAddress2],
        [userAddress, userAddress2],
        [
          '0x0000000000000000000000000000000000000002',
          '0x0000000000000000000000000000000000000001',
        ],
      ],
      [1, 1, 1],
      [
        '0x0000000000000000000000000000000000000003',
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ],
      [
        '0xf3d1321074b678d5bdd2c74fd5498bb4018cf1af83d64101a3c5a71b64e82ceb',
        '0x45fd18df471e91cc8d6eb6a2b1bf22bd2033c21c7987cf1a69017e31ed7722c0',
        '0xcba04bae8ddd2442d7f24f0526838e2bc10c828cc09bea0cf6bbf31fe113b667',
      ],
      ['gov-nauts.pod.xyz', 'art-nauts.pod.xyz', 'orcanauts.pod.xyz'],
      [
        'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000066-image',
        'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000065-image',
        'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000064-image',
      ],
    );
  });

  test('If provided a member label, it must reference another pod in the list', async () => {
    jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
      getNextAvailablePodId: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockReturnValueOnce(100),
      }),
    });

    const modifiedInput = multiPodInput;
    // Referencing a pod not in the array should throw.
    modifiedInput[1] = { ...modifiedInput[1], members: ['anotherpod'] };
    await expect(multiPodCreate(modifiedInput)).rejects.toThrow('No pod had the label of');
  });

  test('If provided an admin label, it must reference another pod in the list', async () => {
    jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
      getNextAvailablePodId: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockReturnValueOnce(100),
      }),
    });

    const modifiedInput = multiPodInput;
    // Referencing a pod not in the array should throw.
    modifiedInput[1] = { ...modifiedInput[1], admin: 'anotherpod' };
    await expect(multiPodCreate(modifiedInput)).rejects.toThrow('No pod had the label of');
  });
});
