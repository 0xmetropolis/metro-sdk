import { init, getPod } from '../src';

beforeAll(() => {
  // Init sdk with whatever variables we need.
  init({ provider: null });
});

const testAddress = '0x1234';

test('getPod should return a Pod object if one exists', async () => {
  const pod = await getPod(testAddress);
  expect(pod.id).toEqual('1');
  expect(pod.safe).toEqual(testAddress);
});

test('getPod should return null if the given address is not a pod', async () => {
  const pod = await getPod('wrongAddress');
  expect(pod).toBeNull();
});

test('getPod result should fetch the following values without async calls', async () => {
  const pod = await getPod(testAddress);
  expect(pod.id).toEqual('1');
  expect(pod.safe).toEqual(testAddress);
  expect(pod.image).toEqual('imageUrl');
  expect(pod.admin).toEqual('adminAddress');
  expect(pod.ensName).toEqual('pod.xyz');
});

test('Pod object should be able to fetch member pods via async call', async () => {
  const rootPod = await getPod('orcanauts.pod.xyz');
  const [artNaut, orgNaut] = await rootPod.getMemberPods();
  expect(artNaut.ensName).toEqual('art-naut.pod.xyz');
  expect(orgNaut.ensName).toEqual('org-naut.pod.xyz');
});

test('Pod.getUsers() should include member pods in its list', async () => {
  const rootPod = await getPod('orcanauts.pod.xyz');
  const [artNaut, orgNaut] = await rootPod.getMemberPods();
  const users = await rootPod.getUsers();
  
  // users should contain the safe addresses of member pods
  expect(users).toContain([artNaut.safe, orgNaut.safe]);
});

test('Pod.getMemberPods() should not include non-pod users', async () => {
  const rootPod = await getPod('orcanauts.pod.xyz');
  const users = await rootPod.getUsers();
  const memberPods = await rootPod.getMemberPods();
  
  // rootPod has some users that are not pods,
  // therefore there should be more users than member pods.
  expect(users.length).toBeGreaterThan(memberPods.length)
});
