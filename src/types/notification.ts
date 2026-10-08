export type NotificationPolicy =
  | 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';
export type NotificationSettings = {
  conversationId: string; policy: NotificationPolicy; updatedBy: string; updatedAt: number;
};
