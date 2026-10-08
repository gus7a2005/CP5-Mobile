import { ref, push, set, query, orderByKey, limitToLast, onValue, type Unsubscribe } from 'firebase/database';
import { rtdb } from './firebase';
import { apiRequest } from './apiClient';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';

// Cria (ou localiza) a conversa individual pela API. O id é sempre "uidA_uidB" ordenado.
export const openDirectConversation = (otherUid: string) =>
  apiRequest<{ conversationId: string }>('POST', '/conversations/direct', { otherUid });

export function parseMessage(id: string, conversationId: string, raw: unknown): ChatMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.senderId !== 'string' || typeof r.text !== 'string' || typeof r.createdAt !== 'number') return null;
  const t = r.target as { type?: unknown; memberId?: unknown } | undefined;
  const target: MessageTarget =
    t?.type === 'member' && typeof t.memberId === 'string'
      ? { type: 'member', memberId: t.memberId }
      : { type: 'conversation' };
  return {
    id,
    conversationId,
    conversationType: r.conversationType === 'group' ? 'group' : 'direct',
    senderId: r.senderId,
    text: r.text,
    target,
    mentionedUserIds: Array.isArray(r.mentionedUserIds) ? r.mentionedUserIds.map(String) : [],
    createdAt: r.createdAt,
  };
}

export function listenMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  const q = query(ref(rtdb, `messages/${conversationId}`), orderByKey(), limitToLast(100));
  return onValue(
    q,
    (snap) => {
      const list: ChatMessage[] = [];
      snap.forEach((child) => {
        const raw: unknown = child.val();
        const m = child.key ? parseMessage(child.key, conversationId, raw) : null;
        if (m) list.push(m);
      });
      onData(list);
    },
    onError,
  );
}

export type SendParams = {
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  mentionedUserIds: string[];
};

export async function sendMessage(p: SendParams): Promise<string> {
  const target: MessageTarget =
    p.mentionedUserIds.length === 1
      ? { type: 'member', memberId: p.mentionedUserIds[0] }
      : { type: 'conversation' };
  const r = push(ref(rtdb, `messages/${p.conversationId}`));
  await set(r, {
    conversationType: p.conversationType,
    senderId: p.senderId,
    text: p.text.trim(),
    target,
    ...(p.mentionedUserIds.length > 0 ? { mentionedUserIds: p.mentionedUserIds } : {}),
    createdAt: Date.now(),
  });
  if (!r.key) throw new Error('Falha ao gerar o id da mensagem.');
  return r.key;
}

export const requestPush = (conversationId: string, messageId: string) =>
  apiRequest<{ sent: number }>('POST', '/notifications/messages', { conversationId, messageId });