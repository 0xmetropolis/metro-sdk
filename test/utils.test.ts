import { ethers } from 'ethers';
import { init } from '../src';
import { userAddress, constructGqlGetUsers, gqlGetUsers } from './fixtures';
import { encodeFunctionData, getPreviousModule } from '../src/lib/utils';

const provider = new ethers.providers.InfuraProvider('goerli', {
  infura: process.env.INFURA_KEY,
});

test('encodeFunctionData should encode function data', () => {
  const data = encodeFunctionData('MemberToken', 'mint', [
    ethers.utils.getAddress(userAddress),
    5,
    ethers.constants.HashZero,
  ]);
  expect(data).toBe(
    '0x94d008ef0000000000000000000000004b4c43f66ec007d1dbe28f03dac975aab5fbb8880000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
  );
});

test("encodeFunctionData should throw for a contract we don't support", () => {
  expect(() => {
    encodeFunctionData('UnsupportedContract', 'transfer', []);
  }).toThrow('Contract ABI could not be found for UnsupportedContract');
});

test('encodeFunctionData should throw if function is not found in ABI', () => {
  expect(() => {
    encodeFunctionData('MemberToken', 'unsupportedFunction', []);
  }).toThrow('no matching function');
});

test('constructGqlGetUsers should convert an array of strings properly', () => {
  expect(
    constructGqlGetUsers([
      '0x25f55d2e577a937433686a01439e5ffdffe62218',
      '0x46e69d6801d4e09360ab62a638849d72623a2e7e',
      '0x4846162806b025dcd0759cacf9ec6f9474274282',
      '0x7aaef56837f37965fb410f4901bdc1172870e2f8',
      '0x7b54195b743bf76c314e9dbddf110f5a22743998',
      '0x7f08d6a56b7b6f75eb8c628384855b82d2ab18c8',
      '0x7f33beaa131a6896b97e27c505c532ce40f88f33',
      '0xafbb354ff03e17b1effbaf661ffca106ba78b966',
      '0xcabb78f39fbeb0cdfbd3c8f30e37630eb9e7a151',
    ]),
  ).toEqual(gqlGetUsers);
});

test('getPreviousModule fetches the previous module if there is one', async () => {
  init({ provider, network: 5 });
  jest.spyOn(ethers, 'Contract').mockReturnValue({
    getModulesPaginated: jest.fn().mockResolvedValue({
      array: [
        '0x11e2d4c75b9803fF5d6DA8c30b354B44992E0248',
        '0x96F983d0B84ecFf01C34991C3718Ad35d520A825',
      ],
      next: '0x0000000000000000000000000000000000000001',
    }),
  });
  expect(
    await getPreviousModule(
      '0x81CC4c1411044C09b7a888Af225176fac87A5CE3',
      '0x96F983d0B84ecFf01C34991C3718Ad35d520A825',
    ),
  ).toEqual('0x11e2d4c75b9803fF5d6DA8c30b354B44992E0248');
});

test('getPreviousModule returns AddressOne if there is no previous module', async () => {
  init({ provider, network: 5 });
  jest.spyOn(ethers, 'Contract').mockReturnValue({
    getModulesPaginated: jest.fn().mockResolvedValue({
      array: [
        '0x11e2d4c75b9803fF5d6DA8c30b354B44992E0248',
        '0x96F983d0B84ecFf01C34991C3718Ad35d520A825',
      ],
      next: '0x0000000000000000000000000000000000000001',
    }),
  });
  expect(
    await getPreviousModule(
      '0x81CC4c1411044C09b7a888Af225176fac87A5CE3',
      '0x11e2d4c75b9803fF5d6DA8c30b354B44992E0248',
    ),
  ).toEqual('0x0000000000000000000000000000000000000001');
});
