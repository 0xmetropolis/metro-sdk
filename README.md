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

### Types

Types can be imported as such:

```js
import { Pod, Proposal } from '@orcaprotocol/orca-sdk';
```

### Additional Documentation

Additional documentation can be found [here](https://orcaprotocol.github.io/orca-sdk/)

## Test Scripts

We have some test scripts to test approve/reject proposals and super proposals. They can be executed by duplicating the `env-examples.json` with private keys in `env.json`, and executing the transactions with `npx ts-node ./scripts/reject-superproposal.ts`. 
