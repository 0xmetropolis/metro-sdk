import { init, getUserPods } from '../src';

beforeAll(() => {
  // Init sdk with whatever variables we need.
  init({ provider: null });
});

const testAddress = '0x1234';

describe('user memberships', () => {
  test('getUsersPods should return all the Pod objects that a user is part of', async () => {
    const pods = await getUserPods(testAddress);
    expect(pods[0].id).toEqual('0');
    expect(pods[1].id).toEqual('1');
  });

  test('getUsersPods should return an empty array if a user is not part of any pods', async () => {
    const pods = await getUserPods(testAddress);
    expect(pods).toEqual([]);
  });

  test('getUserPods should automatically fetch the safe, id, admin, source image and ENS name of a pod', async () => {
    const [pod] = await getUserPods(testAddress);
    expect(pod.id).toEqual('0');
    expect(pod.safe).toEqual(testAddress);
    expect(pod.image).toEqual('imageUrl');
    expect(pod.admin).toEqual('adminAddress');
    expect(pod.ensName).toEqual('your.pod.xyz');
  });

  test('getUserPods should be able to async fetch users', async () => {
    const [pod] = await getUserPods(testAddress);
    const users = await pod.getUsers();
    expect(users[0]).toEqual('0x1234');
    expect(users[1]).toEqual('0x1235');
  });
});