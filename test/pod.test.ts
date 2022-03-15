import { ethers } from 'ethers';
import axios from 'axios';
import * as ENS from '@ensdomains/ensjs';
import { init, getPod, config } from '../src';
import { gqlGetUsers, orcanautAddress, orcanautPod, userAddress, userAddress2 } from './fixtures';
import * as fetchers from '../src/fetchers';
import Pod from '../src/Pod';

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : orcanautPod.admin;
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValueOnce(admin) },
    safe: orcanautAddress,
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
}

beforeAll(async () => {
  const provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  init({ provider, network: 1 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

test('getPod should be able to fetch via address', async () => {
  jest.spyOn(ENS, 'default').mockReturnValueOnce({
    getName: jest.fn().mockReturnValueOnce({ name: 'orcanauts.pod.xyz' }),
    name: jest.fn().mockReturnValueOnce({
      getText: jest.fn().mockResolvedValueOnce(1),
      name: 'orcanauts.pod.xyz',
    }),
  });
  jest
    .spyOn(ethers, 'Contract')
    .mockReturnValueOnce({
      memberController: jest
        .fn()
        .mockResolvedValueOnce('0xD89AAd5348A34E440E72f5F596De4fA7e291A3e8'),
    })
    .mockReturnValueOnce({
      podAdmin: jest.fn().mockResolvedValueOnce('0x094A473985464098b59660B37162a284b5132753'),
    });
  const pod = await getPod(orcanautAddress);
  expect(pod.id).toEqual(orcanautPod.id);
  expect(pod.safe).toEqual(orcanautPod.safe);
  expect(pod.imageNoTextUrl).toEqual(orcanautPod.imageNoTextUrl);
  expect(pod.admin).toEqual(orcanautPod.admin);
  expect(pod.ensName).toEqual(orcanautPod.ensName);
});

test('getPod should be able to fetch via ens name', async () => {
  jest.spyOn(ENS, 'default').mockReturnValueOnce({
    name: jest.fn().mockReturnValueOnce({
      getText: jest.fn().mockResolvedValueOnce(1),
      name: 'orcanauts.pod.xyz',
    }),
  });
  jest
    .spyOn(config.provider, 'resolveName')
    .mockReturnValueOnce('0x97F7Dcdf56934Cf87a2d5DF860fD881FA84ad142');
  jest
    .spyOn(ethers, 'Contract')
    .mockReturnValueOnce({
      memberController: jest
        .fn()
        .mockResolvedValueOnce('0xD89AAd5348A34E440E72f5F596De4fA7e291A3e8'),
    })
    .mockReturnValueOnce({
      podAdmin: jest.fn().mockResolvedValueOnce('0x094A473985464098b59660B37162a284b5132753'),
    });
  const pod = await getPod(orcanautPod.ensName);
  expect(pod.id).toEqual(orcanautPod.id);
  expect(pod.safe).toEqual(orcanautPod.safe);
  expect(pod.imageNoTextUrl).toEqual(orcanautPod.imageNoTextUrl);
  expect(pod.admin).toEqual(orcanautPod.admin);
  expect(pod.ensName).toEqual(orcanautPod.ensName);
});

test('getPod should be able to fetch via pod id', async () => {
  jest.spyOn(ENS, 'default').mockReturnValueOnce({
    getName: jest.fn().mockReturnValueOnce({ name: 'orcanauts.pod.xyz' }),
    name: jest.fn().mockReturnValueOnce({
      name: 'orcanauts.pod.xyz',
    }),
  });
  jest
    .spyOn(ethers, 'Contract')
    .mockReturnValueOnce({
      memberController: jest
        .fn()
        .mockResolvedValueOnce('0xD89AAd5348A34E440E72f5F596De4fA7e291A3e8'),
    })
    .mockReturnValueOnce({
      podIdToSafe: jest.fn().mockResolvedValueOnce('0x97F7Dcdf56934Cf87a2d5DF860fD881FA84ad142'),
      podAdmin: jest.fn().mockResolvedValueOnce('0x094A473985464098b59660B37162a284b5132753'),
    });
  const pod = await getPod(orcanautPod.id);
  expect(pod.id).toEqual(orcanautPod.id);
  expect(pod.safe).toEqual(orcanautPod.safe);
  expect(pod.imageNoTextUrl).toEqual(orcanautPod.imageNoTextUrl);
  expect(pod.admin).toEqual(orcanautPod.admin);
  expect(pod.ensName).toEqual(orcanautPod.ensName);
});

test('getPod should return null if given a value that doesnt resolve to an address', async () => {
  const pod = await getPod('not valid string');
  expect(pod).toBe(null);
});

test('getPod should return null if the given address is not a pod', async () => {
  const pod = await getPod(ethers.constants.AddressZero);
  expect(pod).toBeNull();
});

test('pod.admin should be null if there is none', async () => {
  mockGetPodFetchersByAddress({ overrideAdmin: ethers.constants.AddressZero });
  const pod = await getPod(orcanautAddress);
  expect(pod.admin).toBeNull();
});

test('getPod should be able to fetch members via async call', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  const members = await pod.getMembers();
  expect(members).toEqual([
    '0x25F55d2e577a937433686A01439E5fFdffe62218',
    '0x46E69D6801d4E09360Ab62A638849D72623A2e7E',
    '0x4846162806B025Dcd0759cACF9ec6F9474274282',
    '0x7aAef56837f37965fb410F4901bDC1172870e2F8',
    '0x7B54195b743BF76c314e9dBDDf110F5a22743998',
    '0x7f08D6A56b7B6f75eb8c628384855b82D2Ab18C8',
    '0x7f33BeaA131a6896B97E27c505c532cE40f88f33',
    '0xAfBb354FF03E17b1EffBaF661FFca106ba78b966',
    '0xcABB78f39Fbeb0CdFBD3C8f30E37630EB9e7A151',
  ]);
});

test('Pod object should be able to fetch member pods via async call', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  // This one doesn't mock the getMemberPods call.
  const rootPod = await getPod(orcanautAddress);
  const memberPods = await rootPod.getMemberPods();
  const podNames = memberPods.map(pod => pod.ensName);
  expect(podNames).toEqual(
    expect.arrayContaining([
      'art-naut.pod.xyz',
      'dev-naut.pod.xyz',
      'org-naut.pod.xyz',
      'gov-naut.pod.xyz',
    ]),
  );
});

test('Pod.getMembers() should include member pods in its list', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  // No mock on getMemberPods
  const rootPod = await getPod(orcanautAddress);
  const [artNaut, devNaut, orgNaut, govNaut] = await rootPod.getMemberPods();
  const members = await rootPod.getMembers();

  // users should contain the safe addresses of member pods
  expect(members).toEqual(
    expect.arrayContaining([artNaut.safe, devNaut.safe, orgNaut.safe, govNaut.safe]),
  );
});

test('Pod.getMemberEOAs() should not include pod members', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const rootPod = await getPod(orcanautAddress);
  const members = await rootPod.getMembers();
  const EOAs = await rootPod.getMemberEOAs();

  expect(members).toEqual(
    expect.arrayContaining([
      '0xcABB78f39Fbeb0CdFBD3C8f30E37630EB9e7A151',
      '0xAfBb354FF03E17b1EffBaF661FFca106ba78b966',
      '0x46E69D6801d4E09360Ab62A638849D72623A2e7E',
      '0x4846162806B025Dcd0759cACF9ec6F9474274282',
      '0x7B54195b743BF76c314e9dBDDf110F5a22743998',
    ]),
  );
  expect(members.length).toBeGreaterThan(EOAs.length);
  expect(EOAs.every(element => typeof element === 'string')).toBeTruthy();
});

test('Pod.getMemberPods() should not include non-pod users', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const rootPod = await getPod(orcanautAddress);
  const members = await rootPod.getMembers();
  const memberPods = await rootPod.getMemberPods();

  // rootPod has some users that are not pods,
  // therefore there should be more users than member pods.
  expect(members.length).toBeGreaterThan(memberPods.length);
  expect(memberPods.every(pod => pod instanceof Pod)).toBeTruthy();
});

test('Pod.getMemberPods should also async fetch memberEOAs', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const rootPod = await getPod(orcanautAddress);
  await rootPod.getMemberPods();

  expect(rootPod.memberEOAs.length > 0).toBeTruthy();
});

test('Pod.isMember() should return true/false if a given address is a member', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  const isMember1 = await pod.isMember('0xcABB78f39Fbeb0CdFBD3C8f30E37630EB9e7A151');
  expect(isMember1).toBe(true);
  const isMember2 = await pod.isMember(userAddress2);
  expect(isMember2).toBe(false);
});

test('Pod.isMember() should reject on non-address inputs', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  await expect(pod.isMember('not an address')).rejects.toThrow('Invalid address');
});

test('Pod.isAdmin() should return true/false if a given address is the admin', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  const isAdmin1 = pod.isAdmin('0x094A473985464098b59660B37162a284b5132753');
  expect(isAdmin1).toBe(true);
  const isAdmin2 = pod.isAdmin(userAddress);
  expect(isAdmin2).toBe(false);
});

test('Pod.isAdmin() should throw if given a non-address input', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  expect(() => { pod.isAdmin('not an address') }).toThrow('Invalid address');
});

test('Pod.isNestedMember() should return true/false if a given address is a nested member', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  const isSubPodMember1 = await pod.isSubPodMember('0x094A473985464098b59660B37162a284b5132753');
  expect(isSubPodMember1).toBe(true);
  const isSubPodMember2 = await pod.isSubPodMember(userAddress);
  expect(isSubPodMember2).toBe(false);
});

test('Pod.isNestedMember() should throw on non-address inputs', async () => {
  mockGetPodFetchersByAddress();
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  await expect(pod.isSubPodMember('not an address')).rejects.toThrow('Invalid address');
});