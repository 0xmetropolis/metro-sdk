import { ethers } from 'ethers';
import { providers } from '@0xsequence/multicall';

/**
 * The config object.
 * This object should not be manipulated directly, and is exported mostly for debug purposes.
 */
export const config = {
  provider: null,
  multicall: null,
  network: null,
  subgraphUrl: null,
  gnosisUrl: null,
  etherscanUrl: null,
  etherscanApiKey: null,
};

/**
 * Initializes the SDK. This should be called on app startup.
 * @param input.network - Network ID. Currently supporting Mainnet (id 1) and Goerli (id 5)
 * @param input.subgraphUrl - Optional override for development/debug purposes.
 */
export function init(input: {
  provider: ethers.providers.Provider;
  network: number;
  subgraphUrl?: string;
}) {
  const { provider, network, subgraphUrl } = input;
  config.network = network;

  // Only accept 1 or 4 for network values.
  if (!(network === 1 || network === 5)) {
    throw new Error('Network can only be 1 or 5 (mainnet or goerli)');
  }

  if (subgraphUrl) {
    if (network !== 5) throw new Error('Can only override subgraphUrl for testnet');
    config.subgraphUrl = subgraphUrl;
  } else if (network === 1) {
    config.subgraphUrl =
      'https://gateway.thegraph.com/api/50ba04ffb3711883f1fd80df4f93242b/subgraphs/id/0x3f4e2cfe11aa607570e0aee7ac74fbff9633fa8e-0';
  } else if (network === 5) {
    config.subgraphUrl = 'https://api.thegraph.com/subgraphs/name/orcaprotocol/pod-members';
  }

  config.provider = provider;
  try {
    config.provider.getSigner();
  } catch (err) {
    // Workaround for signer-less providers for ens.js
    if (err.message.includes('does not support signing')) {
      config.provider.getSigner = () => {};
    }
  }
  config.multicall = new providers.MulticallProvider(provider);
  // Support ens.js
  config.multicall.getSigner = () => {};

  config.gnosisUrl =
    network === 1
      ? 'https://safe-transaction.gnosis.io/api/v1'
      : 'https://safe-transaction.goerli.gnosis.io/api/v1';

  config.etherscanUrl =
    network === 1 ? 'https://api.etherscan.io/api' : 'https://api.goerli.etherscan.io/api';

  config.etherscanApiKey = '2WNX6IRB7FI49FW9BPY2W8YE5XGBCDQCRB';
}
