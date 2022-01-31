import { Pod } from "./Pod";

const config = {
  provider: null,
};

function init({ provider }) {
  config.provider = provider;
}

async function getPod(address: string): Promise<Pod> {
  return null;
};
async function getUserPods(address: string): Promise<Pod[]> {
  return null;
};

export {
  init,
  getPod,
  getUserPods,
}