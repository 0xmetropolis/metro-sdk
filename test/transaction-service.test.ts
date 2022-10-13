import { erc20TransferTransaction, getSafeTransactionFixture } from './fixtures';
import * as utils from '../src/lib/utils';
import * as etherscan from '../src/lib/services/etherscan';
import * as txService from '../src/lib/services/transaction-service';
import { populateDataDecoded, getSafeTxHash } from '../src/lib/services/transaction-service';
import { getNextNonce } from '../src/lib/services/create-safe-transaction';
import { userAddress } from '../test/fixtures';
import { init } from '../src/config';
import axios from 'axios';
import { ethers } from 'ethers';

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

describe('getSafeTxHash', () => {
  const provider = new ethers.providers.InfuraProvider('goerli', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  init({ provider, network: 5 });

  test('given a transaction, returns a contract transaction hash', async () => {
    let safeTx = getSafeTransactionFixture('queued')[0];

    const mockGetSafeTransactionHash = jest
      .fn()
      .mockResolvedValueOnce('0x67ce671d9bdb9abe31ad3fe521176ff8ccdea5b87c392c609ce425257fcea6a4');
    jest.spyOn(utils, 'getGnosisSafeContract').mockReturnValueOnce({
      getTransactionHash: mockGetSafeTransactionHash,
    });

    const expectedHash = safeTx.safeTxHash;
    delete safeTx.safeTxHash; // Gnosis expects this to be nil

    const safeTxHash = await getSafeTxHash(safeTx);

    expect(safeTxHash).toBe(expectedHash);
  });
});

describe('getNextNonce', () => {
  test('getNextNonce sets nonce to 0 for a safes first tx', async () => {
    jest.spyOn(txService, 'getSafeTransactionsBySafe').mockResolvedValueOnce([]);

    const nonce = await getNextNonce(userAddress);

    expect(nonce).toBe(0);
  });

  test('getNextNonce increments nonce if transactions already exist', async () => {
    jest.spyOn(txService, 'getSafeTransactionsBySafe').mockResolvedValueOnce([
      {
        safe: '0xdab0d648a2a771e6952916A822dddf738b535f5A',
        to: '0x0762aA185b6ed2dCA77945Ebe92De705e0C37AE3',
        value: '0',
        data: '0x94d008ef0000000000000000000000006a32518ef8ef6fa177cc69a0bfab18c5374983860000000000000000000000000000000000000000000000000000000000000013000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000',
        operation: 0,
        gasToken: null,
        safeTxGas: 174942,
        baseGas: 0,
        gasPrice: '0',
        refundReceiver: null,
        nonce: 2,
        executionDate: null,
        submissionDate: '2022-05-07T21:55:37.240315Z',
        modified: '2022-05-07T21:55:39.264922Z',
        blockNumber: null,
        transactionHash: null,
        safeTxHash: '0xab802d2eb1c15d9c2a3fda0239d4be2bc333e533a5a7b104d8e92940f8a54c78',
        executor: null,
        isExecuted: false,
        isSuccessful: null,
        ethGasPrice: null,
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        gasUsed: null,
        fee: null,
        origin: null,
        dataDecoded: {
          method: 'mint',
          parameters: [
            {
              name: '_account',
              type: 'address',
              value: '0x6A32518eF8eF6fa177cC69a0BFab18c537498386',
            },
            {
              name: '_id',
              type: 'uint256',
              value: '19',
            },
            {
              name: 'data',
              type: 'bytes',
              value: '0x0000000000000000000000000000000000000000000000000000000000000000',
            },
          ],
        },
        confirmationsRequired: null,
        confirmations: [
          {
            owner: '0xcb42Ac441fCade3935243Ea118701f39AA004486',
            submissionDate: '2022-05-07T21:55:39.264922Z',
            transactionHash: null,
            signature:
              '0x9536655786438fef5befc73529290f61db7fd5028c0ce702e54046a9db41c6dc6900417f006722c8edcc6c5956dd7d32e37e1c14cb2acdef7f3dfd74ca56ff6d20',
            signatureType: 'ETH_SIGN',
          },
        ],
        trusted: true,
        signatures: null,
        transfers: [],
        txType: 'MULTISIG_TRANSACTION',
      },
    ]);

    const nonce = await getNextNonce(userAddress);

    expect(nonce).toBe(3);
  });
});
