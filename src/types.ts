import Pod from './Pod';

export interface Proposal {
  nonce: number;
  title: string;
  subheading: string;
  state: string;
  approvalsRequired: number;
  approvals: string[]; // Address of approver
  type: string;
  pod: Pod;
}
