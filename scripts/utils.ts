import { ethers } from 'ethers';
import { init } from '../src';
import { accountOnePrivateKey, accountTwoPrivateKey } from '../env.json';

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function setup() {
  const provider = new ethers.providers.InfuraProvider('rinkeby', {
    infura: '69ecf3b10bc24c6a972972666fe950c8',
  });
  init({ provider, network: 4 });

  // Get two accounts
  const walletOne = new ethers.Wallet(accountOnePrivateKey, provider);
  const walletTwo = new ethers.Wallet(accountTwoPrivateKey, provider);
  return { walletOne, walletTwo };
}
