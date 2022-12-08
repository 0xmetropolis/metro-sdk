import { ethers } from 'ethers';
import { customSubgraphQuery, getUserPods, init, podifySafe } from '../src';
import { getPod, multiPodCreate } from '../src';
import { accountOne, accountTwo, adminPodAddress, dummyAccount } from '../env.json';
import { setup, sleep } from './utils';

const members = [
  '0xf0C7d25c942264D6F21871c05d3dB3b98344b499', // Will
  '0x4B4C43F66ec007D1dBE28f03dAC975AAB5fbb888', // John
  '0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d', // Mike
  '0x61De0bbb6C8215Af3f821FE4884A28bc737f98D3', // Kevin
  '0x76180A9ff1fd1EE37873717C7624E8c779cCf4f3', // Daniel
  '0x094A473985464098b59660B37162a284b5132753', // Chun
];

const multiPodInput = [
  {
    label: '0-pod',
    members: [
      '1-root-as-admin',
      '1-with-admin',
      '1-without-admin',
      '1-sc-as-admin',
      '1-root-as-admin-member-pod',
      '1-member-pods',
    ],
    threshold: 1,
    admin: accountOne,
  },
  {
    label: '1-root-as-admin',
    members,
    admin: '0-pod',
    threshold: 1,
  },
  {
    label: '1-with-admin',
    admin: accountOne,
    members,
    threshold: 1,
  },
  {
    label: '1-without-admin',
    members,
    threshold: 1,
  },
  {
    label: '1-sc-as-admin',
    members,
    admin: '0x65bDD090C551D470f3dD8D4c401EC43c0eC4e9cA', // Goerli Invite Token
    threshold: 1,
  },
  {
    label: '1-root-as-admin-member-pod',
    members,
    threshold: 1,
  },
  {
    label: '1-member-pods',
    members: ['2-with-admin', '2-without-admin'].concat(members),
    admin: accountOne,
    threshold: 1,
  },
  {
    label: '2-with-admin',
    members,
    admin: accountOne,
    threshold: 1,
  },
  {
    label: '2-without-admin',
    members,
    threshold: 1,
  },
];

async function main() {
  const { walletOne } = setup(5);

  const pod = await getPod('1-member-pods.pod.eth');
  console.log('pod', pod);
  const personas = await pod.getPersonas('0x85760ef61c0ccB7BCC4C7A0116d80D59D92e736d');
  console.log('personas', personas);
}

main();
