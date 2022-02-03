import { ethers } from 'ethers';
import { init, getPod } from '../src';
import { gqlGetUsers, orcanautAddress, orcanautPod } from './fixtures';
import axios from 'axios';
import * as index from '../src/index';

beforeAll(async () => {
  const provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  provider.getSigner = () => {};
  init({ provider, network: 1 });
});

test('getPod should return a Pod object if one exists', async () => {
  jest.spyOn(index, 'getPodFetchersByAddress').mockResolvedValueOnce({
    Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin)},
    safe: orcanautAddress,
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
  const pod = await getPod(orcanautAddress);
  expect(pod.id).toEqual(orcanautPod.id);
  expect(pod.safe).toEqual(orcanautPod.safe);
  expect(pod.image).toEqual(orcanautPod.image);
  expect(pod.admin).toEqual(orcanautPod.admin);
  expect(pod.ensName).toEqual(orcanautPod.ensName);
});

test('getPod should return null if the given address is not a pod', async () => {
  const pod = await getPod('notAPod');
  expect(pod).toBeNull();
});

test('getPod should be able to fetch users via async call', async () => {
  jest.spyOn(index, 'getPodFetchersByAddress').mockResolvedValueOnce({
    Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin)},
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const pod = await getPod(orcanautAddress);
  const users = await pod.getUsers();
  expect(users).toEqual([
    '0x25F55d2e577a937433686A01439E5fFdffe62218',
    '0x46E69D6801d4E09360Ab62A638849D72623A2e7E',
    '0x4846162806B025Dcd0759cACF9ec6F9474274282',
    '0x7aAef56837f37965fb410F4901bDC1172870e2F8',
    '0x7B54195b743BF76c314e9dBDDf110F5a22743998',
    '0x7f08D6A56b7B6f75eb8c628384855b82D2Ab18C8',
    '0x7f33BeaA131a6896B97E27c505c532cE40f88f33',
    '0xAfBb354FF03E17b1EffBaF661FFca106ba78b966',
    '0xcABB78f39Fbeb0CdFBD3C8f30E37630EB9e7A151'
  ]);
});

test('Pod object should be able to fetch member pods via async call', async () => {
  jest.spyOn(index, 'getPodFetchersByAddress').mockResolvedValueOnce({
    Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin)},
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  // This one doesn't mock the getMemberPods call.
  const rootPod = await getPod(orcanautAddress);
  const memberPods = await rootPod.getMemberPods();
  const podNames = memberPods.map(pod => pod.ensName);
  expect(podNames).toEqual(expect.arrayContaining([
    'art-naut.pod.xyz',
    'dev-naut.pod.xyz',
    'org-naut.pod.xyz',
    'gov-naut.pod.xyz'
  ]));
});

test('Pod.getUsers() should include member pods in its list', async () => {
  jest.spyOn(index, 'getPodFetchersByAddress').mockResolvedValueOnce({
    Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin)},
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  // No mock on getMemberPods
  const rootPod = await getPod(orcanautAddress);
  const [artNaut, devNaut, orgNaut, govNaut] = await rootPod.getMemberPods();
  const users = await rootPod.getUsers();
  
  // users should contain the safe addresses of member pods
  expect(users).toEqual(expect.arrayContaining([artNaut.safe, devNaut.safe, orgNaut.safe, govNaut.safe]));
});

test('Pod.getMemberPods() should not include non-pod users', async () => {
  jest.spyOn(index, 'getPodFetchersByAddress').mockResolvedValueOnce({
    Controller: { podAdmin: jest.fn().mockResolvedValue(orcanautPod.admin)},
    podId: orcanautPod.id,
    Name: { name: orcanautPod.ensName },
  });
  jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUsers);

  const rootPod = await getPod(orcanautAddress);
  const users = await rootPod.getUsers();
  const memberPods = await rootPod.getMemberPods();
  
  // rootPod has some users that are not pods,
  // therefore there should be more users than member pods.
  expect(users.length).toBeGreaterThan(memberPods.length);
});
