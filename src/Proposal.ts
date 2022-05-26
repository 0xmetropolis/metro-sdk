import { ethers } from 'ethers';
import type Pod from './Pod';
import {
  approveSafeTransaction,
  createRejectTransaction,
  executeSafeTransaction,
  executeRejectSuperProposal,
  SafeTransaction,
} from './lib/services/transaction-service';
import { approveSuperProposal, rejectSuperProposal } from './lib/services/create-safe-transaction';
import { checkAddress } from './lib/utils';

export type ProposalStatus = 'active' | 'executed' | 'queued';

export type ProposalType = InstanceType<typeof Proposal>;

/**
 * The Proposal object is the interface for interacting with any Proposals.
 * Can be gotten via the Pod object, through {@link Pod.getProposals}.
 */
export default class Proposal {
  /** @property Pod object this Proposal is associated with */
  pod: Pod;

  /** @property Proposal ID, i.e., the Gnosis nonce. This is not necessarily a unique number */
  id: number;

  /** @property Proposal status, i.e., 'active', 'executed', or 'queued',  */
  status: ProposalStatus;

  /**
   * @property Whether or not this proposal corresponds to a superproposal
   */
  isSubProposal: boolean;

  /** @property Array of addresses that approved */
  approvals: string[];

  /** @property Array of addresses that rejected */
  rejections: string[];

  /** @property Number of votes required to pass/reject a proposal */
  threshold: number;

  /**
   * @ignore
   * @property SafeTransaction object, used mostly internally
   */
  safeTransaction: SafeTransaction;

  /**
   * @ignore
   * @property The associated reject SafeTransaction, if there is one. Used internally.
   */
  rejectTransaction?: SafeTransaction;

  /** @property Name of smart contract method being called, if there is one */
  method?: string;

  /** @property Parameters for the smart contract function being called, if there is one */
  parameters?: { name: string; type: string; value: string }[];

  /** @property Eth value of transfer in Wei, if there is one */
  value: string;

  timestamp: Date;

  /**
   * Transforms a Safe Transaction object into one of our Proposals.
   * @param safeTransaction
   * @param rejectTransaction - Optional reject transaction
   */
  constructor(
    Pod: Pod,
    podNonce: number,
    safeTransaction: SafeTransaction,
    rejectTransaction?: SafeTransaction,
  ) {
    this.pod = Pod;
    this.id = safeTransaction.nonce;
    this.timestamp = new Date(safeTransaction.submissionDate);
    this.value = safeTransaction.value;
    this.threshold = safeTransaction.confirmationsRequired
      ? safeTransaction.confirmationsRequired
      : this.pod.threshold;
    this.safeTransaction = safeTransaction;
    this.rejectTransaction = rejectTransaction;

    if (podNonce === this.id) this.status = 'active';
    if (podNonce > this.id) this.status = 'executed';
    if (podNonce < this.id) this.status = 'queued';

    this.approvals = safeTransaction.confirmations
      ? safeTransaction.confirmations.map(confirmation => confirmation.owner)
      : [];
    if (rejectTransaction) {
      this.rejections = rejectTransaction.confirmations
        ? rejectTransaction.confirmations.map(confirmation => confirmation.owner)
        : [];
    } else {
      this.rejections = [];
    }

    if (safeTransaction.dataDecoded) {
      this.method = safeTransaction.dataDecoded.method;
      this.parameters = safeTransaction.dataDecoded.parameters;
    } else {
      this.method = null;
      this.parameters = null;
    }

    if (this.method === 'approveHash') {
      this.isSubProposal = true;
    }
  }

  /**
   * Votes to approve the proposal
   * @param signer - Signer of pod member
   * @throws If signer already approved proposal
   * @throws If signer is not a pod member
   * @throws If there was an error approving Proposal
   */
  approve = async (signer: ethers.Signer) => {
    const signerAddress = checkAddress(await signer.getAddress());
    if (this.approvals.includes(signerAddress)) {
      throw new Error('Signer has already approved this proposal');
    }
    if (!(await this.pod.isMember(signerAddress))) {
      throw new Error('Signer was not part of this pod');
    }
    try {
      await approveSafeTransaction(this.safeTransaction, signer);
    } catch (err) {
      throw new Error(`Error approving Proposal: ${err.message}`);
    }

    this.approvals.push(signerAddress);
  };

  /**
   * Votes to reject the proposal
   * @param signer - Signer of pod member
   * @throws If signer has already rejected proposal
   * @throws If signer was not pod member
   * @throws If error rejecting proposal
   */
  reject = async (signer: ethers.Signer) => {
    const signerAddress = checkAddress(await signer.getAddress());

    if (this.rejections.includes(signerAddress)) {
      throw new Error('Signer has already rejected this proposal');
    }
    if (!(await this.pod.isMember(signerAddress))) {
      throw new Error('Signer was not part of this pod');
    }

    if (!this.rejectTransaction) {
      this.rejectTransaction = await createRejectTransaction(this.safeTransaction, signer);
    } else {
      try {
        await approveSafeTransaction(this.rejectTransaction, signer);
      } catch (err) {
        throw new Error(`Error rejecting Proposal: ${err.message}`);
      }
    }

    this.rejections.push(signerAddress);
  };

  /**
   * Approves a super proposal from a sub pod. This creates a sub proposal if one does not exist.
   * @param subPod - Pod to approve from
   * @param signer - Signer of sub pod member
   */
  approveFromSubPod = async (subPod: Pod, signer: ethers.Signer) => {
    const sender = await signer.getAddress();
    if (!(await this.pod.isMember(subPod.safe))) {
      throw new Error(`${subPod.ensName} is not a sub pod of ${this.pod.ensName}`);
    }
    await approveSuperProposal({ sender, ...this.safeTransaction }, subPod, signer);
  };

  /**
   * Rejects a super proposal from a sub pod. This creates a sub proposal if one does not exist.
   * @param subPod - Pod to reject from
   * @param signer - Signer of sub pod member
   */
  rejectFromSubPod = async (subPod: Pod, signer: ethers.Signer) => {
    const sender = await signer.getAddress();
    if (!(await this.pod.isMember(subPod.safe))) {
      throw new Error(`${subPod.ensName} is not a sub pod of ${this.pod.ensName}`);
    }
    await rejectSuperProposal({ sender, ...this.safeTransaction }, subPod, signer);
  };

  /**
   * Executes proposal
   * @param signer - Signer of pod member
   * @throws If not enough approvals to execute
   * @throws If signer was not part of the pod
   */
  executeApprove = async (signer: ethers.Signer) => {
    const signerAddress = checkAddress(await signer.getAddress());
    if (this.approvals.length < this.threshold) {
      throw new Error('Not enough approvals to execute');
    }
    if (!(await this.pod.isMember(signerAddress))) {
      throw new Error('Signer was not part of this pod');
    }
    this.status = 'executed';
    return executeSafeTransaction(this.safeTransaction, signer);
  };

  /**
   * Executes the rejection of proposal
   * @param signer - Signer of pod member
   * @throws If not enough rejections to execute
   * @throws If signer was not part of the pod
   */
  executeReject = async (signer: ethers.Signer) => {
    const signerAddress = checkAddress(await signer.getAddress());
    if (this.isSubProposal) {
      return executeRejectSuperProposal(this.parameters[0].value, this, signer);
    }
    if (this.rejections.length < this.threshold) {
      throw new Error('Not enough rejections to execute');
    }
    if (!(await this.pod.isMember(signerAddress))) {
      throw new Error('Signer was not part of this pod');
    }
    this.status = 'executed';
    return executeSafeTransaction(this.rejectTransaction, signer);
  };
}
