import ENS, { getEnsAddress } from '@ensdomains/ensjs';
import { config } from '../../config';

let ens;

const getEns = () => {
  if (!ens) {
    const { multicall, network } = config;
    ens = new ENS({ provider: multicall, ensAddress: getEnsAddress(network) });
  }
  return ens;
};

export default getEns;
