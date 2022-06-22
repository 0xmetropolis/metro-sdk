import { ethers } from 'ethers';
import { getDeployment } from '@orcaprotocol/contracts';
import { labelhash } from '@ensdomains/ensjs';
import { config } from './config';
import { createPods } from './temp';

function createAddressPointer(number) {
  const cutLength = String(number).length;
  return ethers.constants.AddressZero.slice(0, 42 - cutLength) + number;
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
  pods.forEach((pod, index) => {
    // Check if any of the members are labels.
    members.push(
      pod.members.map(member => {
        // If a member is not an eth address it (should) be a label.
        if (!ethers.utils.isAddress(member)) {
          const childPodIndex = pods.findIndex(findPod => findPod.label === member);
          if (childPodIndex < 0) throw new Error(`No pod had the label of ${member}`);
          if (childPodIndex < index) throw new Error('Pod member cannot reference earlier pod');
          return createAddressPointer(childPodIndex);
        }
        return member;
      }),
    );
    if (!ethers.utils.isAddress(pod.admin)) {
      if (!pod.admin) admins.push(ethers.constants.AddressZero);
      else {
        const adminPodIndex = pods.findIndex(findPod => findPod.label === pod.admin);
        if (adminPodIndex < 0) throw new Error(`No pod had the label of ${pod.admin}`);
        if (adminPodIndex > index) throw new Error('Pod admin cannot reference later pods');
        admins.push(createAddressPointer(adminPodIndex));
      }
    } else {
      // It's just an eth address, so we can push.
      admins.push(pod.admin);
    }

    thresholds.push(pod.threshold);
    labels.push(labelhash(pod.label));
    ensNames.push(`${pod.label}.pod.xyz`);

    const baseUrl = `https://orcaprotocol-nft.vercel.app${
      config.network === 4 ? '/assets/testnet/' : '/assets/'
    }`;
    const imageUrl = `${baseUrl}${nextPodId.toString(16).padStart(64, '0')}-image`;
    nextPodId += 1;
    imageUrls.push(imageUrl);
  });
  await createPods(Controller.address, members, thresholds, admins, labels, ensNames, imageUrls);
}
