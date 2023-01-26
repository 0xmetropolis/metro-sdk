import { ethers } from 'ethers';
import { getDeployment, getControllerByAddress } from '@orcaprotocol/contracts';
import ENS from '@ensdomains/ensjs';
import EthersAdapter from '@safe-global/safe-ethers-lib';
import SafeSdk from '@safe-global/safe-core-sdk';
import getEns from './lib/services/ens';
import { config } from './config';
import { getGnosisSafeContract } from './lib/utils';

/**
 * Returns Controller address for a given pod ID
 * @param podId
 * @returns controllerAddress
 */
async function getControllerAddressByPodId(podId) {
  const { network, multicall } = config;

  // Member token tracks Controller for a given pod ID
  const memberTokenDeployment = getDeployment('MemberToken', network);
  const MemberToken = new ethers.Contract(
    memberTokenDeployment.address,
    memberTokenDeployment.abi,
    multicall,
  );

  return MemberToken.memberController(podId);
}

/**
 * Returns Controller address for a given pod address
 * @param address
 * @returns controllerAddress
 */
async function getControllerAddressByPodAddress(address) {
  const { multicall } = config;

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: multicall,
  });
  let safeSdk;
  try {
    // will fail if address is not a safe
    safeSdk = await SafeSdk.create({
      ethAdapter,
      safeAddress: address,
    });
  } catch (err) {
    throw new Error('Address is not a safe');
  }
  return safeSdk.getGuard();
}

/**
 * Returns Controller, ENS Name and pod ID for a given pod address.
 * @param address Pod address
 */
export async function getPodFetchersByAddressOrEns(identifier: string): Promise<{
  podId: number;
  Safe: ethers.Contract;
  Controller: ethers.Contract;
  Name: ENS.Name;
}> {
  const { network, multicall } = config;

  let address;
  // Name is the interface used to perform lookups on ENS
  let Name;
  const ens = getEns();

  try {
    // Handle addresses
    address = ethers.utils.getAddress(identifier);

    // `name` is the literal ens name.
    const { name } = await ens.getName(address);
    if (!name) throw new Error('Address did not have an ENS name');
    Name = ens.name(name);
  } catch (err) {
    // Might be ENS name instead of address
    // If so, resolve it. The getText below will throw if it's not a valid pod.
    Name = ens.name(identifier);
    address = await multicall.resolveName(Name.name);
  }

  let podId = await Name.getText('podId');
  let controllerAddress;

  if (podId) {
    controllerAddress = await getControllerAddressByPodId(podId);
  } else {
    // fallback checker for pods without .pod ENS names
    controllerAddress = await getControllerAddressByPodAddress(address);
  }

  let controllerDeployment;

  try {
    // we can not guarantee that the controller adddress is a valid controller
    controllerDeployment = getControllerByAddress(controllerAddress, network);
  } catch (err) {
    throw new Error('Address is not a pod');
  }

  const Controller = new ethers.Contract(
    controllerDeployment.address,
    controllerDeployment.abi,
    multicall,
  );

  if (!podId) {
    // if we don't have a podId, we need to fetch it from the controller
    podId = await Controller.safeToPodId(address);
  }

  const Safe = getGnosisSafeContract(address, multicall);

  return {
    podId: parseInt(podId, 10),
    Controller,
    Name,
    Safe,
  };
}

/**
 * Returns Controller, ENS Name and pod ID for a given pod id
 * @param id - pod ID
 */
export async function getPodFetchersById(id: number): Promise<{
  podId: number;
  Safe: ethers.Contract;
  Controller: ethers.Contract;
  Name: ENS.Name;
}> {
  const { network, multicall } = config;
  const ens = getEns();

  const memberTokenDeployment = getDeployment('MemberToken', network);
  const MemberToken = new ethers.Contract(
    memberTokenDeployment.address,
    memberTokenDeployment.abi,
    multicall,
  );
  const controllerAddress = await MemberToken.memberController(id);
  if (controllerAddress === ethers.constants.AddressZero) {
    throw new Error('Pod ID was not registered on Controller');
  }

  const controllerDeployment = getControllerByAddress(controllerAddress, network);
  const Controller = new ethers.Contract(
    controllerDeployment.address,
    controllerDeployment.abi,
    multicall,
  );

  const safe = await Controller.podIdToSafe(id);
  const { name } = await ens.getName(safe);
  if (!name) throw new Error('Address did not have an ENS name');
  const Name = ens.name(name);

  const Safe = getGnosisSafeContract(safe, multicall);

  return {
    podId: id,
    Safe,
    Controller,
    Name,
  };
}
