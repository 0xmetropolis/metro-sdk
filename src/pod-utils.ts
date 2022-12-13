import type Pod from './Pod';

// Functions are put here so that they can be mocked for testing purposes.

// eslint-disable-next-line import/prefer-default-export
export async function getPersonas(
  pod: Pod,
  address: string,
): Promise<Array<{ type: string; address: string }>> {
  const personas = [];
  if (pod.isAdmin(address)) personas.push({ type: 'admin', address });
  if (await pod.isAdminPodMember(address))
    personas.push({ type: 'adminPodMember', address: pod.admin });
  if (await pod.isMember(address)) personas.push({ type: 'member', address });

  const memberSubPods = await pod.getSubPodsByMember(address);
  memberSubPods.forEach(subPod => {
    personas.push({ type: 'subPodMember', address: subPod.safe });
  });
  return personas;
}
