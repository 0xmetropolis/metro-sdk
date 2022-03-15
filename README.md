# orca-sdk

## Getting Started

Initialize the SDK with the init function:

```js
import { init } from '@orcaprotocol/orca-sdk';

// Any ethers provider works.
// 1 for mainnet, 4 for rinkeby.
init({ provider: ethers.getDefaultProvider(), network: 1 });
```

Once you init the SDK, you can call `getPod()` or `getUserPods()` anywhere to fetch Pod objects.

```js
import { getPod, getUserPods } from '@orcaprotocol/orca-sdk';

// ENS names also work for the below.
const podFromEnsName = await getPod('mypod.pod.xyz');
const podFromAddress = await getPod('0x123...456');
const podFromId = await getPod(1);
// Returns null
const notAPod = await getPod('not a pod');

const userPods = await getUserPods(userAddress);
```

## Types

Types can be imported as such:

```js
import { Pod, Proposal } from '@orcaprotocol/orca-sdk/types';
```

### Pod

The `Pod` object is the interface for fetching pod data.

The following properties are on the object itself:

```js
const {
  id, // Pod ID
  safe, // Gnosis safe address, aka the Pod address
  ensName, // E.g., orcanauts.pod.xyz
  admin, // Address of pod admin
  imageUrl, // Source of NFT image
  imageNoTextUrl, // Source of NFT image without text (used for avatars)
} = await getPod();
```

Members, EOAs and member Pods can be fetched with the following functions:

```js
const pod = await getPod(podAddress);
// Fetches list of all members from the pod, as an array of Ethereum addresses.
// This includes any pods that may be members of the original pods.
const members = await pod.getMembers();

// Fetches any member EOAs (externally owned accounts). That is, any member that is not a smart contract or pod.
const memberEOAs = await pod.getMemberEOAs();

// Fetches Pod objects for any member pods.
const memberPods = await pod.getMemberPods();
```

You can also check if a user is a member, admin, or member of a subpod with the following functions:

```js
const pod = await getPod(podAddress);

const isMember = await pod.isMember(userAddress);
// Not an async function
const isAdmin = pod.isAdmin(userAddress);

// Includes both pods and users as sub pod members.
const isSubPodMember = await pod.isSubPodMember(userAddress);
```
