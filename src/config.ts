export const config = {
  provider: null,
  network: null,
  subgraphUrl:
    'https://gateway.thegraph.com/api/50ba04ffb3711883f1fd80df4f93242b/subgraphs/id/0x3f4e2cfe11aa607570e0aee7ac74fbff9633fa8e-0',
};

export function init({ provider, network }) {
  config.provider = provider;
  config.network = network;
}
