import axios from 'axios';
import { ethers } from "ethers";
import { getDeployment, getControllerByAddress } from '@orcaprotocol/contracts';
import ENS, { getEnsAddress } from '@ensdomains/ensjs';
import { Pod } from "./Pod";

const config = {
  provider: null,
  network: null,
  subgraphUrl: 'https://gateway.thegraph.com/api/50ba04ffb3711883f1fd80df4f93242b/subgraphs/id/0x3f4e2cfe11aa607570e0aee7ac74fbff9633fa8e-0',
};

function init({ provider, network }) {
  config.provider = provider;
  config.network = network;
}

async function getPod(address: string): Promise<Pod> {
  return new Pod(address);
};

async function getUserPods(address: string): Promise<Pod[]> {
  const { data } = await axios.post(config.subgraphUrl, {
    query: `query GetUserPods($id: ID!) {
        user(id: $id) {
          pods {
            id
            pod {
              id
            }
          }
        }
      }`,
    variables: { id: address.toLowerCase() },
  });
  const { pods } = data.data.user || { pods: [] };
  // Remove GraphQL nested layer for UserPod
  const unsortedPods = pods.map(({ pod }) => parseInt(pod.id, 10));
  return Promise.all(unsortedPods.map(async pod => new Pod(pod)));
};

/**
 * Returns Controller, ENS Name and pod ID for a given pod address.
 * @param address Pod address
 */
async function getPodFetchersByAddress(address: string): Promise<{
  podId: number,
  safe: string,
  Controller: ethers.Contract,
  Name: ENS.Name
}> {
  const { provider, network } = config;
  const ens = new ENS({ provider: provider, ensAddress: getEnsAddress(network)});

  // `name` is the literal ens name.
  // `Name` is the interface used to perform lookups on ENS
  const { name } = await ens.getName(address);
  if (!name) throw new Error('Address did not have an ENS name');
  const Name = ens.name(name);

  const podId = await Name.getText('podId');
  if (!podId) throw new Error('No podId on ENS found');

  // Member token tracks Controller for a given pod ID
  const memberTokenDeployment = getDeployment('MemberToken', network);
  const MemberToken = new ethers.Contract(memberTokenDeployment.address, memberTokenDeployment.abi, provider);

  const controllerAddress = await MemberToken.memberController(podId);

  const controllerDeployment = getControllerByAddress(controllerAddress, network);
  return {
    podId: parseInt(podId, 10),
    safe: address,
    Controller: new ethers.Contract(controllerDeployment.address, controllerDeployment.abi, provider),
    Name,
   }
}

/**
 * Returns Controller, ENS Name and pod ID for a given pod id
 * @param address Pod address
 */
 async function getPodFetchersById(id: number): Promise<{
  podId: number,
  safe: string,
  Controller: ethers.Contract,
  Name: ENS.Name
}> {
  const { provider, network } = config;
  const ens = new ENS({ provider: provider, ensAddress: getEnsAddress(network)});  // Member token tracks Controller for a given pod ID

  const memberTokenDeployment = getDeployment('MemberToken', network);
  const MemberToken = new ethers.Contract(memberTokenDeployment.address, memberTokenDeployment.abi, provider);
  const controllerAddress = await MemberToken.memberController(id);
  if (controllerAddress === ethers.constants.AddressZero) {
    throw new Error('Pod ID was not registered on Controller');
  }

  const controllerDeployment = getControllerByAddress(controllerAddress, network);
  const Controller = new ethers.Contract(controllerDeployment.address, controllerDeployment.abi, provider)

  const safe = await Controller.podIdToSafe(id);
  const { name } = await ens.getName(safe);
  if (!name) throw new Error('Address did not have an ENS name');
  const Name = ens.name(name);

  return {
    podId: id,
    safe,
    Controller,
    Name,
  }
}

export {
  config,
  init,
  getPod,
  getUserPods,
  getPodFetchersByAddress,
  getPodFetchersById,
}