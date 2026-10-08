import { apiRequest } from './apiClient';
import type { GroupInput } from '../types/group';
import type { NotificationPolicy } from '../types/notification';

export const createGroup = (input: GroupInput) => apiRequest<{ id: string }>('POST', '/groups', input);
export const updateGroup = (id: string, patch: Partial<{ name: string; photoUrl: string; memberLimit: number; notificationPolicy: NotificationPolicy }>) =>
  apiRequest<{ ok: true }>('PATCH', `/groups/${id}`, patch);
export const addMember = (id: string, uid: string) => apiRequest<{ ok: true }>('POST', `/groups/${id}/members`, { uid });
export const removeMember = (id: string, uid: string) => apiRequest<{ ok: true }>('DELETE', `/groups/${id}/members/${uid}`);
export const setPolicy = (id: string, p: NotificationPolicy) => updateGroup(id, { notificationPolicy: p });
export const setLimit = (id: string, n: number) => updateGroup(id, { memberLimit: n });