import { ethers } from 'ethers';

export const config = {
  provider: null,
  network: null,
  subgraphUrl: null,
};

export function init({
  provider,
  network,
  subgraphUrl,
}: {
  provider: ethers.providers.Provider;
  network: number;
  subgraphUrl?: string;
}) {
  // Only accept 1 or 4 for network values.
  if (!(network === 1 || network === 4)) {
    throw new Error('Network can only be 1 or 4 (mainnet or rinkeby)');
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

  config.network = network;
  if (subgraphUrl) {
    config.subgraphUrl = subgraphUrl;
  } else {
    config.subgraphUrl =
      network === 1
        ? 'https://gateway.thegraph.com/api/50ba04ffb3711883f1fd80df4f93242b/subgraphs/id/0x3f4e2cfe11aa607570e0aee7ac74fbff9633fa8e-0'
        : 'https://api.studio.thegraph.com/query/3720/orca-1/v0.1.0';
  }
}
