export class Pod {
    constructor() {
    }
    
    // These values will be fetched in the constructor
    id: string;
    safe: string;
    ensName: string;
    admin: string;
    image: string;
    // Cache for future calls.
    users: string[];
    memberPods: Pod[];

    async getUsers(): Promise<string[]> {
      return null;
    }

    async getMemberPods(options?: { nesting: number }): Promise<Pod[]> {
      return null;
    }
  }