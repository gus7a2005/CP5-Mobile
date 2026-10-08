export type Policy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';
export type MessageData = { senderId: string; mentionedUserIds: string[]; targetMemberId: string | null };
export type ConversationCtx =
  | { type: 'direct'; participantIds: string[] }
  | { type: 'group'; memberIds: string[]; policy: Policy };

export function resolveRecipients(ctx: ConversationCtx, m: MessageData): string[] {
  const notSender = (ids: string[]) => [...new Set(ids)].filter((id) => id !== m.senderId);
  if (ctx.type === 'direct') return notSender(ctx.participantIds);
  const members = new Set(ctx.memberIds);
  if (!members.has(m.senderId)) return [];
  switch (ctx.policy) {
    case 'all_group_messages': return notSender(ctx.memberIds);
    case 'mentioned_members': {
      const wanted = [...m.mentionedUserIds, ...(m.targetMemberId ? [m.targetMemberId] : [])];
      return notSender(wanted.filter((id) => members.has(id)));   // só participantes
    }
    case 'direct_messages_only':
    case 'disabled': return [];
  }
}