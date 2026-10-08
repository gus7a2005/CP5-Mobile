import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { ChatGroup } from '../types/group';
import type { NotificationPolicy } from '../types/notification';
import type { DirectConversation } from '../types/chat';

const POLICIES: NotificationPolicy[] = ['all_group_messages', 'mentioned_members', 'direct_messages_only', 'disabled'];

function parseGroup(id: string, x: Record<string, unknown>): ChatGroup {
  return {
    id,
    name: String(x.name ?? ''),
    photoUrl: String(x.photoUrl ?? ''),
    ownerId: String(x.ownerId ?? ''),
    memberIds: Array.isArray(x.memberIds) ? x.memberIds.map(String) : [],
    memberLimit: Number(x.memberLimit ?? 0),
    notificationPolicy: POLICIES.find((p) => p === x.notificationPolicy) ?? 'all_group_messages',
    createdAt: Number(x.createdAt ?? 0),
    updatedAt: Number(x.updatedAt ?? 0),
  };
}

// Passe null para não escutar nada (conversa individual).
export function useGroup(groupId: string | null) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState<boolean>(groupId !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId === null) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = onSnapshot(
      doc(db, 'groups', groupId),
      (snap) => {
        setGroup(snap.exists() ? parseGroup(snap.id, snap.data()) : null);
        setLoading(false);
      },
      () => {
        setError('Não foi possível carregar o grupo. Você pode ter sido removido dele.');
        setLoading(false);
      },
    );
    return unsubscribe; // remove o listener ao sair da tela
  }, [groupId]);

  return { group, loading, error };
}

function parseDirect(id: string, x: Record<string, unknown>): DirectConversation {
  return {
    id,
    type: 'direct',
    participantIds: Array.isArray(x.participantIds) ? x.participantIds.map(String) : [],
    createdAt: Number(x.createdAt ?? 0),
  };
}

// Lista, em tempo real, os grupos e conversas individuais das quais o usuário participa.
export function useConversations(uid: string) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [directsLoaded, setDirectsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setGroups([]);
      setDirects([]);
      setGroupsLoaded(true);
      setDirectsLoaded(true);
      return;
    }
    setGroupsLoaded(false);
    setDirectsLoaded(false);
    setError(null);

    const unsubGroups = onSnapshot(
      query(collection(db, 'groups'), where('memberIds', 'array-contains', uid)),
      (snap) => {
        setGroups(snap.docs.map((d) => parseGroup(d.id, d.data())));
        setGroupsLoaded(true);
      },
      () => {
        setError('Não foi possível carregar suas conversas.');
        setGroupsLoaded(true);
      },
    );
    const unsubDirects = onSnapshot(
      query(collection(db, 'directConversations'), where('participantIds', 'array-contains', uid)),
      (snap) => {
        setDirects(snap.docs.map((d) => parseDirect(d.id, d.data())));
        setDirectsLoaded(true);
      },
      () => {
        setError('Não foi possível carregar suas conversas.');
        setDirectsLoaded(true);
      },
    );
    return () => {
      unsubGroups();
      unsubDirects();
    };
  }, [uid]);

  return { groups, directs, loading: !groupsLoaded || !directsLoaded, error };
}