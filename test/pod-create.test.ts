import { ethers } from 'ethers';
import { multiPodCreate } from '../src/pod-create';
import { init } from '../src';
import * as create from '../src/temp';
import { userAddress, userAddress2 } from './fixtures';

beforeAll(async () => {
  const provider = new ethers.providers.InfuraProvider('rinkeby', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  init({ provider, network: 4 });
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
  test('It should replace labels with pod indices', async () => {
    const mockCreate = jest.spyOn(create, 'createPods');
    jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
      getNextAvailablePodId: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockReturnValueOnce(100),
      }),
    });
    await multiPodCreate(multiPodInput);
    expect(mockCreate).toHaveBeenCalledWith(
      '0x99a184725B2C12E5C8FBc1E3f680a5aDB3d07160',
      [
        [
          '0x0000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000002',
        ],
        [userAddress, userAddress2],
        [userAddress, userAddress2],
      ],
      [1, 1, 1],
      [ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero],
      [
        '0xcba04bae8ddd2442d7f24f0526838e2bc10c828cc09bea0cf6bbf31fe113b667',
        '0x45fd18df471e91cc8d6eb6a2b1bf22bd2033c21c7987cf1a69017e31ed7722c0',
        '0xf3d1321074b678d5bdd2c74fd5498bb4018cf1af83d64101a3c5a71b64e82ceb',
      ],
      ['orcanauts.pod.xyz', 'art-nauts.pod.xyz', 'gov-nauts.pod.xyz'],
      [
        'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000064-image',
        'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000065-image',
        'https://orcaprotocol-nft.vercel.app/assets/testnet/0000000000000000000000000000000000000000000000000000000000000066-image',
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
    await expect(multiPodCreate(multiPodInput)).rejects.toThrow('No pod had the label of');
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
    await expect(multiPodCreate(multiPodInput)).rejects.toThrow('No pod had the label of');
  });

  test('Member pods cannot reference earlier pods in the create', async () => {
    jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
      getNextAvailablePodId: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockReturnValueOnce(100),
      }),
    });

    const modifiedInput = multiPodInput;
    // Referencing an earlier pod should throw.
    modifiedInput[1] = { ...modifiedInput[1], members: ['orcanauts'] };
    await expect(multiPodCreate(multiPodInput)).rejects.toThrow(
      'Pod member cannot reference earlier pod',
    );
  });

  test('Pod admins cannot reference later pods in the create', async () => {
    jest.spyOn(ethers, 'Contract').mockReturnValueOnce({
      getNextAvailablePodId: jest.fn().mockResolvedValueOnce({
        toNumber: jest.fn().mockReturnValueOnce(100),
      }),
    });

    const modifiedInput = multiPodInput;
    // Referencing a later pod should throw.
    modifiedInput[0] = { ...modifiedInput[0], admin: 'gov-nauts' };
    await expect(multiPodCreate(multiPodInput)).rejects.toThrow(
      'Pod admin cannot reference later pods',
    );
  });
});
