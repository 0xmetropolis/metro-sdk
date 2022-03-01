import { ethers } from 'ethers';
import axios from 'axios';
import ENS from '@ensdomains/ensjs';
import { config } from './config';
import { getPodFetchersByAddress, getPodFetchersById } from './fetchers';

export default class Pod {
  /**
   *
   * @param identifier Can be either podId or safe address
   * @returns
   */
  constructor(identifier: string | number) {
    const { network } = config;
    // This is a kind of hacky way to go about an async constructor.
    // It works, typescript just doesn't like it.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return (async () => {
      let podId: number;
      let safe: string;
      let Controller: ethers.Contract;
      let Name: ENS.Name;
      try {
        let fetchers;
        if (typeof identifier === 'string') {
          const checkSummedAddress = ethers.utils.getAddress(identifier);
          fetchers = await getPodFetchersByAddress(checkSummedAddress);
        } else if (typeof identifier === 'number') {
          fetchers = await getPodFetchersById(identifier);
        }
        podId = fetchers.podId;
        safe = fetchers.safe;
        Controller = fetchers.Controller;
        Name = fetchers.Name;
      } catch (err) {
        if (err.message.includes('invalid address')) {
          throw new TypeError(`Non-address string passed to Pod constructor: '${identifier}'`);
        }
        return null;
      }

      const fetchedAdmin = await Controller.podAdmin(podId);
      this.admin = fetchedAdmin === ethers.constants.AddressZero ? null : fetchedAdmin;
      this.id = podId;
      this.safe = safe;
      this.ensName = Name.name;

      const baseUrl = `https://nft-wtk219-orca-protocol.vercel.app${
        network === 4 ? '/assets/testnet/' : '/assets/'
      }`;
      const imageUrl = `${baseUrl}${podId.toString(16).padStart(64, '0')}-image`;
      const imageNoTextUrl = `${baseUrl}${podId.toString(16).padStart(64, '0')}-image-no-text`;

      this.imageUrl = imageUrl;
      this.imageNoTextUrl = imageNoTextUrl;
      return this;
    })();
  }

  id: number;

  safe: string;

  ensName: string;

  admin: string;

  imageUrl: string;

  imageNoTextUrl: string;

  members?: string[];

  memberEOAs?: string[];

  memberPods?: Pod[];

  /**
   * Returns of list of all member addresses.
   * @returns string[]
   */
  async getMembers(): Promise<string[]> {
    const { subgraphUrl } = config;
    if (this.members) return this.members;
    const { data } = await axios.post(subgraphUrl, {
      query: `query GetPodUsers($id: ID!) {
            pod(id: $id) {
              users {
                user {
                  id
                }
              }
            }
          }`,
      variables: { id: this.id },
    });
    const { users } = data.data.pod || { users: [] };
    // console.log('users', users);
    this.members = users.length > 0 ? users.map(user => ethers.utils.getAddress(user.user.id)) : [];
    return this.members;
  }

  /**
   * Populates the memberEOAs and memberPods fields.
   * The process for fetching either of these fields is the same.
   */
  async populateMembers() {
    if (!this.members) await this.getMembers();

    const EOAs = [];
    const memberPods = (
      await Promise.all(
        this.members.map(async member => {
          const pod = await new Pod(member);
          // If pod is null, it's an EOA.
          if (!pod) {
            EOAs.push(member);
            return pod;
          }
          return pod;
        }),
      )
    ).filter(x => !!x); // Filter null values from memberPods.

    this.memberEOAs = EOAs;
    this.memberPods = memberPods;
  }

  /**
   * Returns list of all member EOAs, not including any smart contract/pod members.
   * @returns
   */
  async getMemberEOAs(): Promise<string[]> {
    if (this.memberEOAs) return this.memberEOAs;
    await this.populateMembers();
    return this.memberEOAs;
  }

  /**
   * Returns Pod objects of all member pods.
   * @returns Pod[]
   */
  async getMemberPods(): Promise<Pod[]> {
    if (this.memberPods) return this.memberPods;
    await this.populateMembers();
    return this.memberPods;
  }
}
