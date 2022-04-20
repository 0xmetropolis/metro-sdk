import { ethers } from 'ethers';
import type Pod from './Pod';
import {
  approveSafeTransaction,
  createRejectTransaction,
  executeSafeTransaction,
  SafeTransaction,
} from './lib/services/transaction-service';
import { checkAddress } from './lib/utils';

export type ProposalStatus = 'active' | 'executed' | 'queued';

export type ProposalType = InstanceType<typeof Proposal>;

export default class Proposal {
  pod: Pod;

  // I.e., the Gnosis nonce of this tx
  id: number;

  status: ProposalStatus;

  // Array of Ethereum addresses that approved
  approvals: string[];

  // Array of Ethereum addresses that rejected
  rejections: string[];

  threshold: number;

  safeTransaction: SafeTransaction;

  rejectTransaction: SafeTransaction;

  // Name of smart contract function being called, if there is one
  method: string;

  // Parameters for the smart contract function being called, if there is one
  parameters: { name: string; type: string; value: string }[];

  // Eth value of transfer
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
    this.threshold = safeTransaction.confirmationsRequired;
    this.safeTransaction = safeTransaction;
    this.rejectTransaction = rejectTransaction;

    if (podNonce === this.id) this.status = 'active';
    if (podNonce > this.id) this.status = 'executed';
    if (podNonce < this.id) this.status = 'queued';

    this.approvals = safeTransaction.confirmations.map(confirmation => confirmation.owner);
    if (rejectTransaction) {
      this.rejections = rejectTransaction.confirmations.map(confirmation => confirmation.owner);
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
  }

  /**
   * Votes to approve the proposal
   * @param signer
   */
  approve = async (signer: ethers.Signer) => {
    const signerAddress = checkAddress(await signer.getAddress());
    if (this.approvals.includes(signerAddress)) {
      throw new Error('Signer has already approved this proposal');
    }
    if (!this.pod.isMember(signerAddress)) {
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
   * @param signer
   */
  reject = async (signer: ethers.Signer) => {
    const signerAddress = checkAddress(await signer.getAddress());
    if (this.rejections.includes(signerAddress)) {
      throw new Error('Signer has already rejected this proposal');
    }
    if (!this.pod.isMember(signerAddress)) {
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
   * Executes proposal
   */
  executeApprove = async (signer: ethers.Signer) => {
    const signerAddress = checkAddress(await signer.getAddress());
    if (this.approvals.length !== this.threshold) {
      throw new Error('Not enough approvals to execute');
    }
    if (!this.pod.isMember(signerAddress)) {
      throw new Error('Signer was not part of this pod');
    }
    return executeSafeTransaction(this.safeTransaction, signer);
  };
}
