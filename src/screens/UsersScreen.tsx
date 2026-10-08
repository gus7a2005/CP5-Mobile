import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/navigationRef';
import { useAuth } from '../hooks/useAuth';
import { listUsers } from '../services/userService';
import { openDirectConversation } from '../services/chatService';
import { getErrorMessage } from '../utils/errors';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { commonStyles } from '../theme';
import type { PublicUser } from '../types/user';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export function UsersScreen({ navigation }: Props) {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os usuários.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Remove o próprio usuário e aplica a busca por nome.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => u.uid !== uid && u.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, uid, search]);

  const onPick = useCallback(
    async (other: PublicUser) => {
      if (other.uid === uid || busyUid !== null) return;
      setBusyUid(other.uid);
      setError(null);
      try {
        const { conversationId } = await openDirectConversation(other.uid);
        navigation.navigate('Chat', { conversationId, conversationType: 'direct' });
      } catch (e) {
        setError(getErrorMessage(e, 'Não foi possível iniciar a conversa.'));
      } finally {
        setBusyUid(null);
      }
    },
    [uid, busyUid, navigation],
  );

  if (loading) return <Loading />;

  return (
    <View style={commonStyles.screen}>
      <View style={{ padding: 12 }}>
        <TextInput
          style={commonStyles.input}
          placeholder="Buscar por nome"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>
      {error ? <ErrorMessage message={error} /> : null}
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.uid}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          <Text style={commonStyles.emptyText}>
            {users.length <= 1 ? 'Nenhum outro usuário cadastrado ainda.' : 'Nenhum usuário encontrado para essa busca.'}
          </Text>
        }
        renderItem={({ item }) => (
          <GroupMemberItem
            user={item}
            disabled={busyUid !== null}
            subtitle={busyUid === item.uid ? 'Abrindo conversa...' : undefined}
            onPress={() => {
              void onPick(item);
            }}
          />
        )}
      />
    </View>
  );
}