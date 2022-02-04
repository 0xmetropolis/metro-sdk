import { ethers } from 'ethers';
import { getDeployment, getControllerByAddress } from '@orcaprotocol/contracts';
import ENS, { getEnsAddress } from '@ensdomains/ensjs';
import { config } from './config';

/**
 * Returns Controller, ENS Name and pod ID for a given pod address.
 * @param address Pod address
 */
export async function getPodFetchersByAddress(address: string): Promise<{
  podId: number;
  safe: string;
  Controller: ethers.Contract;
  Name: ENS.Name;
}> {
  const { provider, network } = config;
  const ens = new ENS({ provider, ensAddress: getEnsAddress(network) });

  // `name` is the literal ens name.
  // `Name` is the interface used to perform lookups on ENS
  const { name } = await ens.getName(address);
  if (!name) throw new Error('Address did not have an ENS name');
  const Name = ens.name(name);

  const podId = await Name.getText('podId');
  if (!podId) throw new Error('No podId on ENS found');

  // Member token tracks Controller for a given pod ID
  const memberTokenDeployment = getDeployment('MemberToken', network);
  const MemberToken = new ethers.Contract(
    memberTokenDeployment.address,
    memberTokenDeployment.abi,
    provider,
  );

  const controllerAddress = await MemberToken.memberController(podId);

  const controllerDeployment = getControllerByAddress(controllerAddress, network);
  return {
    podId: parseInt(podId, 10),
    safe: address,
    Controller: new ethers.Contract(
      controllerDeployment.address,
      controllerDeployment.abi,
      provider,
    ),
    Name,
  };
}

/**
 * Returns Controller, ENS Name and pod ID for a given pod id
 * @param id - pod ID
 */
export async function getPodFetchersById(id: number): Promise<{
  podId: number;
  safe: string;
  Controller: ethers.Contract;
  Name: ENS.Name;
}> {
  const { provider, network } = config;
  const ens = new ENS({ provider, ensAddress: getEnsAddress(network) }); // Member token tracks Controller for a given pod ID

  const memberTokenDeployment = getDeployment('MemberToken', network);
  const MemberToken = new ethers.Contract(
    memberTokenDeployment.address,
    memberTokenDeployment.abi,
    provider,
  );
  const controllerAddress = await MemberToken.memberController(id);
  if (controllerAddress === ethers.constants.AddressZero) {
    throw new Error('Pod ID was not registered on Controller');
  }

  const controllerDeployment = getControllerByAddress(controllerAddress, network);
  const Controller = new ethers.Contract(
    controllerDeployment.address,
    controllerDeployment.abi,
    provider,
  );

  const safe = await Controller.podIdToSafe(id);
  const { name } = await ens.getName(safe);
  if (!name) throw new Error('Address did not have an ENS name');
  const Name = ens.name(name);

  return {
    podId: id,
    safe,
    Controller,
    Name,
  };
}
