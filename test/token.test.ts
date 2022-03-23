/* eslint-disable jest/prefer-todo */
import { ethers } from 'ethers';
import axios from 'axios';
import * as sdk from '../src';
import * as utils from '../src/lib/utils';
import * as fetchers from '../src/fetchers';
import * as txService from '../src/lib/services/transaction-service';
import {
  artNautPod,
  gqlGetUsers,
  orcaCorePod,
  memberTokenAddress,
  orcanautAddress,
  orcanautPod,
  userAddress,
  userAddress2,
  constructGqlGetUsers,
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

test('As a pod member, I should not be able to create a proposal to mint a member that already exists', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers(orcanautPod.members));
  jest.spyOn(utils, 'getContract').mockReturnValueOnce({
    address: memberTokenAddress,
  });
  const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});
  const mockSigner = {
    getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
  };

  const pod = await sdk.getPod(orcanautAddress);
  await expect(pod.proposeMintMember(orcanautPod.members[0], mockSigner)).rejects.toThrow('is already in this pod');
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
  await expect(pod.proposeBurnMember(userAddress2, mockSigner)).rejects.toThrow('is not in this pod');
});

describe('proposeMintMemberFromPod', () => {
  function setupAdminAndSubPod() {
    jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin) },
      safe: orcanautAddress,
      podId: orcanautPod.id,
      Name: { name: orcanautPod.ensName },
    }).mockResolvedValueOnce({
      // Mock artNaut admin to be orcanaut pod.
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.safe) },
      safe: artNautPod.safe,
      podId: artNautPod.id,
      Name: { name: artNautPod.ensName },
    });
    jest.spyOn(utils, 'getContract').mockReturnValueOnce({
      address: memberTokenAddress,
    });
    jest.spyOn(axios, 'post')
      .mockResolvedValueOnce(constructGqlGetUsers(orcanautPod.members))
      .mockResolvedValueOnce(constructGqlGetUsers(artNautPod.members));
  }

  test('As a member of an admin pod, I should be able to create a proposal on the admin pod to mint a member to a subpod', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // This should be a member of admin pod.
      getAddress: jest.fn().mockResolvedValueOnce(orcanautPod.members[0]),
    };
    const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    // Creates a proposal on the admin pod to mint a new member to subPod using admin privileges.
    await subPod.proposeMintMemberFromPod(adminPod, userAddress2, mockSigner);
    expect(createSafeTx).toHaveBeenCalledWith(
      {
        sender: adminPod.safe,
        safe: subPod.safe,
        to: memberTokenAddress,
        data: '0x94d008ef0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
      },
      mockSigner,
    );
  });

  test('The function should also accept podIds or safe addresses in lieu of a Pod object', async () => {
    jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
      // Mock artNaut admin to be orcanaut pod.
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.safe) },
      safe: artNautPod.safe,
      podId: artNautPod.id,
      Name: { name: artNautPod.ensName },
    }).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin) },
      safe: orcanautAddress,
      podId: orcanautPod.id,
      Name: { name: orcanautPod.ensName },
    });
    jest.spyOn(utils, 'getContract').mockReturnValueOnce({
      address: memberTokenAddress,
    });
    jest.spyOn(axios, 'post')
      .mockResolvedValueOnce(constructGqlGetUsers(orcanautPod.members))
      .mockResolvedValueOnce(constructGqlGetUsers(artNautPod.members));

    const mockSigner = {
      // This should be a member of admin pod.
      getAddress: jest.fn().mockResolvedValueOnce(orcanautPod.members[0]),
    };
    const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});

    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    // Creates a proposal on the admin pod to mint a new member to subPod using admin privileges.
    await subPod.proposeMintMemberFromPod(orcanautPod.id, userAddress2, mockSigner);
    expect(createSafeTx).toHaveBeenCalledWith(
      {
        sender: orcanautPod.safe,
        safe: subPod.safe,
        to: memberTokenAddress,
        data: '0x94d008ef0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
      },
      mockSigner,
    );
  });

  test('As a member of a subpod, I should be able to create a proposal on the parent pod to mint a member to the parent', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // This should be a member of admin pod.
      getAddress: jest.fn().mockResolvedValueOnce(orcanautPod.members[0]),
    };
    const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});
  
    const parentPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    // Creates a proposal on the admin pod to mint a new member to subPod using admin privileges.
    await parentPod.proposeMintMemberFromPod(subPod, userAddress2, mockSigner);
    expect(createSafeTx).toHaveBeenCalledWith(
      {
        sender: subPod.safe,
        safe: parentPod.safe,
        to: memberTokenAddress,
        data: '0x94d008ef0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
      },
      mockSigner,
    );
  });

  test("Should throw if the adminPod is neither the admin, nor a subpod of the Pod you're trying to mint to", async () => {
    jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcaCorePod.admin) },
      safe: orcaCorePod.safe,
      podId: orcaCorePod.id,
      Name: { name: orcaCorePod.ensName },
    }).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(artNautPod.admin) },
      safe: artNautPod.safe,
      podId: artNautPod.id,
      Name: { name: artNautPod.ensName },
    });
    jest.spyOn(utils, 'getContract').mockReturnValueOnce({
      address: memberTokenAddress,
    });

    const mockSigner = {
      // This is a member of orca core.
      getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
    };
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    await expect(subPod.proposeMintMemberFromPod(adminPod, userAddress2, mockSigner)).rejects.toThrow('must be the admin or a subpod of this pod to make proposals');
  });

  test('Should throw if the signer of proposeMintMemberFromPod is not a member of the external pod', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // Not a member.
      getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
    };
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    await expect(subPod.proposeMintMemberFromPod(adminPod, userAddress2, mockSigner)).rejects.toThrow('was not a member of the external pod');
  });

  test('Cannot mint a member that already exists on the sub pod', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // Member already exists.
      getAddress: jest.fn().mockResolvedValueOnce(ethers.utils.getAddress(artNautPod.members[0])),
    };
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    await expect(subPod.proposeMintMemberFromPod(adminPod, artNautPod.members[0], mockSigner)).rejects.toThrow('is already in this pod');
  });
});

describe('proposeBurnMemberFromPod', () => {
  function setupAdminAndSubPod() {
    jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin) },
      safe: orcanautAddress,
      podId: orcanautPod.id,
      Name: { name: orcanautPod.ensName },
    }).mockResolvedValueOnce({
      // Mock artNaut admin to be orcanaut pod.
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.safe) },
      safe: artNautPod.safe,
      podId: artNautPod.id,
      Name: { name: artNautPod.ensName },
    });
    jest.spyOn(utils, 'getContract').mockReturnValueOnce({
      address: memberTokenAddress,
    });
    jest.spyOn(axios, 'post')
      .mockResolvedValueOnce(constructGqlGetUsers(orcanautPod.members))
      .mockResolvedValueOnce(constructGqlGetUsers(artNautPod.members));
  }

  test('As a member of an admin pod, I should be able to create a proposal on the admin pod to burn a member to a subpod', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // This should be a member of admin pod.
      getAddress: jest.fn().mockResolvedValueOnce(orcanautPod.members[0]),
    };
    const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    // Creates a proposal on the admin pod to mint a new member to subPod using admin privileges.
    await subPod.proposeBurnMemberFromPod(adminPod, artNautPod.members[0], mockSigner);
    expect(createSafeTx).toHaveBeenCalledWith(
      {
        sender: adminPod.safe,
        safe: subPod.safe,
        to: memberTokenAddress,
        data: '0x9dc29fac000000000000000000000000094a473985464098b59660b37162a284b51327530000000000000000000000000000000000000000000000000000000000000006',
      },
      mockSigner,
    );
  });

  test('The function should also accept podIds or safe addresses in lieu of a Pod object', async () => {
    jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
      // Mock artNaut admin to be orcanaut pod.
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.safe) },
      safe: artNautPod.safe,
      podId: artNautPod.id,
      Name: { name: artNautPod.ensName },
    }).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin) },
      safe: orcanautAddress,
      podId: orcanautPod.id,
      Name: { name: orcanautPod.ensName },
    });
    jest.spyOn(utils, 'getContract').mockReturnValueOnce({
      address: memberTokenAddress,
    });

    const mockSigner = {
      // This should be a member of admin pod.
      getAddress: jest.fn().mockResolvedValueOnce(orcanautPod.members[0]),
    };
    const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});

    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    // Creates a proposal on the admin pod to mint a new member to subPod using admin privileges.
    await subPod.proposeBurnMemberFromPod(orcanautPod.id, artNautPod.members[0], mockSigner);
    expect(createSafeTx).toHaveBeenCalledWith(
      {
        sender: orcanautPod.safe,
        safe: subPod.safe,
        to: memberTokenAddress,
        data: '0x9dc29fac000000000000000000000000094a473985464098b59660b37162a284b51327530000000000000000000000000000000000000000000000000000000000000006',
      },
      mockSigner,
    );
  });

  test('As a member of a subpod, I should be able to create a proposal on the parent pod to burn a member from the parent', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // This should be a member of admin pod.
      getAddress: jest.fn().mockResolvedValueOnce(orcanautPod.members[0]),
    };
    const createSafeTx = jest.spyOn(txService, 'createSafeTransaction').mockReturnValueOnce({});
  
    const parentPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    // Creates a proposal on the admin pod to mint a new member to subPod using admin privileges.
    await parentPod.proposeBurnMemberFromPod(subPod, orcanautPod.members[0], mockSigner);
    expect(createSafeTx).toHaveBeenCalledWith(
      {
        sender: subPod.safe,
        safe: parentPod.safe,
        to: memberTokenAddress,
        data: '0x9dc29fac000000000000000000000000094a473985464098b59660b37162a284b51327530000000000000000000000000000000000000000000000000000000000000001',
      },
      mockSigner,
    );
  });

  test("Should throw if the adminPod is neither the admin, nor a subpod of the Pod you're trying to mint to", async () => {
    jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(orcaCorePod.admin) },
      safe: orcaCorePod.safe,
      podId: orcaCorePod.id,
      Name: { name: orcaCorePod.ensName },
    }).mockResolvedValueOnce({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Controller: { podAdmin: jest.fn().mockResolvedValue(artNautPod.admin) },
      safe: artNautPod.safe,
      podId: artNautPod.id,
      Name: { name: artNautPod.ensName },
    });
    jest.spyOn(utils, 'getContract').mockReturnValueOnce({
      address: memberTokenAddress,
    });

    const mockSigner = {
      // This is a member of orca core.
      getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
    };
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    await expect(subPod.proposeBurnMemberFromPod(adminPod, artNautPod.members[0], mockSigner)).rejects.toThrow('must be the admin or a subpod of this pod to make proposals');
  });

  test('Should throw if the signer of proposeMintMemberFromPod is not a member of the external pod', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // Not a member.
      getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
    };
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    await expect(subPod.proposeBurnMemberFromPod(adminPod, artNautPod.members[0], mockSigner)).rejects.toThrow('was not a member of the external pod');
  });

  test('Cannot mint a member that does not exist on the sub pod', async () => {
    setupAdminAndSubPod();
    const mockSigner = {
      // Member already exists.
      getAddress: jest.fn().mockResolvedValueOnce(ethers.utils.getAddress(artNautPod.members[0])),
    };
  
    const adminPod = await sdk.getPod(orcanautAddress);
    // subPod is member of adminPod
    const subPod = await sdk.getPod('art-naut.pod.xyz');
  
    await expect(subPod.proposeBurnMemberFromPod(adminPod, userAddress2, mockSigner)).rejects.toThrow('is not in this pod');
  });
});