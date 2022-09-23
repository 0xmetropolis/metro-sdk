import { ethers } from 'ethers';
import { getDeployment } from '@orcaprotocol/contracts';
// These fetch the rinkeby deployments, but we just need the ABIs so it's irrelevant where we're fetching from.
import MemberToken from '@orcaprotocol/contracts/deployments/rinkeby/MemberToken.json';
import { getSafeSingletonDeployment } from '@gnosis.pm/safe-deployments';
import { config } from '../config';

const GnosisSafe = getSafeSingletonDeployment({ version: '1.3.0' });

// Mapping contractNames to JSONs
const contractJsons = {
  MemberToken,
  GnosisSafe,
};

/**
 * Returns Orca related contract instance
 * @param contractName
 * @param signer
 * @returns
 */
export function getMetropolisContract(
  contractName: string,
  signer: ethers.Signer,
): ethers.Contract {
  const contractJson = getDeployment(contractName, config.network);
  if (!contractJson) throw new RangeError(`Contract ABI could not be found for ${contractName}`);
  return new ethers.Contract(contractJson.address, contractJson.abi, signer);
}

export function getGnosisSafeContract(safeAddress: string, signer: ethers.Signer) {
  return new ethers.Contract(safeAddress, GnosisSafe.abi, signer);
}

/**
 * Checks to see if an address is valid (checksum or not)
 * @param address
 * @returns
 */
export function checkAddress(address: string) {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    throw new TypeError(`Invalid address provided: ${address}`);
  }
}

/**
 * Handles ethers errors, as they have non-standard error formats.
 * @param error
 */
export const handleEthersError = error => {
  if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    throw new Error(error.error.message);
  } else {
    throw new Error(error.message);
  }
};

/**
 * Given contracts that we support, returns the encoded function data
 * @param contractName Name of contract, i.e., "ERC20". You can also use "IERC20" when relevant
 * @param functionName Name of function as it appears on the ABI, i.e., 'transfer'
 * @param args Args of function in an array.
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function encodeFunctionData(contractName: string, functionName: string, args: Array<any>) {
  const contractJson = contractJsons[contractName];
  if (!contractJson) throw new RangeError(`Contract ABI could not be found for ${contractName}`);
  return new ethers.utils.Interface(contractJson.abi).encodeFunctionData(functionName, args);
}

/**
 * Signs a message using ethers wallet and a local private key.
 * @param contractTransactionHash - Generated safe's transaction hash in the format of 0x...
 * @param signer
 * @returns Signed message based on private key.
 */
export async function signMessage(contractTransactionHash: string, signer: ethers.Signer) {
  const signedMessage = await signer.signMessage(ethers.utils.arrayify(contractTransactionHash));
  // Reference: https://github.com/gnosis/safe-contracts/blob/main/src/utils/execution.ts#L102
  return signedMessage.replace(/1b$/, '1f').replace(/1c$/, '20');
}

/**
 * Gets the previous module from a Gnosis safe
 * @param safe - Safe to scan through
 * @param module - Module you're looking for
 * @param newController - Optional, new controller you are trying to add. Checks to see if module is already on the safe.
 * @returns
 */
export async function getPreviousModule(safe, module, newController?: string) {
  const safeContract = new ethers.Contract(safe, GnosisSafe.abi, config.provider);
  const AddressOne = '0x0000000000000000000000000000000000000001';
  // TODO: figure out a better way to traverse the safes
  // I'm not sure why but in the SDK, this is nested in some strange object, hence the .array here vs the web version.
  const temp = await safeContract.getModulesPaginated(AddressOne, 10);
  // safeModules is in reverse chronological order,
  // i.e., the most recent module is safeModules[0]
  const safeModules = temp.array ? temp.array : temp;

  if (newController && safeModules.includes(ethers.utils.getAddress(newController)))
    throw new Error('Pod is already on latest version');

  const oldIndex = safeModules.indexOf(ethers.utils.getAddress(module));
  const previousModule =
    safeModules.length === 1 || oldIndex === 0 ? AddressOne : safeModules[oldIndex - 1];

  if (!previousModule) throw new Error('Error parsing old modules');

  return previousModule;
}
