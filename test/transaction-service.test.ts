import { erc20TransferTransaction } from './fixtures';
import * as etherscan from '../src/lib/services/etherscan';
import { populateDataDecoded } from '../src/lib/services/transaction-service';

test('populateDataDecoded should be able to decode an erc20 transfer function', async () => {
  const { dataDecoded } = erc20TransferTransaction;

  const safeTransactionDataERC20 = {
    ...erc20TransferTransaction,
    dataDecoded: null,
    sender: '0x0',
  };

  jest.spyOn(etherscan, 'lookupContractAbi').mockResolvedValue([
    {
      constant: false,
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
      name: 'transfer',
      outputs: [{ name: 'success', type: 'bool' }],
      payable: false,
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ]);

  const { dataDecoded: dataDecodedPopulated } = await populateDataDecoded(safeTransactionDataERC20);

  expect(dataDecodedPopulated).toMatchObject(dataDecoded);
});
