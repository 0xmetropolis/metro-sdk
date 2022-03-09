import type Pod from './Pod';

interface Proposal {
  nonce: number;
  title: string;
  state: string;
  approvalsRequired: number;
  approvals: string[]; // Address of approver
  type: string;
  pod: Pod;
}

export { Proposal, Pod };
