import { ethers } from 'ethers';
import { userAddress } from './fixtures';
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
