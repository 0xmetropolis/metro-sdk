import { ethers } from 'ethers';
import axios from 'axios';
import ENS from '@ensdomains/ensjs';
import { getControllerByAddress, getDeployment } from '@orcaprotocol/contracts';
import { config } from './config';
import { getPodFetchersByAddressOrEns, getPodFetchersById } from './fetchers';
import {
  getContract,
  handleEthersError,
  encodeFunctionData,
  checkAddress,
  getPreviousModule,
} from './lib/utils';
import {
  createRejectTransaction,
  getSafeInfo,
  getSafeTransactionsBySafe,
  populateDataDecoded,
} from './lib/services/transaction-service';
import {
  createSafeTransaction,
  createNestedProposal,
} from './lib/services/create-safe-transaction';
import Proposal from './Proposal';

/**
 * The `Pod` object is the interface for fetching pod data.
 *
 * The Pod object should not be instantiated directly, use {@link getPod} instead.
 *
 * The following properties are on the object itself:
 *
 * ```js
 * const {
 *   id, // Pod ID
 *   safe, // Gnosis safe address, aka the Pod address
 *   ensName, // E.g., orcanauts.pod.xyz
 *   admin, // Address of pod admin
 *   imageUrl, // Source of NFT image
 *   imageNoTextUrl, // Source of NFT image without text (used for avatars)
 * } = await getPod();
 * ```
 *
 * Members, EOAs and member Pods can be fetched with the following functions:
 *
 * ```js
 * const pod = await getPod(podAddress);
 * // Fetches list of all members from the pod, as an array of Ethereum addresses.
 * // This includes any pods that may be members of the original pods.
 * const members = await pod.getMembers();
 *
 * // Fetches any member EOAs (externally owned accounts). That is, any member that is not a smart contract or pod.
 * const memberEOAs = await pod.getMemberEOAs();
 *
 * // Fetches Pod objects for any member pods.
 * const memberPods = await pod.getMemberPods();
 * ```
 *
 * You can also check if a user is a member, admin, or member of those pods with the following functions:
 *
 * ```js
 * const pod = await getPod(podAddress);
 *
 * const isMember = await pod.isMember(userAddress);
 * // Not an async function
 * const isAdmin = pod.isAdmin(userAddress);
 *
 * const isAdminPodMember = await pod.isAdminPodMember(userAddress);
 *
 * // Includes both pods and users as sub pod members.
 * const isSubPodMember = await pod.isSubPodMember(userAddress);
 * ```
 */
export default class Pod {
  /**
   *  Note this constructor should not be called directly. Use `getPod()` instead.
   * @param identifier Can be either podId or safe address
   */
  constructor(identifier: string | number) {
    const { network } = config;
    // This is a kind of hacky way to go about an async constructor.
    // It works, typescript just doesn't like it.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return (async () => {
      let podId: number;
      let safe: string;
      let Controller: ethers.Contract;
      let Name: ENS.Name;
      try {
        let fetchers;
        if (typeof identifier === 'string') {
          fetchers = await getPodFetchersByAddressOrEns(identifier);
        } else if (typeof identifier === 'number') {
          fetchers = await getPodFetchersById(identifier);
        }
        podId = fetchers.podId;
        safe = fetchers.safe;
        Controller = fetchers.Controller;
        Name = fetchers.Name;
      } catch (err) {
        if (err.message.includes('invalid address')) {
          throw new TypeError(`Non-address string passed to Pod constructor: '${identifier}'`);
        }
        return null;
      }

      const fetchedAdmin = await Controller.podAdmin(podId);
      this.controller = Controller.address;
      this.admin = fetchedAdmin === ethers.constants.AddressZero ? null : fetchedAdmin;
      this.id = podId;
      this.safe = safe;
      this.ensName = Name.name;

      const baseUrl = `https://orcaprotocol-nft.vercel.app${
        network === 4 ? '/assets/testnet/' : '/assets/'
      }`;
      const imageUrl = `${baseUrl}${podId.toString(16).padStart(64, '0')}-image`;
      const imageNoTextUrl = `${baseUrl}${podId.toString(16).padStart(64, '0')}-image-no-text`;

      this.imageUrl = imageUrl;
      this.imageNoTextUrl = imageNoTextUrl;
      return this;
    })();
  }

  // Address of Controller
  controller: string;

  /** @property Pod ID */
  id: number;

  /** @property Gnosis Safe address */
  safe: string;

  /** @property Number of votes required to pass a proposal */
  threshold: number;

  /** @property ENS name */
  ensName: string;

  /** @property Admin address */
  admin: string;

  /** @property Link to Pod NFT image */
  imageUrl: string;

  /** @property Link to Pod NFT image with no text */
  imageNoTextUrl: string;

  /**
   * @ignore
   * @property Array of members of pod.
   * Do not call this property directly, use `Pod.getMembers()` */
  members?: string[];

  /**
   * @ignore
   * @property Array of member EOAs
   * Do not call this property directly, use `Pod.getMemberEOAs()`
   */
  memberEOAs?: string[];

  /**
   * @ignore
   * @property Array of Pod objects for any member pods
   * Do not call this property directly, use `Pod.getMemberPods()`
   */
  memberPods?: Pod[];

  /**
   * Returns an array of Proposal objects in reverse chronological order. Defaults to returning 5,
   * which can be overridden by passing { limit: 10 } for example in the options.
   *
   * By default, the first Proposal will be the active proposal. Queued proposals can be fetched
   * by passing { queued: true } in the options. This will return all queued and active proposals (but not
   * executed proposals)
   *
   * @param options
   * @returns
   */
  getProposals = async (
    options: {
      queued?: boolean;
      limit?: number;
    } = {},
  ): Promise<Proposal[]> => {
    const { nonce, threshold } = await getSafeInfo(this.safe);
    this.threshold = threshold;
    const { limit = 5 } = options;

    // If looking for queued, then we need to only fetch current nonces.
    // TODO: This is not working as intended, or, uh idk. I'm not sure what intended should be here.
    const params = options.queued ? { nonce_gte: nonce, limit } : { limit };

    const safeTransactions = await Promise.all(
      (
        await getSafeTransactionsBySafe(this.safe, params)
      ).map(tx => {
        return populateDataDecoded({ ...tx, confirmationsRequired: threshold });
      }),
    );

    // All non-reject transactions
    const normalTransactions = [];
    // All the reject transactions, we need to combine this with the filtered transaction in the Proposal constructor.
    const rejectTransactions = [];
    // Sub proposal transactions need to be handled differently.
    const pairedSubTxs = {};

    safeTransactions.forEach(tx => {
      if (tx.data === null && tx.to === this.safe) {
        rejectTransactions.push(tx);
        return;
      }
      if (tx.dataDecoded?.method === 'approveHash') {
        // Pair approve/reject sub transactions together
        // Sub transactions always have an approve, but do not always have a reject
        if (Array.isArray(pairedSubTxs[tx.nonce])) {
          pairedSubTxs[tx.nonce].push(tx);
          return;
        }
        pairedSubTxs[tx.nonce] = [tx];
        return;
      }
      normalTransactions.push(tx);
    });
    const rejectNonces = rejectTransactions.map(tx => tx.nonce);

    const subProposals = Object.keys(pairedSubTxs).map(subTxNonce => {
      // subTxPair is an array of length 1 or 2, depending on if there's a reject or not
      const subTxPair = pairedSubTxs[subTxNonce];
      if (subTxPair.length === 1) {
        return new Proposal(this, nonce, subTxPair[0]);
      }
      // If the length is 2, that means there is a paired reject transaction.
      // The reject transaction is always created after the approve transaction
      // Because safeTx comes in reverse chron order, subTxPair[1] is the approve, [0] is the reject
      return new Proposal(this, nonce, subTxPair[1], subTxPair[0]);
    });

    const normalProposals = normalTransactions.map(tx => {
      // Check to see if there is a corresponding reject nonce.
      const rejectNonceIndex = rejectNonces.indexOf(tx.nonce);
      // If there is, we package that together with the regular transaction.
      if (rejectNonceIndex >= 0) {
        return new Proposal(this, nonce, tx, rejectTransactions[rejectNonceIndex]);
      }
      // Otherwise, just handle it normally.
      return new Proposal(this, nonce, tx);
    });

    return subProposals.concat(normalProposals).sort((a, b) => {
      // Sort in descending order/reverse chron based on nonce/id.
      return b.id - a.id;
    });
  };

  /**
   * Returns of list of all member addresses.
   * Members include member pods and member EOAs
   */
  getMembers = async (): Promise<string[]> => {
    const { subgraphUrl } = config;
    if (this.members) return this.members;
    const { data } = await axios.post(subgraphUrl, {
      query: `query GetPodUsers($id: ID!) {
            pod(id: $id) {
              users {
                user {
                  id
                }
              }
            }
          }`,
      variables: { id: this.id },
    });
    const { users } = data.data.pod || { users: [] };
    // Checksum all addresses.
    this.members = users.length > 0 ? users.map(user => ethers.utils.getAddress(user.user.id)) : [];
    return this.members;
  };

  /**
   * @ignore
   * Populates the memberEOAs and memberPods fields.
   * The process for fetching either of these fields is the same.
   */
  async populateMembers() {
    if (!this.members) await this.getMembers();

    const EOAs = [];
    const memberPods = (
      await Promise.all(
        this.members.map(async member => {
          const pod = await new Pod(member);
          // If pod is null, it's an EOA.
          if (!pod) {
            EOAs.push(member);
            return pod;
          }
          return pod;
        }),
      )
    ).filter(x => !!x); // Filter null values from memberPods.

    this.memberEOAs = EOAs;
    this.memberPods = memberPods;
  }

  /**
   * Returns list of all member EOAs, not including any smart contract/pod members.
   */
  getMemberEOAs = async (): Promise<string[]> => {
    if (this.memberEOAs) return this.memberEOAs;
    await this.populateMembers();
    return this.memberEOAs;
  };

  /**
   * Returns Pod objects of all member pods.
   */
  getMemberPods = async (): Promise<Pod[]> => {
    if (this.memberPods) return this.memberPods;
    await this.populateMembers();
    return this.memberPods;
  };

  /**
   * Checks if user is a member of this pod
   * @param address
   */
  isMember = async (address: string): Promise<boolean> => {
    const checkedAddress = checkAddress(address);
    if (!this.members) await this.getMembers();
    return this.members.includes(checkedAddress);
  };

  /**
   * Checks if user is admin of this pod
   * @param address
   */
  isAdmin = (address: string): boolean => {
    const checkedAddress = checkAddress(address);
    return checkedAddress === this.admin;
  };

  /**
   * Checks if given address is a member of the admin pod (if there is one)
   * Returns false if there is no admin pod.
   */
  isAdminPodMember = async (address: string): Promise<boolean> => {
    const checkedAddress = checkAddress(address);
    if (!this.admin) return false;
    const adminPod = await new Pod(this.admin);
    if (!adminPod) return false;
    return adminPod.isMember(checkedAddress);
  };

  /**
   * Checks if given address is a member of any subpods.
   *
   * Returns false if the user is a member of **this** pod, but not any sub pods
   *
   * @param address
   */
  isSubPodMember = async (address: string): Promise<boolean> => {
    const checkedAddress = checkAddress(address);
    if (!this.memberPods) await this.populateMembers();
    const results = await Promise.all(
      this.memberPods.map(async pod => {
        const members = await pod.getMembers();
        return members.includes(checkedAddress);
      }),
    );
    return results.includes(true);
  };

  /**
   * Mints member to this pod.
   * @throws if signer is not admin TODO
   */
  mintMember = async (
    newMember: string,
    signer: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse> => {
    checkAddress(newMember);
    try {
      return getContract('MemberToken', signer).mint(newMember, this.id, ethers.constants.HashZero);
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Burns member from this pod.
   * @throws If signer is not admin TODO
   */
  burnMember = async (
    memberToBurn: string,
    signer: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse> => {
    checkAddress(memberToBurn);
    try {
      return getContract('MemberToken', signer).burn(memberToBurn, this.id);
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Transfers a membership from the signer's account to the memberToTransferTo.
   *
   * @param addressToTransferTo - Address that will receive new membership
   * @param signer - Signer of the address that is giving up membership
   * @throws If addressToTransferTo is already a member TODO
   * @throws If signer is not admin TODO
   */
  transferMembership = async (addressToTransferTo: string, signer: ethers.Signer) => {
    const checkedAddress = checkAddress(addressToTransferTo);
    if (await this.isMember(checkedAddress)) {
      throw new Error(`Address ${checkedAddress} is already a member of this pod`);
    }

    const signerAddress = await signer.getAddress();
    if (!(await this.isMember(signerAddress))) {
      throw new Error(`Signer ${signerAddress} is not a member of this pod`);
    }

    try {
      return getContract('MemberToken', signer).safeTransferFrom(
        signerAddress,
        checkedAddress,
        this.id,
        1,
        ethers.constants.HashZero,
      );
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Transfers admin role from signer's account to addressToTransferTo
   * @param addressToTransferTo - Address that will receive admin role
   * @param signer - Signer of admin
   * @throws If signer is not admin
   */
  transferAdmin = async (addressToTransferTo: string, signer: ethers.Signer) => {
    const checkedAddress = checkAddress(addressToTransferTo);
    const signerAddress = await signer.getAddress();
    if (!this.isAdmin(signerAddress)) throw new Error('Signer was not the admin of this pod');

    const { abi: controllerAbi } = getControllerByAddress(this.controller, config.network);
    const Controller = new ethers.Contract(this.controller, controllerAbi, signer);

    try {
      return Controller.updatePodAdmin(this.id, checkedAddress);
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Creates a proposal to mint a member to this pod
   * @param newMember
   * @param signer - Signer of pod member
   * @throws If new member is part of this pod.
   * @throws If signer is not part of this pod. TODO
   */
  proposeMintMember = async (newMember: string, signer: ethers.Signer) => {
    checkAddress(newMember);
    if (await this.isMember(newMember)) {
      throw new Error(`Address ${newMember} is already in this pod`);
    }

    const data = encodeFunctionData('MemberToken', 'mint', [
      ethers.utils.getAddress(newMember),
      this.id,
      ethers.constants.HashZero,
    ]);

    const { address: memberTokenAddress } = getContract('MemberToken', signer);
    const memberAddress = await signer.getAddress();
    try {
      await createSafeTransaction(
        {
          sender: memberAddress,
          safe: this.safe,
          to: memberTokenAddress,
          data,
        },
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Creates a proposal on an external pod to mint a new member to this pod.
   * @param externalPodIdentifier - The Pod object, pod ID or pod safe address of either the admin pod, or a subpod of this pod.
   * @param newMember - Member to mint
   * @param signer - Signer of external pod member
   * @throws If newMember is already part of this pod
   * @throws If externalPodIdentifier does not correlate to existing pod
   * @throws If externalPodIdentifier is not the admin or subpod of this pod
   * @throws If signer is not a member of external pod
   */
  proposeMintMemberFromPod = async (
    externalPodIdentifier: Pod | string | number,
    newMember: string,
    signer: ethers.Signer,
  ) => {
    if (await this.isMember(newMember)) {
      throw new Error(`Address ${newMember} is already in this pod`);
    }

    let externalPod: Pod;
    if (externalPodIdentifier instanceof Pod) externalPod = externalPodIdentifier;
    else {
      externalPod = await new Pod(externalPodIdentifier);
    }
    if (!externalPod)
      throw new Error(`Could not find a pod with identifier ${externalPodIdentifier}`);

    // External pod must be the admin or a subpod of this pod.
    if (!(this.isAdmin(externalPod.safe) || (await this.isMember(externalPod.safe)))) {
      throw new Error(
        `Pod ${externalPod.safe} must be the admin or a subpod of this pod to make proposals`,
      );
    }

    const signerAddress = await signer.getAddress();
    if (!(await externalPod.isMember(signerAddress)))
      throw new Error(`Signer ${signerAddress} was not a member of the external pod`);

    // Tells MemberToken to mint a new token for this pod to newMember.
    const data = encodeFunctionData('MemberToken', 'mint', [
      ethers.utils.getAddress(newMember),
      this.id,
      ethers.constants.HashZero,
    ]);

    const { address: memberTokenAddress } = getContract('MemberToken', signer);
    try {
      // Create a safe transaction on this pod, sent from the signer
      await createNestedProposal(
        {
          sender: externalPod.safe,
          safe: this.safe,
          to: memberTokenAddress,
          data,
        },
        externalPod,
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Creates a proposal to burn a member from this pod
   * @param memberToBurn - Member to remove from this pod
   * @param signer - Signer of pod member
   * @throws If memberToBurn is not part of this pod
   */
  proposeBurnMember = async (memberToBurn: string, signer: ethers.Signer) => {
    checkAddress(memberToBurn);
    if (!(await this.isMember(memberToBurn))) {
      throw new Error(`Address ${memberToBurn} is not in this pod`);
    }

    const data = encodeFunctionData('MemberToken', 'burn', [
      ethers.utils.getAddress(memberToBurn),
      this.id,
    ]);

    const { address: memberTokenAddress } = getContract('MemberToken', signer);
    const memberAddress = await signer.getAddress();

    try {
      await createSafeTransaction(
        {
          sender: memberAddress,
          safe: this.safe,
          to: memberTokenAddress,
          data,
        },
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Creates a proposal on an external pod to burn a new member from this pod.
   * @param externalPodIdentifier - The Pod object, pod ID or pod safe address of either the admin pod, or a subpod of this pod.
   * @param memberToBurn - Member to burn
   * @param signer - Signer of external pod member
   * @throws If memberToBurn is not part of this pod
   * @throws If externalPodIdentifier is not an existing pod
   * @throws If externalPodIdentifier is not the admin or subpod of this pod
   * @throws If Signer is not a member of the external pod
   */
  proposeBurnMemberFromPod = async (
    externalPodIdentifier: Pod | string | number,
    memberToBurn: string,
    signer: ethers.Signer,
  ) => {
    if (!(await this.isMember(memberToBurn))) {
      throw new Error(`Address ${memberToBurn} is not in this pod`);
    }

    let externalPod: Pod;
    if (externalPodIdentifier instanceof Pod) externalPod = externalPodIdentifier;
    else {
      externalPod = await new Pod(externalPodIdentifier);
    }
    if (!externalPod)
      throw new Error(`Could not find a pod with identifier ${externalPodIdentifier}`);

    // External pod must be the admin or a subpod of this pod.
    if (!(this.isAdmin(externalPod.safe) || (await this.isMember(externalPod.safe)))) {
      throw new Error(
        `Pod ${externalPod.safe} must be the admin or a subpod of this pod to make proposals`,
      );
    }

    const signerAddress = await signer.getAddress();
    if (!(await externalPod.isMember(signerAddress)))
      throw new Error(`Signer ${signerAddress} was not a member of the external pod`);

    // Tells MemberToken to mint a new token for this pod to newMember.
    const data = encodeFunctionData('MemberToken', 'burn', [
      ethers.utils.getAddress(memberToBurn),
      this.id,
    ]);

    const { address: memberTokenAddress } = getContract('MemberToken', signer);
    try {
      // Create a safe transaction on this pod, sent from the admin pod
      await createNestedProposal(
        {
          sender: externalPod.safe,
          safe: this.safe,
          to: memberTokenAddress,
          data,
        },
        externalPod,
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Creates a proposal to transfer membership from a subpod
   * @param subPodIdentifier - Pod, Pod ID or safe address
   * @param addressToTransferTo - Address that will receive the membership
   * @param signer - Signer of subpod member
   * @throws If addressToTransferTo is already a member of this pod
   * @throws If subPodIdentifier does not exist
   * @throws If Signer is not a member of this sub pod
   */
  proposeTransferMembershipFromSubPod = async (
    subPodIdentifier: Pod | string | number,
    addressToTransferTo: string,
    signer: ethers.Signer,
  ) => {
    const checkedAddress = checkAddress(addressToTransferTo);
    if (await this.isMember(addressToTransferTo)) {
      throw new Error(`Address ${addressToTransferTo} is already in this pod`);
    }

    let subPod: Pod;
    if (subPodIdentifier instanceof Pod) subPod = subPodIdentifier;
    else {
      subPod = await new Pod(subPodIdentifier);
    }
    if (!subPod) throw new Error(`Could not find a pod with identifier ${subPodIdentifier}`);

    // Sub pod must be the admin or a subpod of this pod.
    if (!(await this.isMember(subPod.safe))) {
      throw new Error(`Pod ${subPod.ensName} must be a subpod of this pod to make proposals`);
    }

    const signerAddress = await signer.getAddress();
    if (!(await subPod.isMember(signerAddress)))
      throw new Error(`Signer ${signerAddress} was not a member of sub pod ${subPod.ensName}`);

    // Tells MemberToken to transfer token for this pod from subpod.safe to checkedAddress.
    const data = encodeFunctionData('MemberToken', 'safeTransferFrom', [
      subPod.safe,
      checkedAddress,
      this.id,
      1,
      ethers.constants.HashZero,
    ]);

    const { address: memberTokenAddress } = getContract('MemberToken', signer);
    try {
      // Create a safe transaction on this pod, sent from the admin pod
      // TODO: Gotta update to make this work.
      await createSafeTransaction(
        {
          sender: subPod.safe,
          safe: this.safe,
          to: memberTokenAddress,
          data,
        },
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Creates proposal to transfer the admin role from the admin pod
   * @param adminPodIdentifier - Pod ID, safe address, or ENS name of admin pod
   * @param addressToTransferTo - Address that will receive admin roll
   * @param signer - Signer of admin pod member
   * @throws If addressToTransferTo is already the pod admin
   * @throws If adminPodIdentifier does not exist
   * @throws If adminPodIdentifier is not the admin of this pod
   * @throws If Signer is not a member of the admin pod
   */
  proposeTransferAdminFromAdminPod = async (
    adminPodIdentifier: Pod | string | number,
    addressToTransferTo: string,
    signer: ethers.Signer,
  ) => {
    const checkedAddress = checkAddress(addressToTransferTo);
    if (this.isAdmin(addressToTransferTo)) {
      throw new Error(`Address ${addressToTransferTo} is already pod admin`);
    }

    let adminPod: Pod;
    if (adminPodIdentifier instanceof Pod) adminPod = adminPodIdentifier;
    else {
      adminPod = await new Pod(adminPodIdentifier);
    }
    if (!adminPod) throw new Error(`Could not find a pod with identifier ${adminPodIdentifier}`);

    if (!this.isAdmin(adminPod.safe)) {
      throw new Error(`Pod ${adminPod.ensName} must be the admin of this pod`);
    }

    const signerAddress = await signer.getAddress();
    if (!(await adminPod.isMember(signerAddress)))
      throw new Error(`Signer ${signerAddress} was not a member of admin pod ${adminPod.ensName}`);

    const { abi: controllerAbi } = getControllerByAddress(this.controller, config.network);
    const data = new ethers.utils.Interface(controllerAbi).encodeFunctionData('updatePodAdmin', [
      this.id,
      checkedAddress,
    ]);

    try {
      // Create a safe transaction on this pod, sent from the admin pod
      await createSafeTransaction(
        {
          sender: adminPod.safe,
          safe: this.safe,
          to: this.controller,
          data,
        },
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Adds newAdminAddress as the admin of this pod, if this pod does not currently have an admin.
   * @param newAdminAddress - Address of new admin
   * @param signer - Signer of pod member
   * @throws If pod already has an admin
   */
  proposeAddAdmin = async (newAdminAddress: string, signer: ethers.Signer) => {
    const checkedAddress = checkAddress(newAdminAddress);
    const signerAddress = await signer.getAddress();
    if (this.admin) throw new Error('Pod already has admin');

    const { abi: controllerAbi } = getControllerByAddress(this.controller, config.network);
    const data = new ethers.utils.Interface(controllerAbi).encodeFunctionData('updatePodAdmin', [
      this.id,
      checkedAddress,
    ]);

    try {
      // Create a proposal from the signer address
      await createSafeTransaction(
        {
          sender: signerAddress,
          safe: this.safe,
          to: this.controller,
          data,
        },
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Migrates the pod to the latest version. Signer must be the admin of pod.
   * @param signer - Signer of pod admin
   * @throws If signer is not pod admin TODO
   */
  migratePodToLatest = async (signer: ethers.Signer) => {
    // forcing to newest controller
    const newController = getDeployment('ControllerLatest', config.network);
    // Fetch old controller based on this Pod's controller address.
    const oldControllerDeployment = getControllerByAddress(this.controller, config.network);
    // Instantiate Contract object for old controller
    const OldController = new ethers.Contract(
      oldControllerDeployment.address,
      oldControllerDeployment.abi,
      signer,
    );

    const previousModule = await getPreviousModule(
      this.safe,
      oldControllerDeployment.address,
      newController.address,
      signer,
    );

    // use prev controller
    try {
      const res = await OldController.migratePodController(
        this.id,
        newController.address,
        previousModule,
      );
      return res;
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Creates a proposal to migrate the pod to the latest version.
   * @param signer - Signer of pod member
   * @throws If signer is not a pod member TODO
   */
  proposeMigratePodToLatest = async (signer: ethers.Signer) => {
    // forcing to newest controller
    const newController = getDeployment('ControllerLatest', config.network);
    const oldController = getControllerByAddress(this.controller, config.network);

    const previousModule = await getPreviousModule(
      this.safe,
      oldController.address,
      newController.address,
      signer,
    );

    // use prev controller
    const data = new ethers.utils.Interface(oldController.abi).encodeFunctionData(
      'migratePodController',
      [this.id, newController.address, previousModule],
    );

    try {
      await createSafeTransaction(
        {
          sender: await signer.getAddress(),
          safe: this.safe,
          to: oldController.address,
          data,
        },
        signer,
      );
    } catch (err) {
      throw new Error(err);
    }
  };

  /**
   * Creates a reject proposal at a given nonce, mostly used to un-stuck the transaction queue
   * @param nonce - nonce to create the reject transaction at
   * @param signer - Signer or address of pod member
   */
  createRejectProposal = async (nonce: number, signer: ethers.Signer | string) => {
    await createRejectTransaction(
      {
        safe: this.safe,
        to: this.safe,
        nonce,
        confirmationsRequired: this.threshold,
      },
      signer,
    );
  };
}
