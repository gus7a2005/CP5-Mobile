import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/navigationRef';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { listUsers } from '../services/userService';
import { slotsLeft } from '../utils/groupValidation';
import { unknownUser } from '../utils/users';
import { Avatar } from '../components/Avatar';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageBubble } from '../components/ChatMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { colors, commonStyles } from '../theme';
import type { ChatMessage } from '../types/chat';
import type { PublicUser } from '../types/user';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ route, navigation }: Props) {
  const { conversationId, conversationType } = route.params;
  const isGroup = conversationType === 'group';
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const uid = user?.uid ?? '';

  const { messages, loading, error, sendError, sending, send } = useChat(conversationId, conversationType, uid);
  const { group, error: groupError } = useGroup(isGroup ? conversationId : null);

  const [usersById, setUsersById] = useState<Record<string, PublicUser>>({});
  const [text, setText] = useState('');
  const [mentioned, setMentioned] = useState<string[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Carrega nomes e fotos (autores das mensagens, integrantes, outro participante).
  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((list) => {
        if (cancelled) return;
        const map: Record<string, PublicUser> = {};
        list.forEach((u) => {
          map[u.uid] = u;
        });
        setUsersById(map);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Na conversa individual o id é "uidA_uidB": o outro participante é o que não sou eu.
  const otherUid = useMemo(() => (isGroup ? '' : (conversationId.split('_').find((p) => p !== uid) ?? '')), [isGroup, conversationId, uid]);
  const other = otherUid ? usersById[otherUid] : undefined;

  const title = isGroup ? (group?.name ?? 'Grupo') : (other?.name ?? 'Conversa');
  const photoUrl = isGroup ? (group?.photoUrl ?? '') : (other?.photoUrl ?? '');

  const memberUsers = useMemo(
    () => (group ? group.memberIds.map((id) => usersById[id] ?? unknownUser(id)) : []),
    [group, usersById],
  );

  const onPressPhoto = useCallback(() => {
    if (isGroup) setMembersOpen(true);
    else if (otherUid) navigation.navigate('Profile', { uid: otherUid });
  }, [isGroup, otherUid, navigation]);

  // Cabeçalho: foto (clicável) + nome; dono do grupo vê o botão "Editar".
  useLayoutEffect(() => {
    const isOwner = isGroup && group !== null && group.ownerId === uid;
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Avatar uri={photoUrl} size={34} onPress={onPressPhoto} />
          <Text style={styles.headerText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ),
      headerRight: isOwner
        ? () => (
            <Pressable onPress={() => navigation.navigate('GroupForm', { groupId: conversationId })} accessibilityRole="button">
              <Text style={styles.headerAction}>Editar</Text>
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, photoUrl, title, onPressPhoto, isGroup, group, uid, conversationId]);

  const toggleMention = useCallback((id: string) => {
    setMentioned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const onSend = useCallback(async () => {
    const ok = await send(text, isGroup ? mentioned : []);
    if (ok) {
      setText('');
      setMentioned([]);
    }
  }, [send, text, mentioned, isGroup]);

  const openProfile = useCallback(
    (id: string) => {
      setMembersOpen(false);
      navigation.navigate('Profile', { uid: id });
    },
    [navigation],
  );

  if (isGroup && groupError) return <ErrorMessage message={groupError} />;
  if (error) return <ErrorMessage message={error} />;
  if (loading) return <Loading />;

  const mentionedNames = mentioned.map((id) => usersById[id]?.name ?? 'integrante').join(', ');

  return (
    <KeyboardAvoidingView
      style={commonStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={commonStyles.emptyText}>Nenhuma mensagem ainda. Envie a primeira!</Text>}
        renderItem={({ item }) => (
          <ChatMessageBubble
            message={item}
            isMine={item.senderId === uid}
            showAuthor={isGroup}
            authorName={usersById[item.senderId]?.name ?? 'Usuário'}
            targetName={item.target.type === 'member' ? (usersById[item.target.memberId]?.name ?? 'integrante') : undefined}
          />
        )}
      />

      {sendError ? <ErrorMessage message={sendError} /> : null}
      {isGroup && mentioned.length > 0 ? (
        <View style={styles.mentionBar}>
          <Text style={commonStyles.muted} numberOfLines={1}>
            Para: {mentionedNames}
          </Text>
          <Pressable onPress={() => setMentioned([])}>
            <Text style={{ color: colors.danger }}>Limpar</Text>
          </Pressable>
        </View>
      ) : null}

      <ChatInput
        value={text}
        onChange={setText}
        onSend={() => {
          void onSend();
        }}
        disabled={sending}
        showMention={isGroup}
        mentionCount={mentioned.length}
        onMentionPress={() => setMentionOpen(true)}
      />

      {/* Lista de integrantes (toque na foto do grupo) */}
      <Modal visible={membersOpen} animationType="slide" onRequestClose={() => setMembersOpen(false)}>
        <View style={[commonStyles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, paddingHorizontal: 16 }]}>
          <Text style={commonStyles.title}>Integrantes</Text>
          {group ? (
            <Text style={commonStyles.muted}>
              {group.memberIds.length} de {group.memberLimit} · {slotsLeft(group.memberLimit, group.memberIds.length)} vagas disponíveis
            </Text>
          ) : null}
          <ScrollView style={{ flex: 1, marginTop: 8 }}>
            {memberUsers.map((m) => (
              <GroupMemberItem key={m.uid} user={m} isOwner={group?.ownerId === m.uid} onPress={() => openProfile(m.uid)} />
            ))}
          </ScrollView>
          <Pressable style={commonStyles.button} onPress={() => setMembersOpen(false)}>
            <Text style={commonStyles.buttonText}>Fechar</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Seleção de quem mencionar (botão @) */}
      <Modal visible={mentionOpen} animationType="slide" onRequestClose={() => setMentionOpen(false)}>
        <View style={[commonStyles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8, paddingHorizontal: 16 }]}>
          <Text style={commonStyles.title}>Marcar integrantes</Text>
          <Text style={commonStyles.muted}>Com a política “somente mencionados”, só eles recebem a notificação.</Text>
          <ScrollView style={{ flex: 1, marginTop: 8 }}>
            {memberUsers
              .filter((m) => m.uid !== uid)
              .map((m) => (
                <GroupMemberItem
                  key={m.uid}
                  user={m}
                  showCheckbox
                  selected={mentioned.includes(m.uid)}
                  onPress={() => toggleMention(m.uid)}
                />
              ))}
          </ScrollView>
          <Pressable style={commonStyles.button} onPress={() => setMentionOpen(false)}>
            <Text style={commonStyles.buttonText}>Concluir</Text>
          </Pressable>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 220 },
  headerText: { fontSize: 17, fontWeight: '600', color: colors.text, flexShrink: 1 },
  headerAction: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  mentionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
});