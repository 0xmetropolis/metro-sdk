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
// Returns null if no such pod exists.
const pod = await getPod('mypod.pod.xyz');
const pod2  = await getPod('0x123456');
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

Users and sub-pods can be fetched with the following functions:

### getUsers()

Fetches the list of users from the pod, including pods, as an array of ethereum addresses.

```js
const pod = await getPod(podAddress);
const users = await pod.getUsers();

console.log(users[0]);
// Outputs '0x25f55d2e577a937433686a01439e5ffdffe62218';
```

### getMemberPods()

Fetches Pod objects for any child pods.

```js
const pod = await getPod(podAddress);
const memberPods = await pod.getMemberPods();

console.log(memberPods[0].ensName);
// e.g., 'orcanauts.pod.xyz'
```
