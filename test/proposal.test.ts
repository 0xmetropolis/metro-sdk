import axios from 'axios';
import { ethers } from 'ethers';
import { init, getSuperProposal } from '../src';
import { getPod } from '../src';
import * as txService from '../src/lib/services/transaction-service';
import * as fetchers from '../src/fetchers';
import { constructGqlGetUsers, getSafeTransactionFixture } from './fixtures';
import { userAddress, userAddress2 } from './fixtures';

// Baseline mock for this set of tests.
function standardMock(fetchType?: string) {
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: {
      podAdmin: jest.fn().mockResolvedValueOnce('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41'),
    },
    Safe: {
      address: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
      nonce: jest.fn().mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 1) }),
      getThreshold: jest
        .fn()
        .mockResolvedValueOnce({ toNumber: jest.fn().mockImplementation(() => 3) }),
    },
    podId: 5, // Arbitrary
    Name: { name: 'whatever.pod.eth' },
  });
  // To populate proposals form the pod end
  jest.spyOn(txService, 'getSafeInfo').mockResolvedValueOnce({ nonce: 1, threshold: 3 });
  // For getMember related calls
  jest.spyOn(axios, 'post').mockResolvedValueOnce(constructGqlGetUsers([userAddress]));

  const mockGetSafeTransactions = jest
    .spyOn(txService, 'getSafeTransactionsBySafe')
    .mockResolvedValueOnce(getSafeTransactionFixture(fetchType));
  return { mockGetSafeTransactions };
}

let provider;

beforeAll(async () => {
  provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  provider.getSigner = () => {
    return {
      getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
    };
  };
  init({ provider, network: 1 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Pod.getProposals', () => {
  test('Pod.getProposals should return proposals reverse chronologically', async () => {
    standardMock();
    const pod = await getPod('0x2be14C515c5EE125BA13Bd2F4569Ab8c29B927c0');
    const proposals = await pod.getProposals();

    expect(proposals[0].timestamp > proposals[1].timestamp).toBeTruthy();
  });

  test('Pod.getProposals returns the active proposal as the first element of the array', async () => {
    standardMock();
    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposals = await pod.getProposals();

    // Current nonce based on our fixture.
    expect(proposals[0].id).toBe(1);
  });

  test('Pod.getProposals() with no options will return the active proposal, then any queued proposals', async () => {
    const { mockGetSafeTransactions } = standardMock('queued');

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposals = await pod.getProposals();

    expect(proposals[0].id).toBeGreaterThan(1);
    expect(proposals.length).toBe(3);
    expect(mockGetSafeTransactions).toHaveBeenCalledWith(
      '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
      { nonce__lte: 1, limit: 10 },
    );
  });

  test('Pod.getProposals({ status: active }) will return only the active proposal', async () => {
    const { mockGetSafeTransactions } = standardMock();

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    await pod.getProposals({ status: 'active' });

    expect(mockGetSafeTransactions).toHaveBeenCalledWith(
      '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
      { nonce: 1 },
    );
  });

  test('Pod.getProposals({ status: active }) will return an empty array if there is no active proposal', async () => {
    const { mockGetSafeTransactions } = standardMock('empty');

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposals = await pod.getProposals({ status: 'active' });

    expect(proposals).toEqual([]);
    expect(mockGetSafeTransactions).toHaveBeenCalledWith(
      '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
      { nonce: 1 },
    );
  });

  test('Pod.getProposals({ status: passed || rejected }) will return only the active proposal', async () => {
    const { mockGetSafeTransactions } = standardMock();

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    await pod.getProposals({ status: 'passed' || 'rejected' });

    expect(mockGetSafeTransactions).toHaveBeenCalledWith(
      '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
      { nonce__lt: 1, limit: 10 },
    );
  });

  test('Pod.getProposals({ status: queued }) will return any queued proposals, then active proposals', async () => {
    const { mockGetSafeTransactions } = standardMock();

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    await pod.getProposals({ status: 'queued' });

    expect(mockGetSafeTransactions).toHaveBeenCalledWith(
      '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
      { limit: 10 },
    );
  });

  test('Pod.getProposals pairs sub proposal approve/rejects properly', async () => {
    standardMock('subProposal');
    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    // limit: 2 should still fetch all 4 safe transactions, which should then condense down to 2 Proposals
    const proposals = await pod.getProposals({ limit: 2 });

    // Expect reverse chronological
    expect(proposals[0].id).toBeGreaterThan(proposals[1].id);
    expect(proposals[0].timestamp.getTime()).toBeGreaterThan(proposals[1].timestamp.getTime());
    // We're taking in 4 safe transactions that should condense down to 2 Proposals (with approve + rejects)
    expect(proposals.length).toBe(2);
  });
});

describe('Proposal details', () => {
  test('Proposal properties', async () => {
    standardMock();

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals())[0];

    expect(proposal.id).toBe(1);
    expect(proposal.status).toBe('active');
    expect(proposal.approvals).toEqual(['0x1cC62cE7cb56ed99513823064295761f9b7C856e']);
    expect(proposal.rejections).toEqual(['0x1cC62cE7cb56ed99513823064295761f9b7C856e']);
    expect(proposal.method).toBe(null);
    expect(proposal.parameters).toBe(null);
    expect(proposal.value).toBe('125000000000000000');
    expect(proposal.timestamp).toEqual(new Date('2022-04-12T18:22:06.988Z'));
    expect(proposal.pod).not.toBe(null);
    expect(proposal.threshold).toBe(3);
  });

  test('Proposal populates dataDecoded properly', async () => {
    standardMock('queued');
    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals({ status: 'queued' }))[0];

    expect(proposal.method).toBe('transfer');
    expect(proposal.parameters).toEqual(
      expect.arrayContaining([
        {
          name: 'to',
          type: 'address',
          value: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
        },
        {
          name: 'tokens',
          type: 'uint256',
          value: '200',
        },
      ]),
    );
  });
});

describe('Pod.getProposal()', () => {
  // Commenting out because it makes actual calls, which is bad for our CI/CD.
  // test('Should be able to fetch a corresponding superProposal from a subProposal', async () => {
  //   const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
  //   const proposal = (await pod.getProposals())[0];
  //   const superProposal = await getSuperProposal(proposal);
  //   console.log('superProposal', superProposal);
  // });
});

describe('Proposal approve/reject', () => {
  test('Successful approve', async () => {
    standardMock();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(userAddress),
    };
    const mockApprove = jest.spyOn(txService, 'approveSafeTransaction').mockImplementation();

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals())[0];

    await proposal.approve(mockSigner);

    expect(mockApprove).toHaveBeenCalledWith(proposal.safeTransaction, mockSigner);
    expect(proposal.approvals).toEqual(expect.arrayContaining([userAddress]));
  });

  test('Approve should throw if signer has already approved', async () => {
    standardMock();
    const mockSigner = {
      // This address is the one baked into the approvals list.
      getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
    };

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals())[0];

    await expect(proposal.approve(mockSigner)).rejects.toThrow(
      'Signer has already approved this proposal',
    );
  });

  test('Approve should throw if signer is not part of the pod', async () => {
    standardMock();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(ethers.constants.AddressZero),
    };

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const isPodMember = await pod.isMember(ethers.constants.AddressZero);

    const proposal = (await pod.getProposals())[0];

    expect(isPodMember).toBeFalsy();
    await expect(proposal.approve(mockSigner)).rejects.toThrow('Signer was not part of this pod');
  });

  test('Reject should create a RejectTransaction if none exists', async () => {
    standardMock();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(userAddress),
    };
    const mockCreate = jest
      .spyOn(txService, 'createRejectTransaction')
      .mockResolvedValueOnce({ safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41' });

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals())[0];

    // Manually remove reject transaction for test purposes.
    proposal.rejectTransaction = null;
    // Bypass the undefined check for this test.
    proposal.isSubProposal = false;

    await proposal.reject(mockSigner);
    expect(mockCreate).toHaveBeenCalledWith(proposal.safeTransaction, mockSigner);
    expect(proposal.rejections).toEqual(expect.arrayContaining([userAddress]));
    expect(proposal.rejectTransaction).not.toBe(null);
  });

  test('Reject should just approve if a rejectTransaction exists', async () => {
    standardMock();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(userAddress),
    };
    const mockApprove = jest.spyOn(txService, 'approveSafeTransaction').mockImplementation();

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals())[0];

    // Bypass the undefined check for this test.
    proposal.isSubProposal = false;

    await proposal.reject(mockSigner);
    expect(mockApprove).toHaveBeenCalledWith(proposal.rejectTransaction, mockSigner);
    expect(proposal.rejections).toEqual(expect.arrayContaining([userAddress]));
  });

  test('Reject should throw if signer is has already rejected', async () => {
    standardMock();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(userAddress2),
    };

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals())[0];

    await expect(proposal.reject(mockSigner)).rejects.toThrow(
      'Signer has already rejected this proposal',
    );
  });

  test('Reject should throw if signer is not part of pod', async () => {
    standardMock();
    const mockSigner = {
      getAddress: jest.fn().mockResolvedValueOnce(ethers.constants.AddressZero),
    };

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const isPodMember = await pod.isMember(ethers.constants.AddressZero);

    const proposal = (await pod.getProposals())[0];

    expect(isPodMember).toBeFalsy();
    await expect(proposal.reject(mockSigner)).rejects.toThrow('Signer was not part of this pod');
  });
});
