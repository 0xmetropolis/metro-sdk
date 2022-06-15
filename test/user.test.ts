import axios from 'axios';
import { ethers } from 'ethers';
import { init, getUserPods, getAdminPods } from '../src';
import { orcaCorePod, userAddress, gqlGetUserPods, gqlGetUserPodsEmpty } from './fixtures';

beforeAll(async () => {
  const provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  init({ provider, network: 1 });
});

describe('user memberships', () => {
  // test('getUsersPods should return all the Pod objects that a user is part of', async () => {
  //   jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUserPods);
  //   const pods = await getUserPods(userAddress);
  //   expect(pods[0].id).toEqual(0);
  //   expect(pods[1].id).toEqual(2);
  //   expect(pods[2].id).toEqual(3);
  // });

  test('getUsersPods should throw if it receives something other than a valid eth address', async () => {
    await expect(getUserPods('badAddress')).rejects.toThrowError('Invalid address provided');
  });

  test('getUsersPods should return an empty array if a user is not part of any pods', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUserPodsEmpty);
    const pods = await getUserPods(ethers.constants.AddressZero);
    expect(pods).toEqual([]);
  });

  test('getUserPods should automatically fetch the safe, id, admin, source image and ENS name of a pod', async () => {
    jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUserPods);
    const [pod] = await getUserPods(userAddress);
    expect(pod.id).toEqual(orcaCorePod.id);
    expect(pod.safe).toEqual(orcaCorePod.safe);
    expect(pod.imageUrl).toEqual(orcaCorePod.imageUrl);
    expect(pod.admin).toEqual(orcaCorePod.admin);
    expect(pod.ensName).toEqual(orcaCorePod.ensName);
  });

  // test('getUserPods should be able to async fetch users', async () => {
  //   jest.spyOn(axios, 'post').mockResolvedValueOnce(gqlGetUserPods);
  //   jest
  //     .spyOn(axios, 'post')
  //     .mockResolvedValueOnce(
  //       constructGqlGetUsers([
  //         '0x094A473985464098b59660B37162a284b5132753',
  //         '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
  //         '0x403f69b1092cf1cB82487CD137F96E8200f03BD5',
  //         '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888',
  //         '0x653E430f15535B7C5C6f8Ae6FC514B28a6906438',
  //         '0x99B7f60Ba045c8810b2E22fcf9e89391490E17a0',
  //         '0xf065BdC0A5A92F34E9270F686355B5EA7b95bEBE',
  //       ]),
  //     );
  //   const [pod] = await getUserPods(userAddress);
  //   const users = await pod.getMembers();

  //   expect(users).toEqual(
  //     expect.arrayContaining([
  //       '0x094A473985464098b59660B37162a284b5132753',
  //       '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
  //       '0x403f69b1092cf1cB82487CD137F96E8200f03BD5',
  //       '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888',
  //       '0x653E430f15535B7C5C6f8Ae6FC514B28a6906438',
  //       '0x99B7f60Ba045c8810b2E22fcf9e89391490E17a0',
  //       '0xf065BdC0A5A92F34E9270F686355B5EA7b95bEBE',
  //     ]),
  //   );
  // });
});

// test('getAdminPods should fetch Pod objects for all the pods an address is admin of', async () => {
//   const provider = new ethers.providers.InfuraProvider('mainnet', {
//     infura: '69ecf3b10bc24c6a972972666fe950c8',
//   });
//   init({ provider, network: 1 });
//   const pods = await getAdminPods(userAddress);
//   pods.forEach(pod => {
//     expect(pod.admin).toEqual(userAddress);
//   });
// });
