export default class Proposal {
  // I.e., the Gnosis nonce of this tx
  id: number;

  // Can be active, executed, or queued
  status: string;

  // Array of Ethereum addresses that approved
  approvals: string[];

  // Array of Ethereum addresses that rejected
  challenges: string[];

  // Name of smart contract function being called, if there is one
  method: string;

  // Parameters for the smart contract function being called, if there is one
  parameters: string[];

  // Eth value of transfer
  value: string;

  timestamp: Date;

  /**
   * Transforms a Safe Transaction object into one of our Proposals.
   * @param safeTransaction
   * @param rejectTransaction - Optional reject transaction
   */
  constructor(safeTransaction, podNonce, rejectTransaction?) {
    this.id = safeTransaction.nonce;
    this.timestamp = new Date(safeTransaction.submissionDate);
    this.value = safeTransaction.value;

    if (podNonce === this.id) this.status = 'active';
    if (podNonce > this.id) this.status = 'executed';
    if (podNonce < this.id) this.status = 'queued';

    this.approvals = safeTransaction.confirmations.map(confirmation => confirmation.owner);
    if (rejectTransaction) {
      this.challenges = rejectTransaction.confirmations.map(confirmation => confirmation.owner);
    } else {
      this.challenges = [];
    }

    if (safeTransaction.dataDecoded) {
      this.method = safeTransaction.dataDecoded.method;
      this.parameters = safeTransaction.dataDecoded.parameters;
    } else {
      this.method = null;
      this.parameters = null;
    }
  }
}
