import { ethers } from 'ethers';
import axios from 'axios';
import { init, getPod } from '../src';
import { gqlGetUsers, orcanautAddress, orcanautPod } from './fixtures';
import * as fetchers from '../src/fetchers';
import Pod from '../src/Pod';

function mockGetPodFetchersByAddress(opts?: { overrideAdmin?: string }) {
  const admin = opts?.overrideAdmin ? opts.overrideAdmin : orcanautPod.admin;
  jest.spyOn(fetchers, 'getPodFetchersByAddress').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValue(admin) },
    safe: orcanautAddress,
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
}

beforeAll(async () => {
  const provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  provider.getSigner = () => {};
  init({ provider, network: 1 });
});

test('getPod should return a Pod object if one exists', async () => {
  mockGetPodFetchersByAddress();
  const pod = await getPod(orcanautAddress);
  expect(pod.id).toEqual(orcanautPod.id);
  expect(pod.safe).toEqual(orcanautPod.safe);
  expect(pod.imageNoTextUrl).toEqual(orcanautPod.imageNoTextUrl);
  expect(pod.admin).toEqual(orcanautPod.admin);
  expect(pod.ensName).toEqual(orcanautPod.ensName);
});

test('getPod should throw if it receives a non-address string', async () => {
  await expect(getPod('not valid string')).rejects.toThrowError('Non-address string');
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
