import { ethers } from 'ethers';
import { config, getPodFetchersByAddress, getPodFetchersById } from './';
import { getDeployment } from '@orcaprotocol/contracts';
import axios from 'axios';
import ENS from '@ensdomains/ensjs';

export class Pod {

    /**
     * 
     * @param identifier Can be either podId or safe address
     * @returns 
     */
    constructor(identifier: string | number) {
      const { network } = config;
      // This is a kind of hacky way to go about an async constructor.
      // It works, typescript just doesn't like it.
      // @ts-ignore
      return (async () => {
        let podId: number;
        let safe: string;
        let Controller: ethers.Contract;
        let Name: ENS.Name;
        try {
          let fetchers;
          if (typeof identifier === 'string') {
            fetchers = await getPodFetchersByAddress(identifier);
          } else if (typeof identifier === 'number') {
            fetchers = await getPodFetchersById(identifier);
          }
          podId = fetchers.podId;
          safe = fetchers.safe;
          Controller = fetchers.Controller;
          Name = fetchers.Name;
        } catch (err) {
          return null;
        }

        const fetchedAdmin = await Controller.podAdmin(podId);
        this.admin = fetchedAdmin === ethers.constants.AddressZero ? null : fetchedAdmin;
        this.id = podId;
        this.safe = safe;
        this.ensName = Name.name;

        const baseUrl = `https://nft-wtk219-orca-protocol.vercel.app${network === 4 ? "/assets/testnet/" : "/assets/"}`;
        const image = `${baseUrl}${podId.toString(16).padStart(64, "0")}-image-no-text`;
        this.image = image;
        return this;
      })();
    }
    
    // These values will be fetched in the constructor
    id: number;
    safe: string;
    ensName: string;
    admin: string;
    image: string;
    // Cache for future calls.
    users?: string[];
    memberPods?: Pod[];

    async getUsers(): Promise<string[]> {
      const { subgraphUrl } = config;
      if (this.users) return this.users;
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
      this.users = users.length > 0 ? users.map(user => ethers.utils.getAddress(user.user.id)) : [];
      return this.users
    }

    async getMemberPods(): Promise<Pod[]> {
      if (this.memberPods) return this.memberPods;
      if (!this.users) await this.getUsers();
      // Filter out nulls, those are not pods.
      const pods = (await Promise.all(this.users.map(user => new Pod(user)))).filter(x => !!x);
      this.memberPods = pods;
      return this.memberPods;
    }
  }