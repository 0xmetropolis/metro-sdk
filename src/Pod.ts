import { ethers } from 'ethers';
import ENS, { labelhash } from '@ensdomains/ensjs';
import { getControllerByAddress, getDeployment } from '@orcaprotocol/contracts';
import axios from 'axios';
import { getPersonas } from './pod-utils';
import { config } from './config';
import { getPodFetchersByAddressOrEns, getPodFetchersById } from './fetchers';
import {
  getMetropolisContract,
  handleEthersError,
  encodeFunctionData,
  checkAddress,
  getPreviousModule,
  getGnosisSafeContract,
} from './lib/utils';
import {
  createRejectTransaction,
  getSafeTransactionsBySafe,
  populateDataDecoded,
  getSafeTransactionByHash,
} from './lib/services/transaction-service';
import { createSafeTransaction } from './lib/services/create-safe-transaction';
import Proposal from './Proposal';
import type { ProposalStatus } from './Proposal';
import { fetchPodUsers, fetchUserPodIds } from './lib/services/subgraph';

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
      let fetchedAdmin;
      try {
        let fetchers;
        if (typeof identifier === 'string') {
          fetchers = await getPodFetchersByAddressOrEns(identifier);
        } else if (typeof identifier === 'number') {
          fetchers = await getPodFetchersById(identifier);
        }
        podId = fetchers.podId;
        safe = fetchers.Safe.address;
        const fetched = await Promise.all([
          fetchers.Safe.nonce(),
          fetchers.Safe.getThreshold(),
          fetchers.Controller.podAdmin(podId),
        ]);
        this.nonce = fetched[0].toNumber();
        this.threshold = fetched[1].toNumber();
        [, , fetchedAdmin] = fetched;
        Controller = fetchers.Controller;
        Name = fetchers.Name;
      } catch (err) {
        if (err.message.includes('invalid address')) {
          throw new TypeError(`Non-address string passed to Pod constructor: '${identifier}'`);
        }
        return null;
      }

      this.controller = Controller.address;
      this.admin = fetchedAdmin === ethers.constants.AddressZero ? null : fetchedAdmin;
      this.id = podId;
      this.safe = safe;
      this.address = this.safe;
      this.ensName = Name.name;

      const baseUrl = `https://orcaprotocol-nft.vercel.app${
        network === 5 ? '/assets/testnet/' : '/assets/'
      }`;
      // Pod ID converted to hex and left padded to 64 chars.
      const paddedId = podId.toString(16).padStart(64, '0');
      try {
        const metadata = (await axios.get(`${baseUrl}${paddedId}.json`)).data;
        this.description = metadata.description || null;
      } catch {
        this.description = null;
      }
      const imageUrl = `${baseUrl}${paddedId}-image`;
      const imageNoTextUrl = `${baseUrl}${paddedId}-image-no-text`;

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

  /** @property Gnosis Safe address, duplicate of `safe` */
  address: string;

  /** @property Current nonce, i.e., the nonce of the active proposal */
  nonce: number;

  /** @property Number of votes required to pass a proposal */
  threshold: number;

  /** @property ENS name */
  ensName: string;

  /** @property Admin address */
  admin: string;

  /** @property Description of NFT */
  description: string;

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
   * @property Admin pod object
   */
  adminPod?: Pod;

  /**
   * @ignore
   * @property Array of Pod objects for any member pods
   * Do not call this property directly, use `Pod.getMemberPods()`
   */
  memberPods?: Pod[];

  /**
   * @ignore
   * @property Array of Pod objects for any super pods
   * Do not call this property directly, use `Pod.getSuperPods()`
   */
  superPods?: Pod[];

  /**
   * Returns an array of Proposal objects in reverse chronological order. Defaults to returning 5,
   * which can be overridden by passing { limit: 10 } for example in the options.
   *
   * By default, the first Proposal will be the active proposal, if there is one, and then any executed proposals.
   *
   * Queued proposals can be fetched by passing { status: 'queued' } in the options. This will return queued
   * proposals, then the active proposal, then executed proposals (up to the requested limit).
   *
   * Executed proposals can be fetched by passing { status: 'passed' } or { status: 'rejected' } in the options. This will return
   * only executed proposals.
   *
   * @param options
   * @returns
   */
  getProposals = async (
    options: {
      status?: ProposalStatus;
      limit?: number;
    } = {},
  ): Promise<Proposal[]> => {
    // Nonce here is the current nonce, i.e., the active proposal.
    const { nonce, threshold } = this;
    const { limit = 5 } = options;

    // We double the limit here because each Proposal is unique, but there can be two
    // SafeTransaction with a given nonce. We combine those Safe Txs into a single Proposal
    let params;
    switch (options.status) {
      case 'active':
        params = { nonce };
        break;
      case 'executed':
        // Need to double limit because some safe Txs are paired.
        params = { nonce__lt: nonce, limit: limit * 2 };
        break;
      case 'queued':
        // Transaction service returns queued txs by default
        params = { limit: limit * 2 };
        break;
      default:
        // No status defined, only grab active and below.
        params = { limit: limit * 2, nonce__lte: nonce };
    }

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
      // TODO: I'm actually not sure if that assumption is true anymore.
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

    return subProposals
      .concat(normalProposals)
      .sort((a, b) => {
        // Sort in descending order/reverse chron based on nonce/id.
        return b.id - a.id;
      })
      .slice(0, limit); // Slice to return the requested limited Proposals.
  };

  /**
   * Gets a specific proposal by either nonce or the safeTxHash.
   * @param identifier - Can be either the proposal id/nonce (preferred), or the safeTxHash
   */
  getProposal = async (identifier: number | string): Promise<Proposal> => {
    let nonce: number;
    if (typeof identifier === 'number') nonce = identifier;
    else {
      const safeTransaction = await getSafeTransactionByHash(identifier);
      nonce = safeTransaction.nonce;
    }

    // All safe transactions that have a given nonce.
    const safeTransactions = await getSafeTransactionsBySafe(this.safe, {
      nonce,
    });
    if (safeTransactions.length === 0) throw new Error('Could not find a related safe transaction');
    if (safeTransactions.length === 1) return new Proposal(this, this.nonce, safeTransactions[0]);
    if (safeTransactions.length === 2)
      return new Proposal(this, this.nonce, safeTransactions[1], safeTransactions[0]);
    throw new Error('Unexpected number of safe transactions found');
  };

  /**
   * Returns an array of this pod's super pods, i.e., pods that this pod is a member of
   */
  getSuperPods = async (): Promise<Pod[]> => {
    if (this.superPods) return this.superPods;
    const userPodIds = await fetchUserPodIds(this.safe);
    this.superPods = await Promise.all(userPodIds.map(async podId => new Pod(podId)));
    return this.superPods;
  };

  /**
   * Returns an array of all active super proposals, i.e., active proposals of any super pods
   */
  getSuperProposals = async (): Promise<Proposal[]> => {
    const superPods = await this.getSuperPods();
    if (superPods.length === 0) return [];
    const superProposals = (
      await Promise.all(
        superPods.map(async pod => {
          const [activeProposal] = await pod.getProposals({ status: 'active' });
          return activeProposal;
        }),
      )
    ).filter(x => x); // Filter all null values, i.e., super pods that have no active proposals
    return superProposals;
  };

  /**
   * Returns of list of all member addresses.
   * Members include member pods and member EOAs
   */
  getMembers = async (): Promise<string[]> => {
    if (this.members) return this.members;
    const users = await fetchPodUsers(this.id);
    // Checksum all addresses.
    this.members = users.length > 0 ? users.map(user => ethers.utils.getAddress(user)) : [];
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
   * Calls a Pod method via a persona.
   * The persona object can be fetched by using `Pod.getPersonas(address)`
   * E.g.,
   * ```
   * callAsPersona(
   *  pod.mintMember,
   *  [newMember],
   *  { type: 'admin', address: userAddress },
   *  signer,
   * )
   * ```
   * The sender must be a signer in the admin case, or the address of the sender.
   * The sender must be a member of the relevant pod.
   *
   * @param method
   * @param args
   * @param persona
   * @param sender
   * @returns
   */
  callAsPersona = async (
    method: any,
    args: Array<any>,
    persona: { type: string; address: string },
    sender?: ethers.Signer | string,
  ) => {
    switch (persona.type) {
      case 'admin':
        if (!sender) throw new Error(`Expected sender to be signer, but received ${sender}`);
        args.push(sender);
        return method.apply(this, args);
      case 'member':
        return this.propose(await method.apply(this, args), persona.address);
      case 'adminPodMember': {
        let adminPod;
        if (this.adminPod) adminPod = this.adminPod;
        else {
          adminPod = await new Pod(this.admin);
          this.adminPod = adminPod;
        }
        let senderAddress = sender;
        if (sender instanceof ethers.Signer) senderAddress = await sender.getAddress();
        let result;
        try {
          result = await adminPod.propose(await method.apply(this, args), senderAddress);
        } catch (err) {
          // Make the error message more specific
          if (err.message.includes('Sender must be a member of')) {
            throw new Error('Sender must be a member of the admin pod');
          }
        }
        return result;
      }
      case 'subPodMember': {
        const subPod = await new Pod(persona.address);

        const isSubPodMember = await this.isMember(subPod.safe);

        if (!isSubPodMember) throw new Error('Sub pod is not a member of this pod');
        const senderAddress = sender instanceof ethers.Signer ? await sender.getAddress() : sender;
        let result;
        try {
          result = await subPod.propose(
            await this.propose(await method.apply(this, args), subPod.safe),
            senderAddress,
          );
        } catch (err) {
          // Make the error message more specific
          if (err.message.includes('Sender must be a member of')) {
            throw new Error('Sender must be a member of the sub pod');
          }
        }
        return result;
      }
      default:
        throw new Error(`${persona.type} is not a valid persona`);
    }
  };

  /**
   * Fetches all personas for a given address related to this pod.
   * All personas return as an object indicating the type of the persona and the address of the persona.
   * For members and admins, the persona address is the user's address.
   * For admin pods and sub pods, the persona address is the pod address.
   * @param address
   */
  getPersonas(address: string) {
    // Function declared separately out for test/mocking purposes.
    return getPersonas(this, address);
  }

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
    let adminPod;
    if (this.adminPod) adminPod = this.adminPod;
    else {
      adminPod = await new Pod(this.admin);
      this.adminPod = adminPod;
    }

    if (!adminPod) return false;
    return adminPod.isMember(checkedAddress);
  };

  /**
   * Checks if given address is a member of any subpods.
   * Returns false if the user is a member of **this** pod, but not any sub pods
   *
   * @param address
   */
  isSubPodMember = async (address: string): Promise<boolean> => {
    const checkedAddress = checkAddress(address);
    if (!this.memberPods) await this.populateMembers();
    const results = await Promise.all(
      this.memberPods.map(async pod => {
        return pod.isMember(checkedAddress);
      }),
    );
    return results.includes(true);
  };

  /**
   * Returns all sub pods of this pod that an address is the member of.
   * @param address
   */
  getSubPodsByMember = async (address: string): Promise<Pod[]> => {
    const checkedAddress = checkAddress(address);
    if (!this.memberPods) await this.populateMembers();
    const results = await Promise.all(
      this.memberPods.map(async pod => {
        return (await pod.isMember(checkedAddress)) ? pod : null;
      }),
    );
    return results.filter(x => !!x);
  };

  /**
   * Fetches an external pod (i.e., a sub or admin pod) and performs checks.
   * Mostly used in context of creating sub/super proposals.
   * @ignore
   * @param podIdentifier - Pod safe, ID, or the Pod object itself
   * @param relationship - 'admin' or 'sub'
   * @param signerAddress - Address of signer
   * @returns
   */
  getExternalPod = async (
    podIdentifier: string | number | Pod,
    relationship: string,
    signerAddress: string,
  ) => {
    let externalPod;
    if (podIdentifier instanceof Pod) externalPod = podIdentifier;
    else {
      externalPod = await new Pod(podIdentifier);
    }

    if (!externalPod) throw new Error(`Could not find a pod with identifier ${podIdentifier}`);

    if (relationship === 'admin') {
      if (!this.isAdmin(externalPod.safe)) {
        throw new Error(
          `Pod ${externalPod.ensName} must be the admin of this pod to make proposals`,
        );
      }
    } else if (relationship === 'sub') {
      if (!(await this.isMember(externalPod.safe))) {
        throw new Error(
          `Pod ${externalPod.ensName} must be a subpod of this pod to make proposals`,
        );
      }
    }

    if (!(await externalPod.isMember(signerAddress)))
      throw new Error(
        `Signer ${signerAddress} was not a member of the ${relationship} pod ${externalPod.ensName}`,
      );

    return externalPod;
  };

  /**
   * Creates a proposal on the pod.
   *
   * If the proposal parameter is in the { data, to } format, this will create a proposal to execute
   * an arbitrary smart contract function on this pod.
   *
   * The `data` parameter is unsigned encoded function data. You can generate this function data a number of ways,
   * our recommended way would be through ethers.Interface.encodeFunctionData. The `to` parameter should be the smart contract
   * that the function being called belongs to.
   *
   * The pod object can also populate these transactions by using the supplied methods with no signer (i.e., `pod.mint()`)
   *
   * To create a proposal on the current pod, you can chain the method and the propose method like so:
   *
   * ```js
   * await pod.propose(await pod.mint(newMember), podMember);
   * ```
   *
   * To create a proposal on the admin pod to mint to a managed pod, you can call the managed pod's method:
   * Note that the pod you call the functions on is important: it determines which pod you are attempting to mint to.
   *
   * ```js
   * // It is important that you call mint() from managedPod here
   * await adminPod.propose(await managedPod.mint(newMember), adminPodMember);
   * ```
   *
   * In order to create a sub proposal of an existing proposal, you can pass the proposal object to the sub pod's propose method:
   *
   * ```
   * const [superProposal] = await superPod.getProposals();
   * // This creates a sub proposal to approve the super proposal.
   * await subPod.propose(superProposal, signer);
   *
   * // The propose function also returns a Propose object, so you can chain `propose` like so:
   * await subPod.propose(
   *   await superPod.propose(
   *     await superPod.mint(newMember),
   *     superPodMember,
   *   ),
   *   subPodMember,
   * );
   * ```
   *
   * The sender parameter should be the address the proposal is being sent from. This should be a member
   * of the pod for creating a proposal, or a member of a sub pod to create sub proposals.
   *
   * @param proposal
   * @param sender - Address of sender
   * @param opts.nonce - Optional nonce. This will create a proposal with the given nonce.
   * @returns
   */
  propose = async (
    // TODO: We don't actually accept a TransactionResponse, this is just to bypass typescript.
    proposal: { data: string; to: string } | Proposal | ethers.providers.TransactionResponse,
    sender: string,
    opts: { nonce?: number } = {},
  ) => {
    const { nonce } = opts;
    let safeTransaction;
    if (proposal instanceof Proposal) {
      if (!(await this.isMember(sender))) {
        throw new Error('Sender must be part of this pod to create a proposal');
      }
      // Making a sub proposal
      const { safeTxHash } = proposal.safeTransaction;
      try {
        safeTransaction = await createSafeTransaction({
          sender,
          to: proposal.pod.safe, // To the super proposal
          data: encodeFunctionData('GnosisSafe', 'approveHash', [safeTxHash]),
          safe: this.safe,
        });
      } catch (err) {
        if (err.response.data.message === 'Gas estimation failed') {
          throw new Error('Gas estimation failed (this is often a revert error)');
        }
        throw new Error(err);
      }
    } else {
      // Making a regular proposal/potential super proposal.
      const { to, data } = proposal;
      if (!((await this.isMember(sender)) || (await this.isSubPodMember(sender)))) {
        throw new Error('Sender must be a member of this pod or one of its sub pods');
      }
      safeTransaction = await createSafeTransaction({
        sender,
        safe: this.safe,
        to,
        data,
        nonce: nonce || null,
      });
    }

    return new Proposal(this, this.nonce, safeTransaction);
  };

  /**
   * Mints member(s) to this pod, or returns an unsigned transaction to do so.
   * @param newMember - Can be a single address or an array of addresses
   * @param signer - If a signer is provided, then the tx will execute. Otherwise, an unsigned transaction will be returned.
   * @throws if signer is not admin
   */
  mintMember = async (
    newMember: string | string[],
    signer?: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> => {
    if (signer) {
      const signerAddress = await signer.getAddress();
      if (!this.isAdmin(signerAddress)) throw new Error('Signer was not admin');
    }

    const MemberToken = getMetropolisContract('MemberToken', signer);

    // Handle array of addresses
    if (Array.isArray(newMember)) {
      newMember.forEach(checkAddress);
      if (signer) return MemberToken.mintSingleBatch(newMember, this.id, ethers.constants.HashZero);
      return (await MemberToken.populateTransaction.mintSingleBatch(
        newMember,
        this.id,
        ethers.constants.HashZero,
      )) as { to: string; data: string };
    }

    // Single member.
    checkAddress(newMember);
    try {
      if (signer) return MemberToken.mint(newMember, this.id, ethers.constants.HashZero);
      return (await MemberToken.populateTransaction.mint(
        newMember,
        this.id,
        ethers.constants.HashZero,
      )) as { to: string; data: string };
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Burns member(s) from this pod, or returns an unsigned transaction to do so.
   * @param memberToBurn - Can be a single address or an array of addresses
   * @param signer - If a signer is provided, then the tx will execute. Otherwise, an unsigned transaction will be returned.
   * @throws If signer is not admin
   */
  burnMember = async (
    memberToBurn: string | string[],
    signer?: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> => {
    if (signer) {
      const signerAddress = await signer.getAddress();
      if (!this.isAdmin(signerAddress)) throw new Error('Signer was not admin');
    }

    // Handle array of addresses
    if (Array.isArray(memberToBurn)) {
      memberToBurn.forEach(checkAddress);
      try {
        const MemberToken = getMetropolisContract('MemberToken', signer);
        if (signer) return MemberToken.burnSingleBatch(memberToBurn, this.id);
        return (await MemberToken.populateTransaction.burnSingleBatch(memberToBurn, this.id)) as {
          to: string;
          data: string;
        };
      } catch (err) {
        return handleEthersError(err);
      }
    }

    // Burn single
    checkAddress(memberToBurn);
    try {
      const MemberToken = getMetropolisContract('MemberToken', signer);
      if (signer) return MemberToken.burn(memberToBurn, this.id);
      return (await MemberToken.populateTransaction.burn(memberToBurn, this.id)) as {
        to: string;
        data: string;
      };
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Mints and burns members simultaneously.
   */
  batchMintAndBurn = async (
    mintMembers: string[],
    burnMembers: string[],
    signer?: ethers.Signer,
  ) => {
    mintMembers.forEach(checkAddress);
    burnMembers.forEach(checkAddress);
    if (signer) {
      const signerAddress = await signer.getAddress();
      if (!this.isAdmin(signerAddress)) throw new Error('Signer was not admin');
    }
    try {
      const { abi: controllerAbi } = getControllerByAddress(this.controller, config.network);
      const Controller = new ethers.Contract(this.controller, controllerAbi, signer);
      if (signer) return Controller.batchMintAndBurn(this.id, mintMembers, burnMembers);
      return (await Controller.populateTransaction.batchMintAndBurn(
        this.id,
        mintMembers,
        burnMembers,
      )) as {
        to: string;
        data: string;
      };
    } catch (err) {
      if (err.message.includes('batchMintAndBurn is not a function')) {
        throw new Error(
          'batchMintAndBurn not found, you may need to upgrade to the latest Controller version',
        );
      }
      return handleEthersError(err);
    }
  };

  /**
   * Transfers a membership. If a signer is provided, it will execute the transaction. Otherwise it will return the unsigned tx.
   *
   * @param toAddress - Address that will receive membership
   * @param fromAddress - Address that is giving up membership
   * @param signer - If a signer is provided, then the tx will execute. Otherwise, an unsigned transaction will be returned.
   * @throws If toAddress is already a member
   * @throws if fromAddress is not a member
   * @throws If provided signer is not the fromAddress
   */
  transferMembership = async (
    fromAddress: string,
    toAddress: string,
    signer?: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> => {
    const checkedFrom = checkAddress(fromAddress);
    if (!(await this.isMember(fromAddress))) {
      throw new Error(`Address ${fromAddress} was not a member of this pod`);
    }
    const checkedTo = checkAddress(toAddress);
    if (await this.isMember(checkedTo)) {
      throw new Error(`Address ${checkedTo} is already a member of this pod`);
    }

    if (signer) {
      const signerAddress = await signer.getAddress();
      if (checkedFrom !== signerAddress) throw new Error('Signer did not match the from address');
      if (!(await this.isMember(signerAddress))) {
        throw new Error(`Signer ${signerAddress} is not a member of this pod`);
      }
    }

    try {
      const MemberToken = getMetropolisContract('MemberToken', signer);
      if (signer) {
        return MemberToken.safeTransferFrom(
          checkedFrom,
          checkedTo,
          this.id,
          1,
          ethers.constants.HashZero,
        );
      }
      return (await MemberToken.populateTransaction.safeTransferFrom(
        checkedFrom,
        checkedTo,
        this.id,
        1,
        ethers.constants.HashZero,
      )) as { to: string; data: string };
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Changes the threshold for the safe associated with this pod.
   * If a signer is provided, it will execute the transaction. Otherwise it will return the unsigned tx.
   * @param newThreshold - new threshold
   * @param signer - Signer of admin
   * @throws If signer is not admin
   * @returns
   */
  changeThreshold = async (newThreshold: number, signer?: ethers.Signer) => {
    if (signer) {
      const signerAddress = await signer.getAddress();
      if (!this.isAdmin(signerAddress)) throw new Error('Signer was not the admin of this pod');
    }
    if (newThreshold === this.threshold)
      throw new Error(`Current threshold is already ${newThreshold}`);

    const GnosisSafe = getGnosisSafeContract(this.safe, signer);

    try {
      if (signer) return GnosisSafe.changeThreshold(newThreshold);
      return (await GnosisSafe.populateTransaction.changeThreshold(newThreshold)) as {
        to: string;
        data: string;
      };
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Transfers admin role from signer's account to addressToTransferTo
   * If a signer is provided, it will execute the transaction. Otherwise it will return the unsigned tx.
   * @param addressToTransferTo - Address that will receive admin role
   * @param signer - Signer of admin
   * @throws If signer is not admin
   */
  transferAdmin = async (
    addressToTransferTo: string,
    signer?: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> => {
    const checkedAddress = checkAddress(addressToTransferTo);
    if (signer) {
      const signerAddress = await signer.getAddress();
      if (!this.isAdmin(signerAddress)) throw new Error('Signer was not the admin of this pod');
    }

    const { abi: controllerAbi } = getControllerByAddress(this.controller, config.network);
    const Controller = new ethers.Contract(this.controller, controllerAbi, signer);

    try {
      if (signer) return Controller.updatePodAdmin(this.id, checkedAddress);
      return (await Controller.populateTransaction.updatePodAdmin(this.id, checkedAddress)) as {
        to: string;
        data: string;
      };
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   * Migrates the pod to the latest version. Signer must be the admin of pod.
   * If a signer is provided, it will execute the transaction. Otherwise it will return the unsigned tx.
   * @param signer - Signer of pod admin
   * @throws If signer is not pod admin
   */
  migratePodToLatest = async (
    signer?: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> => {
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

    let previousModule = await getPreviousModule(
      this.safe,
      oldControllerDeployment.address,
      newController.address,
    );

    // If the previous module is the sentinel, then we're going to add the new controller
    // before removing the old controller, therefore the previous module will be the
    // new controller we just added, because safe modules are added reverse-chronologically.
    if (previousModule === '0x0000000000000000000000000000000000000001') {
      previousModule = newController.address;
    }

    // use prev controller
    try {
      if (signer)
        return OldController.migratePodController(this.id, newController.address, previousModule);
      return (await OldController.populateTransaction.migratePodController(
        this.id,
        newController.address,
        previousModule,
      )) as { to: string; data: string };
    } catch (err) {
      return handleEthersError(err);
    }
  };

  /**
   *
   */
  isPodifyInProgress = async () => {
    const proposals = await this.getProposals();
    let result = false;
    proposals.forEach(proposal => {
      if (proposal.status === ('passed' || 'rejected')) return;
      if (proposal.method === 'enableModule') {
        try {
          // This throws if the provided address is not one of our controllers.
          getControllerByAddress(proposal.parameters[0].value, config.network);
          // Set to true if it doesn't throw.
          result = true;
        } catch {
          // Do nothing.
        }
      }
    });
    return result;
  };

  /**
   * Ejects a safe from the Orca ecosystem.
   * This zeroes out all ENS + Controller data, removes the Orca module, and burns the pod's MemberTokens
   * If a signer is provided, it will execute the transaction. Otherwise it will return the unsigned tx.
   *
   * This function can also clean up data for safes that have already removed the Orca module,
   * but note that the reverse resolver must be zeroed out by the safe manually in this case.
   */
  ejectSafe = async (
    signer?: ethers.Signer,
  ): Promise<ethers.providers.TransactionResponse | { to: string; data: string }> => {
    const previousModule = await getPreviousModule(this.safe, this.controller);
    const controllerDeployment = getControllerByAddress(this.controller, config.network);

    const Controller = new ethers.Contract(
      controllerDeployment.address,
      controllerDeployment.abi,
      signer,
    );
    try {
      if (signer)
        return Controller.ejectSafe(this.id, labelhash(this.ensName.split('.')[0]), previousModule);
      return (await Controller.populateTransaction.ejectSafe(
        this.id,
        labelhash(this.ensName.split('.')[0]),
        previousModule,
      )) as { to: string; data: string };
    } catch (err) {
      if (err.message.includes('ejectSafe is not a function')) {
        throw new Error(
          'ejectSafe not found, you may need to upgrade to the latest Controller version',
        );
      }
      return handleEthersError(err);
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
