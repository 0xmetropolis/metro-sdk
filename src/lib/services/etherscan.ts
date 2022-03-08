import axios from 'axios';
import { config } from '../../config';

/**
 *  Fetches contract ABI from etherscan, if one exists.
 * @param address - Contract address
 * @returns ABI|null
 */
// eslint-disable-next-line import/prefer-default-export
export async function lookupContractAbi(address: string): Promise<
  | {
      constant: boolean;
      inputs: { name: string; type: string }[];
      name: string;
      outputs: { name: string; type: string }[];
      payable: boolean;
      stateMutability: string;
      type: string;
    }[]
  | null
> {
  const { data } = await axios({
    url: `${config.etherscanUrl}`,
    method: 'get',
    params: {
      module: 'contract',
      action: 'getabi',
      address,
      apikey: config.etherscanApiKey,
    },
  });

  if (data.result === 'Contract source code not verified') return null;
  if (data.result === 'Max rate limit reached') {
    return null;
  }

  return JSON.parse(data.result);
}
