import type { NotificationPolicy } from './notification';

export type ChatGroup = {
  id: string; name: string; photoUrl: string; ownerId: string; memberIds: string[];
  memberLimit: number; notificationPolicy: NotificationPolicy; createdAt: number; updatedAt: number;
};
export type GroupInput = {
  name: string; photoUrl: string; memberLimit: number;
  notificationPolicy: NotificationPolicy; memberIds: string[];
};
