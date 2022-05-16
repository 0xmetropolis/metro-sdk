import { ethers } from 'ethers';
import { userAddress, constructGqlGetUsers, gqlGetUsers } from './fixtures';
import { encodeFunctionData } from '../src/lib/utils';

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
