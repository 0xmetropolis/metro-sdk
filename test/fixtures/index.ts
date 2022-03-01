export const userAddress = '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888';
export const orcanautAddress = '0x97F7Dcdf56934Cf87a2d5DF860fD881FA84ad142';

export const orcaCorePod = {
  id: 0,
  safe: '0x7bf660f3e287d2a05F46b72Ae69a048f3781Db90',
  imageUrl:
    'https://nft-wtk219-orca-protocol.vercel.app/assets/0000000000000000000000000000000000000000000000000000000000000000-image',
  imageNoTextUrl:
    'https://nft-wtk219-orca-protocol.vercel.app/assets/0000000000000000000000000000000000000000000000000000000000000000-image-no-text',
  admin: '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888',
  ensName: 'orca-core.pod.xyz',
};

export const orcanautPod = {
  id: 1,
  safe: orcanautAddress,
  imageUrl:
    'https://nft-wtk219-orca-protocol.vercel.app/assets/0000000000000000000000000000000000000000000000000000000000000001-image',
  imageNoTextUrl:
    'https://nft-wtk219-orca-protocol.vercel.app/assets/0000000000000000000000000000000000000000000000000000000000000001-image-no-text',
  admin: '0xcABB78f39Fbeb0CdFBD3C8f30E37630EB9e7A151',
  ensName: 'orcanauts.pod.xyz',
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

export const gqlGetMembers = {
  data: {
    data: {
      pod: {
        users: [
          { user: { id: '0x094A473985464098b59660B37162a284b5132753' } },
          { user: { id: '0x1cC62cE7cb56ed99513823064295761f9b7C856e' } },
          { user: { id: '0x403f69b1092cf1cB82487CD137F96E8200f03BD5' } },
          { user: { id: '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888' } },
          { user: { id: '0x653E430f15535B7C5C6f8Ae6FC514B28a6906438' } },
          { user: { id: '0x99B7f60Ba045c8810b2E22fcf9e89391490E17a0' } },
          { user: { id: '0xf065BdC0A5A92F34E9270F686355B5EA7b95bEBE' } },
        ],
      },
    },
  },
};
