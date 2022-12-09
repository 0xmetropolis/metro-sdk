import { ethers } from 'ethers';
import { init, config } from '../src';
import { infuraKey } from '../env.json';

const provider = new ethers.providers.InfuraProvider('mainnet', {
  infura: infuraKey,
});

test('init should throw if it receives something other than 1 or 5', async () => {
  expect(() => {
    init({ provider, network: 4 });
  }).toThrow();
});

describe('subgraph URLs', () => {
  test('mainnet URL', () => {
    init({ provider, network: 1 });
    expect(config.subgraphUrl).toBe(
      'https://gateway.thegraph.com/api/50ba04ffb3711883f1fd80df4f93242b/subgraphs/id/0x3f4e2cfe11aa607570e0aee7ac74fbff9633fa8e-0',
    );
  });

  test('Should not be able to override mainnet URL', () => {
    expect(() => {
      init({ provider, network: 1, subgraphUrl: 'testvalue' });
    }).toThrow('Can only override subgraphUrl for testnet');
    expect(config.subgraphUrl).toBe(
      'https://gateway.thegraph.com/api/50ba04ffb3711883f1fd80df4f93242b/subgraphs/id/0x3f4e2cfe11aa607570e0aee7ac74fbff9633fa8e-0',
    );
  });

  test('testnet init', () => {
    init({ provider, network: 5 });
    expect(config.subgraphUrl).toBe(
      'https://api.thegraph.com/subgraphs/name/orcaprotocol/goerli-pods',
    );
  });

  test('Testnet override', () => {
    init({ provider, network: 5, subgraphUrl: 'testvalue' });
    expect(config.subgraphUrl).toBe('testvalue');
  });
});
