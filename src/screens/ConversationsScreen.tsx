import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/navigationRef';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useGroups';
import { useNotifications } from '../hooks/useNotifications';
import { getPublicUser } from '../services/userService';
import { unknownUser } from '../utils/users';
import { ConversationItem } from '../components/ConversationItem';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { commonStyles } from '../theme';
import type { ConversationType } from '../types/chat';
import type { PublicUser } from '../types/user';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'>;

type ListItem = {
  conversationId: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  photoUrl: string;
  sortKey: number;
};

export function ConversationsScreen({ navigation }: Props) {
  const { user, signOutUser } = useAuth();
  const uid = user?.uid ?? '';

  // Registra o aparelho para push e trata o toque em notificações.
  const { warning } = useNotifications(uid === '' ? null : uid);

  const { groups, directs, loading, error } = useConversations(uid);
  const [people, setPeople] = useState<Record<string, PublicUser>>({});

  // Busca nome e foto do "outro" participante de cada conversa individual.
  useEffect(() => {
    const missing = [...new Set(directs.flatMap((d) => d.participantIds))].filter(
      (id) => id !== uid && people[id] === undefined,
    );
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(async (id) => (await getPublicUser(id)) ?? unknownUser(id)))
      .then((list) => {
        if (cancelled) return;
        setPeople((prev) => {
          const next = { ...prev };
          list.forEach((u) => {
            next[u.uid] = u;
          });
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [directs, uid, people]);

  const items = useMemo<ListItem[]>(() => {
    const groupItems = groups.map<ListItem>((g) => ({
      conversationId: g.id,
      type: 'group',
      title: g.name,
      subtitle: `${g.memberIds.length}/${g.memberLimit} integrantes`,
      photoUrl: g.photoUrl,
      sortKey: g.updatedAt,
    }));
    const directItems = directs.map<ListItem>((d) => {
      const otherId = d.participantIds.find((id) => id !== uid) ?? '';
      const other = people[otherId];
      return {
        conversationId: d.id,
        type: 'direct',
        title: other?.name ?? 'Carregando...',
        subtitle: 'Conversa individual',
        photoUrl: other?.photoUrl ?? '',
        sortKey: d.createdAt,
      };
    });
    return [...groupItems, ...directItems].sort((a, b) => b.sortKey - a.sortKey);
  }, [groups, directs, people, uid]);

  const confirmLogout = () => {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          void signOutUser();
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  return (
    <View style={commonStyles.screen}>
      {warning ? (
        <View style={commonStyles.banner}>
          <Text style={commonStyles.bannerText}>{warning}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
        <Pressable style={[commonStyles.buttonOutline, { flex: 1 }]} onPress={() => navigation.navigate('Users')}>
          <Text style={commonStyles.buttonOutlineText}>Nova conversa</Text>
        </Pressable>
        <Pressable
          style={[commonStyles.buttonOutline, { flex: 1 }]}
          onPress={() => navigation.navigate('GroupForm', {})}
        >
          <Text style={commonStyles.buttonOutlineText}>Novo grupo</Text>
        </Pressable>
        <Pressable style={commonStyles.buttonOutline} onPress={confirmLogout}>
          <Text style={commonStyles.buttonOutlineText}>Sair</Text>
        </Pressable>
      </View>

      {error ? <ErrorMessage message={error} /> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => `${item.type}-${item.conversationId}`}
        ListEmptyComponent={
          <Text style={commonStyles.emptyText}>
            Você ainda não tem conversas. Toque em “Nova conversa” ou crie um grupo.
          </Text>
        }
        renderItem={({ item }) => (
          <ConversationItem
            title={item.title}
            subtitle={item.subtitle}
            photoUrl={item.photoUrl}
            type={item.type}
            onPress={() =>
              navigation.navigate('Chat', { conversationId: item.conversationId, conversationType: item.type })
            }
          />
        )}
      />
    </View>
  );
}