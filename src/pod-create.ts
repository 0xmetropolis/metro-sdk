import { ethers } from 'ethers';
import { getDeployment, getControllerByAddress } from '@orcaprotocol/contracts';
import { labelhash } from '@ensdomains/ensjs';
import { config } from './config';
import { encodeFunctionData, getMetropolisContract, handleEthersError } from './lib/utils';
import { getSafeInfo, approveSafeTransaction } from './lib/services/transaction-service';
import { createSafeTransaction } from './lib/services/create-safe-transaction';

function createAddressPointer(number) {
  const cutLength = String(number).length;
  return ethers.constants.AddressZero.slice(0, 42 - cutLength) + number;
}

function getImageUrl(nextPodId: number) {
  const baseUrl = `https://orcaprotocol-nft.vercel.app${
    config.network === 4 ? '/assets/testnet/' : '/assets/'
  }`;
  return `${baseUrl}${nextPodId.toString(16).padStart(64, '0')}-image`;
}

/**
 * Creates a safe and podifies it.
 * If a signer is not provided, instead it returns an unsigned transaction.
 * @param args.members - Array of pod member addresses
 * @param args.threshold - Voting threshold
 * @param args.admin - Optional pod admin
 * @param args.name - ENS label for safe, i.e., 'orca-core'. Do not add the pod.eth/pod.xyz suffix
 * @param signer - Optional signer
 */
export async function createPod(
  args: {
    members: Array<string>;
    threshold: number;
    admin?: string;
    name: string;
  },
  signer?: ethers.Signer,
): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> {
  // Checksum all addresses
  const members = args.members.map(ethers.utils.getAddress);
  const admin = args.admin ? ethers.utils.getAddress(args.admin) : ethers.constants.AddressZero;
  try {
    const MemberToken = getMetropolisContract('MemberToken', config.provider);
    const expectedPodId = (await MemberToken.getNextAvailablePodId()).toNumber();
    const Controller = getMetropolisContract('ControllerLatest', signer);
    if (signer)
      return Controller.createPod(
        members,
        args.threshold,
        admin,
        labelhash(args.name),
        `${args.name}.${config.network === 1 ? 'pod.xyz' : 'pod.eth'}`,
        expectedPodId,
        getImageUrl(expectedPodId),
      );
    return (await Controller.populateTransaction.createPod(
      members,
      args.threshold,
      admin,
      labelhash(args.name),
      `${args.name}.${config.network === 1 ? 'pod.xyz' : 'pod.eth'}`,
      expectedPodId,
      getImageUrl(expectedPodId),
    )) as { to: string; data: string };
  } catch (err) {
    return handleEthersError(err);
  }
}

/**
 * Returns the deployment of a controller from a safe's modules, if it exists, otherwise returns null.
 * @param safeOrModules - safe address or list of modules
 * @returns bool
 */
export async function getControllerFromModules(safeOrModules: string | string[]) {
  let modules;
  if (typeof safeOrModules === 'string') {
    ({ modules } = await getSafeInfo(safeOrModules));
  } else {
    modules = safeOrModules;
  }

  let controller = null;
  modules.forEach(module => {
    try {
      // This throws if the address does not match a Controller deployment.
      controller = getControllerByAddress(module, config.network);
      // If the above didn't throw, then we've found an Orca module.
    } catch {
      // do nothing
    }
  });
  return controller;
}

/**
 * Creates a SafeTx on a safe to enable the latest Controller as a module.
 *
 * @param safe - Safe address
 * @param signer
 * @throws If a Controller module is already enabled. If you are attempting to upgrade versions, use `Pod.migratePodToLatest`.
 */
export async function enableController(safe: string, signer: ethers.Signer) {
  const sender = await signer.getAddress();
  // Check to see if signer is safe member
  const { owners, modules } = await getSafeInfo(safe);
  if (!owners.includes(sender)) throw new Error('Sender was not safe owner');

  if (await getControllerFromModules(modules))
    throw new Error(
      "Pod module was already enabled. If you're trying to upgrade versions, use `Pod.migratePodToLatest` instead",
    );

  const { address: latestModule } = getDeployment('ControllerLatest', config.network);

  let safeTx;
  try {
    safeTx = await createSafeTransaction({
      sender,
      safe,
      to: safe,
      data: encodeFunctionData('GnosisSafe', 'enableModule', [latestModule]),
    });
  } catch (err) {
    if (err.response?.data.message === 'Gas estimation failed') {
      throw new Error('Gas estimation failed (this is often a revert error)');
    }
    throw err;
  }
  await approveSafeTransaction(safeTx, signer);
}

/**
 * Adds a Gnosis Safe to the pod ecosystem.
 * If a signer is not provided, it instead returns the unsigned transaction.
 * @param args.admin - Optional address of admin
 * @param args.name - ENS label for safe, i.e., 'orca-core'. Do not add the pod.eth/pod.xyz suffix
 * @param args.safe - Safe address
 * @param signer - Signer of a safe owner.
 * @throws - If Controller module was not enabled
 * @throws - If signer is not a safe owner
 * @returns
 */
export async function podifySafe(
  args: {
    admin?: string;
    name: string;
    safe: string;
  },
  signer?: ethers.Signer,
): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> {
  const { owners, modules } = await getSafeInfo(args.safe);
  if (signer && !owners.includes(await signer.getAddress()))
    throw new Error('Sender was not safe owner');

  const controllerDeployment = await getControllerFromModules(modules);
  if (!controllerDeployment) throw new Error('Pod module was not enabled');
  const Controller = new ethers.Contract(
    controllerDeployment.address,
    controllerDeployment.abi,
    signer || config.provider,
  );
  // Checksum all addresses
  const admin = args.admin ? ethers.utils.getAddress(args.admin) : ethers.constants.AddressZero;
  try {
    const MemberToken = getMetropolisContract('MemberToken', config.provider);
    const expectedPodId = (await MemberToken.getNextAvailablePodId()).toString();
    if (signer)
      return Controller.createPodWithSafe(
        admin,
        args.safe,
        labelhash(args.name),
        `${args.name}.${config.network === 1 ? 'pod.xyz' : 'pod.eth'}`,
        expectedPodId,
        getImageUrl(expectedPodId),
      );
    return (await Controller.populateTransaction.createPodWithSafe(
      admin,
      args.safe,
      labelhash(args.name),
      `${args.name}.${config.network === 1 ? 'pod.xyz' : 'pod.eth'}`,
      expectedPodId,
      getImageUrl(expectedPodId),
    )) as { to: string; data: string };
  } catch (err) {
    return handleEthersError(err);
  }
}

/**
 * Creates multiple pods simultaneously.
 *
 * Each pod requires an array of members, a threshold and label, with an optional admin.
 * Members or admins can be other pods in this create action.
 *
 * Pods can be added as members of other pods using labels,
 * but only with pods earlier up in the array.
 * I.e., the second pod in the array can have the first pod in the array as a member or admin,
 * but the first pod cannot have the second pod as a member.
 *
 * The label replacement does not (currently) work with already existing pods.
 *
 * An example:
 * ```
 *  [
 *   {
 *     label: 'orcanauts',
 *     // This will add the below pods as sub pods to this newly created one.
 *     members: ['art-nauts', 'gov-nauts'],
 *     threshold: 1,
 *   },
 *   {
 *     label: 'art-nauts',
 *     members: ['0x1234...', '0x2345...'],
 *     threshold: 1,
 *   },
 *   {
 *     label: 'gov-nauts',
 *     members: ['0x3456...', '0x4567...'],
 *     threshold: 1,
 *     // This will add the above 'orcanauts' pod as the admin to this new pod.
 *     admin: 'orcanauts',
 *   }
 * ]
 * ```
 * @param pods
 */
// eslint-disable-next-line import/prefer-default-export
export async function multiPodCreate(
  pods: Array<{
    members: string[];
    threshold: number;
    admin?: string;
    label: string;
  }>,
  signer: ethers.Signer,
) {
  if (!config.network || !config.provider) {
    throw new Error('Network/provider was not defined. Did you init the SDK?');
  }
  const Controller = getDeployment('ControllerLatest', config.network);
  const memberTokenDeployment = getDeployment('MemberToken', config.network);
  const MemberToken = new ethers.Contract(
    memberTokenDeployment.address,
    memberTokenDeployment.abi,
    config.provider,
  );
  let nextPodId = (await MemberToken.getNextAvailablePodId()).toNumber();

  const members = [];
  const thresholds = [];
  const admins = [];
  const labels = [];
  const ensNames = [];
  const imageUrls = [];

  // The smart contract expects basically the reverse of what our SDK expects.
  pods.reverse().forEach(pod => {
    // Check if any of the members are labels.
    members.push(
      pod.members.map(member => {
        // If a member is not an eth address it (should) be a label.
        if (!ethers.utils.isAddress(member)) {
          const childPodIndex = pods.findIndex(findPod => findPod.label === member);
          if (childPodIndex < 0) throw new Error(`No pod had the label of ${member}`);
          // We start the member array indexing at 1 because address 0 is reserved on the smart contract.
          return createAddressPointer(childPodIndex + 1);
        }
        return member;
      }),
    );
    if (!ethers.utils.isAddress(pod.admin)) {
      if (!pod.admin) admins.push(ethers.constants.AddressZero);
      else {
        const adminPodIndex = pods.findIndex(findPod => findPod.label === pod.admin);
        if (adminPodIndex < 0) throw new Error(`No pod had the label of ${pod.admin}`);
        // We start the admin array indexing at 1, because address zero is reserved for the no-admin case.
        admins.push(createAddressPointer(adminPodIndex + 1));
      }
    } else {
      // It's just an eth address, so we can push.
      admins.push(pod.admin);
    }

    thresholds.push(pod.threshold);
    labels.push(labelhash(pod.label));
    ensNames.push(`${pod.label}.pod.xyz`);

    imageUrls.push(getImageUrl(nextPodId));
    nextPodId += 1;
  });
  const multiCreateDeployment = getDeployment('MultiCreateV1', config.network);
  const MultiCreate = new ethers.Contract(
    multiCreateDeployment.address,
    multiCreateDeployment.abi,
    signer,
  );

  return MultiCreate.createPods(
    Controller.address,
    members,
    thresholds,
    admins,
    labels,
    ensNames,
    // We generate these independently of the incoming pods array, so it has to be manually reversed.
    imageUrls.reverse(),
  );
}
