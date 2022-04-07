# orca-sdk

## Getting Started

Initialize the SDK with the init function on startup:

```js
import { init } from '@orcaprotocol/orca-sdk';

// Any ethers provider works.
// 1 for mainnet, 4 for rinkeby.
// Make sure that the provider is instantiated before the SDK
init({ provider: ethers.getDefaultProvider(), network: 1 });
```

Once you init the SDK, you can call `getPod()`, `getUserPods()`, or `getAdminPods()` anywhere to fetch Pod objects.

```js
import { getPod, getUserPods, getAdminPods } from '@orcaprotocol/orca-sdk';

// ENS names also work for the below.
const podFromEnsName = await getPod('mypod.pod.xyz');
const podFromAddress = await getPod('0x123...456');
const podFromId = await getPod(1);
// Returns null
const notAPod = await getPod('not a pod');

// Fetches all Pods that a user is a member of
const userPods = await getUserPods(userAddress);

// Fetches all Pods that a user is an admin of
const adminPods = await getAdminPods(adminAddress);
```

## Types

Types can be imported as such:

```js
import { Pod, Proposal } from '@orcaprotocol/orca-sdk';
```

## Pod

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

You can also check if a user is a member, admin, or member of those pods with the following functions:

```js
const pod = await getPod(podAddress);

const isMember = await pod.isMember(userAddress);
// Not an async function
const isAdmin = pod.isAdmin(userAddress);

const isAdminPodMember = await pod.isAdminPodMember(userAddress);

// Includes both pods and users as sub pod members.
const isSubPodMember = await pod.isSubPodMember(userAddress);
```

### Member management

Pod members are managed via the MemberToken contract. The Pod object provides several methods to interact with this contract.

Pod admins can mint/burn members directly via the `mintMember()` and `burnMember()` functions. These functions will call the MemberToken contract directly and create a transaction.

```js
const pod = await getPod(podAddress);

// This signer must be the admin of the pod.
await pod.mintMember(newMember, signer);
await pod.burnMember(memberToBurn, signer);
```

Pod members can instead create proposals to mint/burn members:

```js
const pod = await getPod(podAddress);

// Signer must be a member of the pod.
await pod.proposeMintMember(newMember, signer);
await pod.proposeBurnMember(memberToBurn, signer);
```

Pod members can also be managed by admin and subpods (i.e., pods who are members of a given pod);

```js
const ourPod = await getPod(podAddress);
// This is the admin of our pod
const adminPod = await getPod(adminPodAddress);
// This is a member of our pod.
const subPod = await getPod(subPodAddress);

// This will create a proposal on the admin pod to mint a new member to our pod.
// Signer must be a member of adminPod
await ourPod.proposeMintFromPod(adminPod, newMember, signer);
// This will create a proposal on the subpod to mint a new member to our pod.
// Signer must be a member of subPod
await ourPod.proposeMintFromPod(subPod, newMember, signer);
```
