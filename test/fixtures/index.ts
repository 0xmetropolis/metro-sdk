import { getDeployment } from '@orcaprotocol/contracts';

export const userAddress = '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888';
export const userAddress2 = '0x1cC62cE7cb56ed99513823064295761f9b7C856e';
export const userAddress3 = '0x47a842347E40C5bA9Ce653f3150A316622932fc1';
export const orcanautAddress = '0x97F7Dcdf56934Cf87a2d5DF860fD881FA84ad142';
export const { address: memberTokenAddress } = getDeployment('MemberToken', 1);

export const podIds = [10, 11];

export const orcaCorePod = {
  id: 0,
  safe: '0x7bf660f3e287d2a05F46b72Ae69a048f3781Db90',
  imageUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/0000000000000000000000000000000000000000000000000000000000000000-image',
  imageNoTextUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/0000000000000000000000000000000000000000000000000000000000000000-image-no-text',
  admin: '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888',
  ensName: 'orca-core.pod.xyz',
};

export const orcanautPod = {
  id: 1,
  safe: orcanautAddress,
  imageUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/0000000000000000000000000000000000000000000000000000000000000001-image',
  imageNoTextUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/0000000000000000000000000000000000000000000000000000000000000001-image-no-text',
  admin: '0x094A473985464098b59660B37162a284b5132753',
  ensName: 'orcanauts.pod.xyz',
  members: [
    '0x094A473985464098b59660B37162a284b5132753',
    '0x25F55d2e577a937433686A01439E5fFdffe62218',
    '0x46E69D6801d4E09360Ab62A638849D72623A2e7E',
    '0x4846162806B025Dcd0759cACF9ec6F9474274282',
    '0x7aAef56837f37965fb410F4901bDC1172870e2F8',
    '0x7B54195b743BF76c314e9dBDDf110F5a22743998',
    '0x7f08D6A56b7B6f75eb8c628384855b82D2Ab18C8',
    '0x7f33BeaA131a6896B97E27c505c532cE40f88f33',
    '0x88d3767814FDE34891dD84D1A950310aB3D1ca96',
    '0xAfBb354FF03E17b1EffBaF661FFca106ba78b966',
    '0xc9fef0515d141bB86a13f362e853D7CfabCF29a4',
  ],
};

export const artNautPod = {
  admin: '0x094A473985464098b59660B37162a284b5132753',
  id: 6,
  safe: '0x25F55d2e577a937433686A01439E5fFdffe62218',
  ensName: 'art-naut.pod.xyz',
  imageUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/0000000000000000000000000000000000000000000000000000000000000006-image',
  imageNoTextUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/0000000000000000000000000000000000000000000000000000000000000006-image-no-text',
  members: [
    '0x094A473985464098b59660B37162a284b5132753',
    '0x29864e4d1588C4164DEe7cc495147Ec141f9c9d5',
    '0x2cecb3B75bc8dFb22725ff657062C47d6ddD4629',
    '0x46E69D6801d4E09360Ab62A638849D72623A2e7E',
    '0x4846162806B025Dcd0759cACF9ec6F9474274282',
    '0xb4fbd802d9dc5C0208346c311BCB6B9ECFF468C6',
  ],
};

export const metropolis1WithAdminPod = {
  admin: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
  id: 10,
  safe: '0x17CAc2cEe6dBC775aeD64A5E30d5B6CA9c200BaB',
  ensName: '1-with-admin.pod.eth',
  imageUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/000000000000000000000000000000000000000000000000000000000000000a-image',
  imageNoTextUrl:
    'https://metropolis-nft.herokuapp.com/assets/5/000000000000000000000000000000000000000000000000000000000000000a-image-no-text',
  members: [
    '0x094A473985464098b59660B37162a284b5132753',
    '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888',
    '0x61De0bbb6C8215Af3f821FE4884A28bc737f98D3',
    '0x76180A9ff1fd1EE37873717C7624E8c779cCf4f3',
    '0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d',
    '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
  ],
};

/**
 * Turns arrays into the stupid format that GQL returns
 */
export const constructGqlGetUsers = (input: string[]) => {
  const converted = input.map(element => {
    return { user: { id: element } };
  });
  return {
    data: {
      data: {
        pod: {
          users: converted,
        },
      },
    },
  };
};

export const gqlGetUsers = {
  data: {
    data: {
      pod: {
        users: [
          { user: { id: '0x25f55d2e577a937433686a01439e5ffdffe62218' } },
          { user: { id: '0x46e69d6801d4e09360ab62a638849d72623a2e7e' } },
          { user: { id: '0x4846162806b025dcd0759cacf9ec6f9474274282' } },
          { user: { id: '0x7aaef56837f37965fb410f4901bdc1172870e2f8' } },
          { user: { id: '0x7b54195b743bf76c314e9dbddf110f5a22743998' } },
          { user: { id: '0x7f08d6a56b7b6f75eb8c628384855b82d2ab18c8' } },
          { user: { id: '0x7f33beaa131a6896b97e27c505c532ce40f88f33' } },
          { user: { id: '0xafbb354ff03e17b1effbaf661ffca106ba78b966' } },
          { user: { id: '0xcabb78f39fbeb0cdfbd3c8f30e37630eb9e7a151' } },
        ],
      },
    },
  },
};

export const gqlGetUserPods = {
  data: {
    data: {
      user: {
        pods: [{ pod: { id: 0 } }, { pod: { id: 2 } }, { pod: { id: 3 } }],
      },
    },
  },
};

export const gqlGetUserPodsEmpty = {
  data: {
    data: {
      user: {
        pods: [],
      },
    },
  },
};

export const erc20TransferTransaction = {
  safe: '0x66703b7696845BC112BD2ee562403E6868BeA761',
  to: '0xaFF4481D10270F50f203E0763e2597776068CBc5',
  value: '0',
  data: '0xa9059cbb0000000000000000000000003f4e2cfe11aa607570e0aee7ac74fbff9633fa8e0000000000000000000000000000000000000000000000004563918244f40000',
  operation: 0,
  gasToken: '0x0000000000000000000000000000000000000000',
  safeTxGas: 51900,
  baseGas: 0,
  gasPrice: '0',
  refundReceiver: '0x0000000000000000000000000000000000000000',
  nonce: 5,
  executionDate: null,
  submissionDate: '2021-07-28T21:06:55.940821Z',
  modified: '2021-07-28T21:06:55.957846Z',
  blockNumber: null,
  transactionHash: null,
  safeTxHash: '0xa382f3f9a3fc80b8694b97906354918858b8e5c8147304ff4dc6311f95ac2b93',
  executor: null,
  isExecuted: false,
  isSuccessful: null,
  ethGasPrice: null,
  gasUsed: null,
  fee: null,
  origin: null,
  dataDecoded: {
    method: 'transfer',
    parameters: [
      {
        name: 'to',
        type: 'address',
        value: '0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E',
      },
      {
        name: 'value',
        type: 'uint256',
        value: '5000000000000000000',
      },
    ],
  },
  confirmationsRequired: null,
  confirmations: [
    {
      owner: '0x3f4e2cFE11Aa607570E0Aee7AC74fbff9633fa8E',
      submissionDate: '2021-07-28T21:06:55.957846Z',
      transactionHash: null,
      signature:
        '0x542500ca06dccca5cf3f6764c17efb9a5f414ef1cd80d6dee8e7cc4dd981f72227b25895f74faa7962077b4c86e9cb33914a844f7a0923917244ce377c813ab41c',
      signatureType: 'EOA',
    },
  ],
  signatures: null,
};

export function getSafeTransactionFixture(fetchType?: string) {
  if (fetchType === 'queued') return safeTransactions;
  if (fetchType === 'subProposal') return subProposalFixture;
  if (fetchType === 'empty') return [];
  // Skip first unqueued transaction.
  return safeTransactions.slice(1);
}

const safeTransactions = [
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0x1f9061B953bBa0E36BF50F21876132DcF276fC6e',
    value: '0',
    data: '0xa9059cbb0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e00000000000000000000000000000000000000000000000000000000000000c8',
    operation: 0,
    gasToken: '0x0000000000000000000000000000000000000000',
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 2,
    executionDate: null,
    submissionDate: '2022-04-12T19:33:28.876966Z',
    modified: '2022-04-12T19:33:28.910753Z',
    blockNumber: null,
    transactionHash: null,
    safeTxHash: '0x67ce671d9bdb9abe31ad3fe521176ff8ccdea5b87c392c609ce425257fcea6a4',
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    ethGasPrice: null,
    gasUsed: null,
    fee: null,
    origin: null,
    dataDecoded: {
      method: 'transfer',
      parameters: [
        {
          name: 'to',
          type: 'address',
          value: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
        },
        { name: 'tokens', type: 'uint256', value: '200' },
      ],
    },
    confirmationsRequired: null,
    confirmations: [
      {
        owner: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
        submissionDate: '2022-04-12T19:33:28.910753Z',
        transactionHash: null,
        signature:
          '0x2e891bd88745e12f837ed97f2113f71efe044123c1a3f2b102db4115cf95d7585b4916c571ff70044a9701746df6fee34e58c35ae3d73103f78ec3bee87416761b',
        signatureType: 'EOA',
      },
    ],
    trusted: true,
    signatures: null,
  },
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    value: '0',
    data: null,
    operation: 0,
    gasToken: '0x0000000000000000000000000000000000000000',
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 1,
    executionDate: null,
    submissionDate: '2022-04-12T18:23:49.987318Z',
    modified: '2022-04-12T18:23:50.052840Z',
    blockNumber: null,
    transactionHash: null,
    safeTxHash: '0xbc3b35fb05ffa1c464b3702113ab6c4c7423ad3f5371b799d10ca16936dc5efa',
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    ethGasPrice: null,
    gasUsed: null,
    fee: null,
    origin: null,
    dataDecoded: null,
    confirmationsRequired: null,
    confirmations: [
      {
        owner: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
        submissionDate: '2022-04-12T18:23:50.052840Z',
        transactionHash: null,
        signature:
          '0xb0e2093a113e4389489c20c1333db89adeccae2bcca34e6f1e8c2b8c6bd57b8c44a8fed0fb1e95047457ad942b0d9a7b341ddb6719ad131507642e670755cf971c',
        signatureType: 'EOA',
      },
    ],
    trusted: true,
    signatures: null,
  },
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
    value: '125000000000000000',
    data: null,
    operation: 0,
    gasToken: '0x0000000000000000000000000000000000000000',
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 1,
    executionDate: null,
    submissionDate: '2022-04-12T18:22:06.988506Z',
    modified: '2022-04-12T18:22:07.034098Z',
    blockNumber: null,
    transactionHash: null,
    safeTxHash: '0xf23a6630c2a51d9b69c9acbbf16d5d1db5f7ccd7b3edd3350ed83ab3423eaf73',
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    ethGasPrice: null,
    gasUsed: null,
    fee: null,
    origin: null,
    dataDecoded: null,
    confirmationsRequired: null,
    confirmations: [
      {
        owner: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
        submissionDate: '2022-04-12T18:22:07.034098Z',
        transactionHash: null,
        signature:
          '0x77ed4ded93e2d34ed38aaf05033e3efd87a86caf2e5cede37c326b52121e3e8e6c3740e4ab94576062369854e2c44508b397be4bd31efc1a289aa3abafd6e68c1b',
        signatureType: 'EOA',
      },
    ],
    trusted: true,
    signatures: null,
  },
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
    value: '100000000000000000',
    data: null,
    operation: 0,
    gasToken: '0x0000000000000000000000000000000000000000',
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    nonce: 0,
    executionDate: '2022-04-12T18:17:29Z',
    submissionDate: '2022-04-12T18:17:09.391899Z',
    modified: '2022-04-12T18:17:29Z',
    blockNumber: 10492881,
    transactionHash: '0x4bca81e058e536081419225ed34a39491b5c803fa65e249edd978ca2760591bd',
    safeTxHash: '0xeab8250c4c80e864d97d7ed629c4c470faba6aac074d0e9ebe089216d0f8acb2',
    executor: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
    isExecuted: true,
    isSuccessful: true,
    ethGasPrice: '1500000011',
    gasUsed: 77992,
    fee: '116988000857912',
    origin: null,
    dataDecoded: null,
    confirmationsRequired: 1,
    confirmations: [
      {
        owner: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
        submissionDate: '2022-04-12T18:17:29Z',
        transactionHash: null,
        signature:
          '0x0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e000000000000000000000000000000000000000000000000000000000000000001',
        signatureType: 'APPROVED_HASH',
      },
    ],
    trusted: true,
    signatures:
      '0x0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e000000000000000000000000000000000000000000000000000000000000000001',
  },
];

const subProposalFixture = [
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E',
    value: '0',
    data: '0xd4d9bdcdbc9840f7f81374dd6b1f8015d1fb7a3a7c2327c23196628348a31abd968cf99c',
    operation: 0,
    gasToken: null,
    safeTxGas: 109160,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: null,
    nonce: 38,
    executionDate: '2022-04-29T17:10:59Z',
    submissionDate: '2022-04-29T17:10:50.185340Z',
    modified: '2022-04-29T17:11:17.390292Z',
    blockNumber: 10589857,
    transactionHash: '0x3ee16adba254e93315d04ef1d17db51bc8f321c2be819ce6bcf8e341dcd9b5eb',
    safeTxHash: '0x3789c6928fbb0c335919c56cde2a3b4ff9a7ee8e343b514a04ddadb7a1b6e9b1',
    executor: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
    isExecuted: true,
    isSuccessful: true,
    ethGasPrice: '7975823969',
    maxFeePerGas: '14145029526',
    maxPriorityFeePerGas: '1500000000',
    gasUsed: 90603,
    fee: '722633579063307',
    origin: null,
    dataDecoded: {
      method: 'approveHash',
      parameters: [
        {
          name: 'hashToApprove',
          type: 'bytes32',
          value: '0xbc9840f7f81374dd6b1f8015d1fb7a3a7c2327c23196628348a31abd968cf99c',
        },
      ],
    },
    confirmationsRequired: 1,
    confirmations: [
      {
        owner: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
        submissionDate: '2022-04-29T17:10:50.590010Z',
        transactionHash: null,
        signature:
          '0xd07dd94098fe82c053d18d6b22c8666817f388bfe58034d023f58b6ff6ab958f1fd5561a7ea733c9076e692a8b87247308a4175477525f0057d5997ac808fe3420',
        signatureType: 'ETH_SIGN',
      },
    ],
    trusted: true,
    signatures:
      '0xd07dd94098fe82c053d18d6b22c8666817f388bfe58034d023f58b6ff6ab958f1fd5561a7ea733c9076e692a8b87247308a4175477525f0057d5997ac808fe3420',
  },
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E',
    value: '0',
    data: '0xd4d9bdcd2e25c70fbb536eb1f64746dd0bdda89d72576dc05910053dae9afd76e481f98d',
    operation: 0,
    gasToken: null,
    safeTxGas: 109160,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: null,
    nonce: 38,
    executionDate: null,
    submissionDate: '2022-04-29T17:10:42.848580Z',
    modified: '2022-04-29T17:10:43.494865Z',
    blockNumber: null,
    transactionHash: null,
    safeTxHash: '0xd7c095b5bc6a9d34295b4c620be5adef3acacd0a20c9cd45099d0ae38a27d556',
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    ethGasPrice: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    gasUsed: null,
    fee: null,
    origin: null,
    dataDecoded: {
      method: 'approveHash',
      parameters: [
        {
          name: 'hashToApprove',
          type: 'bytes32',
          value: '0x2e25c70fbb536eb1f64746dd0bdda89d72576dc05910053dae9afd76e481f98d',
        },
      ],
    },
    confirmationsRequired: 1,
    confirmations: [
      {
        owner: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
        submissionDate: '2022-04-29T17:10:43.494865Z',
        transactionHash: null,
        signature:
          '0xfbcc82bf8b9fe4c708ec01f3d72f7cc9efbfade483f2fd5f9630b94fe4669c3b5696e03d2ea0b69d2b3f9ebbc2689a8891c8a267331d53eaee6b57809576c7261f',
        signatureType: 'ETH_SIGN',
      },
    ],
    trusted: true,
    signatures: null,
  },
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E',
    value: '0',
    data: '0xd4d9bdcd2734e0ad044c85994633c20675336aa75b626e4ec6f466c95c7fa90ae2bfef00',
    operation: 0,
    gasToken: null,
    safeTxGas: 109148,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: null,
    nonce: 37,
    executionDate: '2022-04-29T16:04:16Z',
    submissionDate: '2022-04-29T16:04:01.703511Z',
    modified: '2022-04-29T16:05:05.938327Z',
    blockNumber: 10589591,
    transactionHash: '0x2c8593c35c448b3921bfc786b99b9eaace22cad064bf6e772762b9f58e6168e4',
    safeTxHash: '0x12d3e2f358ae76d87726fc79aa3df4f0a51f31d19f0ef647f6cf1e7e09819884',
    executor: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
    isExecuted: true,
    isSuccessful: true,
    ethGasPrice: '28492731350',
    maxFeePerGas: '54072306826',
    maxPriorityFeePerGas: '1500000000',
    gasUsed: 90603,
    fee: '2581526938504050',
    origin: null,
    dataDecoded: {
      method: 'approveHash',
      parameters: [
        {
          name: 'hashToApprove',
          type: 'bytes32',
          value: '0x2734e0ad044c85994633c20675336aa75b626e4ec6f466c95c7fa90ae2bfef00',
        },
      ],
    },
    confirmationsRequired: 1,
    confirmations: [
      {
        owner: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
        submissionDate: '2022-04-29T16:04:02.191133Z',
        transactionHash: null,
        signature:
          '0x0bcaf8c819b5f8ebff8cf490776e7fdff523b1c118ee9a7799ab39332e7f1e872cafb05aa829faa8012a93a62125ba0afe53f8a701a1c8f8e0de2636d362201e1f',
        signatureType: 'ETH_SIGN',
      },
    ],
    trusted: true,
    signatures:
      '0x0bcaf8c819b5f8ebff8cf490776e7fdff523b1c118ee9a7799ab39332e7f1e872cafb05aa829faa8012a93a62125ba0afe53f8a701a1c8f8e0de2636d362201e1f',
  },
  {
    safe: '0x4d3ba1AdabA15796CC3d11E48e8EC28e3A5F7C41',
    to: '0xBe71ECaA104645ab78ed62A52763b2854e6DaD2E',
    value: '0',
    data: '0xd4d9bdcdd4eb322d9d2c4dfeedc4e55a7e254a17bc46a65412adf4f69b23e251f7cce017',
    operation: 0,
    gasToken: null,
    safeTxGas: 109160,
    baseGas: 0,
    gasPrice: '0',
    refundReceiver: null,
    nonce: 37,
    executionDate: null,
    submissionDate: '2022-04-29T16:02:49.935460Z',
    modified: '2022-04-29T16:02:50.685863Z',
    blockNumber: null,
    transactionHash: null,
    safeTxHash: '0x9ac037441a387edd1a25a127e538f2efb526458647297225bd0febbbc5a777e7',
    executor: null,
    isExecuted: false,
    isSuccessful: null,
    ethGasPrice: null,
    maxFeePerGas: null,
    maxPriorityFeePerGas: null,
    gasUsed: null,
    fee: null,
    origin: null,
    dataDecoded: {
      method: 'approveHash',
      parameters: [
        {
          name: 'hashToApprove',
          type: 'bytes32',
          value: '0xd4eb322d9d2c4dfeedc4e55a7e254a17bc46a65412adf4f69b23e251f7cce017',
        },
      ],
    },
    confirmationsRequired: 1,
    confirmations: [
      {
        owner: '0xf0C7d25c942264D6F21871c05d3dB3b98344b499',
        submissionDate: '2022-04-29T16:02:50.685863Z',
        transactionHash: null,
        signature:
          '0x670f320e8bf16fd71ae98bd612006c5d980d010ff51e1b226adb344a7f3531050f97600858ac0ed3c4cbfc0689f2d1c989a83a8a8ac0e27675dd7fe2e0ae68d01f',
        signatureType: 'ETH_SIGN',
      },
    ],
    trusted: true,
    signatures: null,
  },
];

export const enableModuleSafeTx = {
  safe: '0x49E55999e9c47589Fd953747edffA1a754d9f8B5',
  to: '0x49E55999e9c47589Fd953747edffA1a754d9f8B5',
  value: '0',
  data: '0x610b592500000000000000000000000011e2d4c75b9803ff5d6da8c30b354b44992e0248',
  operation: 0,
  gasToken: '0x0000000000000000000000000000000000000000',
  safeTxGas: 0,
  baseGas: 0,
  gasPrice: '0',
  refundReceiver: '0x0000000000000000000000000000000000000000',
  nonce: 0,
  executionDate: '2022-01-26T18:01:37Z',
  submissionDate: '2022-01-26T18:01:25.726016Z',
  modified: '2022-01-26T18:01:37Z',
  blockNumber: 10059884,
  transactionHash: '0xa00e81f88f4cb3df006779007424cc469ecc6bdfbac753dba383cfdb03ad97c1',
  safeTxHash: '0x6723fd3b412953fe3a2c9c776805287d9c914964bc761604cbe73419f6169e80',
  executor: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
  isExecuted: true,
  isSuccessful: true,
  ethGasPrice: '2670677244',
  maxFeePerGas: null,
  maxPriorityFeePerGas: null,
  gasUsed: 75937,
  fee: '202803217877628',
  origin: '{"url":"https://gnosis-zodiac-app.netlify.app/","name":"Zodiac"}',
  dataDecoded: {
    method: 'enableModule',
    parameters: [
      {
        name: 'module',
        type: 'address',
        value: '0x4C98aF741e352C6551BfF9509b3f8ca9Dd4E6397',
      },
    ],
  },
  confirmationsRequired: 1,
  confirmations: [
    {
      owner: '0x1cC62cE7cb56ed99513823064295761f9b7C856e',
      submissionDate: '2022-01-26T18:01:37Z',
      transactionHash: null,
      signature:
        '0x0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e000000000000000000000000000000000000000000000000000000000000000001',
      signatureType: 'APPROVED_HASH',
    },
  ],
  trusted: true,
  signatures:
    '0x0000000000000000000000001cc62ce7cb56ed99513823064295761f9b7c856e000000000000000000000000000000000000000000000000000000000000000001',
};
