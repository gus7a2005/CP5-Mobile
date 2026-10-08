export type ConversationType = 'direct' | 'group';
export type MessageTarget = { type: 'conversation' } | { type: 'member'; memberId: string };
export type ChatMessage = {
  id: string; conversationId: string; conversationType: ConversationType;
  senderId: string; text: string; target: MessageTarget;
  mentionedUserIds: string[]; createdAt: number;
};
export type DirectConversation = {
  id: string; type: 'direct'; participantIds: string[]; createdAt: number;
};
