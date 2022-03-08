# orca-sdk

## Getting Started

Initialize the SDK with the init function:

```js
import { init } from '@orcaprotocol/sdk';

// Any ethers provider works.
// 1 for mainnet, 4 for rinkeby.
init({ provider: ethers.getDefaultProvider(), network: 1 });
```

Once you init the SDK, you can call `getPod()` or `getUserPods()` anywhere to fetch Pod objects.

```js
import { getPod, getUserPods } from '@orcaprotocol/sdk';

// ENS names also work for the below.
const podFromEnsName = await getPod('mypod.pod.xyz');
const podFromAddress = await getPod('0x123...456');
const podFromId = await getPod(1);
// Returns null
const notAPod = await getPod('not a pod');

const userPods = await getUserPods(userAddress);
```

## Pod Object

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

### getMembers()

Fetches the list of all members from the pod, including pods, as an array of Ethereum addresses.

```js
const pod = await getPod(podAddress);
const members = await pod.getMembers();

console.log(members[0]);
// Outputs '0x25f55d2e577a937433686a01439e5ffdffe62218';
```

### getMemberEOAs()

Fetches any member EOAs (externally owned accounts). That is, any member that is not a smart contract or pod.

```js
const pod = await getPod(podAddress);
const EOAs = await pod.getMemberEOAs();

console.log(EOAs[0]);
// Outputs '0x25f55d2e577a937433686a01439e5ffdffe62218';
```

### getMemberPods()

Fetches Pod objects for any member pods.

```js
const pod = await getPod(podAddress);
const memberPods = await pod.getMemberPods();

console.log(memberPods[0].ensName);
// e.g., 'orcanauts.pod.xyz'
```
