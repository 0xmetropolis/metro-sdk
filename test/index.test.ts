import { init, getPod, getUserPods } from '../src';

beforeAll(() => {
  // Init sdk with whatever variables we need.
  init({ provider: null });
});

const testAddress = '0x1234';

test('getPod should return a Pod object that inherently podId and safe, if one exists', async () => {
  const pod = await getPod(testAddress);
  expect(pod.getId()).toEqual('1');
  expect(pod.getSafe()).toEqual(testAddress);
});

test('getPod should return null if the given address is not a pod', async () => {
  const pod = await getPod('wrongAddress');
  expect(pod).toBeNull();
});

test('Pod object should be able to fetch other properties async', async () => {
  const pod = await getPod(testAddress);
  const ensName = await pod.getEnsName();
  const admin = await pod.getAdmin();
  const image = await pod.getImage();
  const users = await pod.getUsers();
  expect(ensName).toEqual('temp');
  expect(admin).toEqual('temp');
  expect(image).toEqual('temp');
  expect(users).toEqual('temp');
});

test('getUsersPods should return all the Pod objects that a user is part of', async () => {
  const pods = await getUserPods(testAddress);
  expect(pods[0].getId()).toEqual('0');
  expect(pods[1].getId()).toEqual('1');
});

test('getUsersPods should return an empty array if a user is not part of any pods', async () => {
  const pods = await getUserPods(testAddress);
  expect(pods).toEqual([]);
})