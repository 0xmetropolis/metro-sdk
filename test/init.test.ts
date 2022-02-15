import { ethers } from 'ethers';
import { init, config } from '../src';

const provider = new ethers.providers.InfuraProvider('mainnet', {
  infura: '69ecf3b10bc24c6a972972666fe950c8',
});

test('init should throw if it receives something other than 1 or 4', async () => {
  expect(() => {
    init({ provider, network: 5 });
  }).toThrow();
});

describe('subgraph URLs', () => {
  test('mainnet URL', () => {
    init({ provider, network: 1 });
    expect(config.subgraphUrl).toBe(
      'https://gateway.thegraph.com/api/50ba04ffb3711883f1fd80df4f93242b/subgraphs/id/0x3f4e2cfe11aa607570e0aee7ac74fbff9633fa8e-0',
    );
  });

  test('rinkeby URL', () => {
    init({ provider, network: 4 });
    expect(config.subgraphUrl).toBe('https://api.studio.thegraph.com/query/3720/orca-1/v0.1.0');
  });

  test('override', () => {
    init({ provider, network: 4, subgraphUrl: 'testvalue' });
    expect(config.subgraphUrl).toBe('testvalue');
  });
});
