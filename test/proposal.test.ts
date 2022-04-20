import { ethers } from 'ethers';
import { init } from "../src";
import { getPod } from "../src";
import * as txService from '../src/lib/services/transaction-service';
import * as fetchers from '../src/fetchers';
import { getSafeTransactionFixture } from './fixtures';

// Baseline mock for this set of tests.
function standardMock(fetchType?: string) {
  jest.spyOn(fetchers, 'getPodFetchersByAddressOrEns').mockResolvedValueOnce({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Controller: { podAdmin: jest.fn().mockResolvedValueOnce('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41') },
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    podId: 5, // Arbitrary
    Name: { name: 'whatever.pod.eth' },
  });
  jest.spyOn(txService, 'getSafeInfo').mockResolvedValueOnce({ nonce: 1 });
  const mockGetSafeTransactions = jest.spyOn(txService, 'getSafeTransactionsBySafe').mockResolvedValueOnce(getSafeTransactionFixture(fetchType));
  return { mockGetSafeTransactions };
}

beforeAll(async () => {
  const provider = new ethers.providers.InfuraProvider('mainnet', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  init({ provider, network: 1 });
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('Pod.getProposals', () => {
  test('Pod.getProposals should return proposals reverse chronologically', async () => {
    standardMock();
    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
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

  test('Pod.getProposals can fetch queued proposals if requested', async () => {
    const { mockGetSafeTransactions } = standardMock('queued');

    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposals = await pod.getProposals({ queued: true });

    expect(proposals[0].id).toBeGreaterThan(1);
    expect(proposals.length).toBe(3);
    expect(mockGetSafeTransactions).toHaveBeenCalledWith('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41', { nonce_gte: 1, limit: 5 })
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
  });

  test('Proposal for smart contract function', async () => {
    standardMock('queued');
    const pod = await getPod('0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41');
    const proposal = (await pod.getProposals({ queued: true }))[0];

    expect(proposal.method).toBe('transfer');
    expect(proposal.parameters).toEqual(expect.arrayContaining([{
        name: 'to', 
        type: 'address',
        value: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
      },
      {
        name: 'tokens',
        type: 'uint256',
        value: '200',
      },
    ]))
  });
});

