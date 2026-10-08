import { useCallback, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { listenMessages, sendMessage, requestPush } from '../services/chatService';
import type { ChatMessage, ConversationType } from '../types/chat';

export function useChat(conversationId: string, conversationType: ConversationType, uid: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setLoading(true); setError(null); setMessages([]);
    const unsub = listenMessages(
      conversationId,
      (list) => { setMessages(list); setLoading(false); },
      () => { setError('Você não tem acesso a esta conversa ou ocorreu uma falha de conexão.'); setLoading(false); },
    );
    return unsub;   // remove o listener ao desmontar ou trocar de conversa
  }, [conversationId]);

  const send = useCallback(async (text: string, mentionedUserIds: string[]): Promise<boolean> => {
    if (!text.trim()) return false;
    const net = await NetInfo.fetch();
    if (net.isConnected === false) { setSendError('Sem conexão. A mensagem não foi enviada.'); return false; }
    setSending(true); setSendError(null);
    try {
      const id = await sendMessage({ conversationId, conversationType, senderId: uid, text, mentionedUserIds });
      requestPush(conversationId, id).catch(() => undefined); // falha de push não invalida a mensagem
      return true;
    } catch {
      setSendError('Falha ao enviar a mensagem. Tente novamente.');
      return false;
    } finally { setSending(false); }
  }, [conversationId, conversationType, uid]);

  return { messages, loading, error, sendError, sending, send };
}