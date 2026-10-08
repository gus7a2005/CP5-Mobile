import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/navigationRef';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { listUsers } from '../services/userService';
import { pickImage, uploadImage, PermissionDeniedError } from '../services/imageService';
import { createGroup, updateGroup, addMember, removeMember } from '../services/groupService';
import { validateGroupForm, slotsLeft } from '../utils/groupValidation';
import { unknownUser } from '../utils/users';
import { getErrorMessage } from '../utils/errors';
import { Avatar } from '../components/Avatar';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { colors, commonStyles } from '../theme';
import type { NotificationPolicy } from '../types/notification';
import type { PublicUser } from '../types/user';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;

const POLICY_OPTIONS: { value: NotificationPolicy; label: string; hint: string }[] = [
  { value: 'all_group_messages', label: 'Todas as mensagens do grupo', hint: 'Todos, menos quem enviou, recebem push.' },
  { value: 'mentioned_members', label: 'Somente mencionados', hint: 'Só quem foi marcado recebe push.' },
  { value: 'direct_messages_only', label: 'Somente conversas individuais', hint: 'Mensagens do grupo não geram push.' },
  { value: 'disabled', label: 'Desativadas', hint: 'Nenhuma mensagem gera push.' },
];

export function GroupFormScreen({ route, navigation }: Props) {
  const groupId = route.params.groupId; // undefined = criando; com valor = editando
  const isEdit = groupId !== undefined;
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { group, loading: groupLoading, error: groupError } = useGroup(groupId ?? null);

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [limitText, setLimitText] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // só no modo criar (sem você)
  const [filled, setFilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
        if (!cancelled) setUsersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // No modo edição, preenche o formulário uma única vez com os dados do grupo.
  useEffect(() => {
    if (group && !filled) {
      setName(group.name);
      setLimitText(String(group.memberLimit));
      setPolicy(group.notificationPolicy);
      setFilled(true);
    }
  }, [group, filled]);

  const limit = Number(limitText.trim());
  const limitValid = limitText.trim() !== '' && Number.isInteger(limit) && limit >= 2;

  const usersById = useMemo(() => {
    const map: Record<string, PublicUser> = {};
    users.forEach((u) => {
      map[u.uid] = u;
    });
    return map;
  }, [users]);

  const memberUsers = useMemo(
    () => (group ? group.memberIds.map((id) => usersById[id] ?? unknownUser(id)) : []),
    [group, usersById],
  );

  // Pessoas que ainda podem entrar (busca por nome).
  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    const already = group ? group.memberIds : [];
    return users
      .filter((u) => u.uid !== uid && !already.includes(u.uid) && u.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [users, uid, group, search]);

  const totalCount = isEdit ? (group?.memberIds.length ?? 0) : selectedIds.length + 1;
  const slots = limitValid ? slotsLeft(limit, totalCount) : null;
  const savedSlots = group ? slotsLeft(group.memberLimit, group.memberIds.length) : 0;

  const toggleUser = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const onPickPhoto = useCallback(async () => {
    setError(null);
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setError(
        e instanceof PermissionDeniedError
          ? 'Permita o acesso às fotos nas configurações do aparelho.'
          : 'Não foi possível abrir a galeria.',
      );
    }
  }, []);

  const onCreate = useCallback(async () => {
    const message = validateGroupForm(name, limit, selectedIds.length + 1);
    if (message) {
      setError(message);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const photoUrl = photoUri ? await uploadImage(photoUri) : '';
      const { id } = await createGroup({
        name: name.trim(),
        photoUrl,
        memberLimit: limit,
        notificationPolicy: policy,
        memberIds: selectedIds,
      });
      navigation.replace('Chat', { conversationId: id, conversationType: 'group' });
    } catch (e) {
      setError(getErrorMessage(e, 'Não foi possível criar o grupo. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  }, [name, limit, selectedIds, photoUri, policy, navigation]);

  const onSaveEdit = useCallback(async () => {
    if (!groupId || !group) return;
    if (name.trim().length < 3) {
      setError('O nome precisa ter ao menos 3 caracteres.');
      return;
    }
    if (!limitValid) {
      setError('O limite deve ser um inteiro maior ou igual a 2.');
      return;
    }
    if (limit < group.memberIds.length) {
      setError(`O limite não pode ser menor que ${group.memberIds.length} (integrantes atuais).`);
      return;
    }
    const patch: Parameters<typeof updateGroup>[1] = {};
    if (name.trim() !== group.name) patch.name = name.trim();
    if (limit !== group.memberLimit) patch.memberLimit = limit;
    if (policy !== group.notificationPolicy) patch.notificationPolicy = policy;

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (photoUri) patch.photoUrl = await uploadImage(photoUri);
      if (Object.keys(patch).length === 0) {
        setNotice('Nenhuma alteração para salvar.');
        return;
      }
      await updateGroup(groupId, patch);
      setPhotoUri(null);
      setNotice('Alterações salvas.');
    } catch (e) {
      setError(getErrorMessage(e, 'Não foi possível salvar as alterações.'));
    } finally {
      setSaving(false);
    }
  }, [groupId, group, name, limit, limitValid, policy, photoUri]);

  const onAdd = useCallback(
    async (memberId: string) => {
      if (!groupId) return;
      setBusyId(memberId);
      setError(null);
      setNotice(null);
      try {
        await addMember(groupId, memberId); // a API valida dono e limite; a lista atualiza sozinha
      } catch (e) {
        setError(getErrorMessage(e, 'Não foi possível adicionar o integrante.'));
      } finally {
        setBusyId(null);
      }
    },
    [groupId],
  );

  const onRemove = useCallback(
    async (memberId: string) => {
      if (!groupId) return;
      setBusyId(memberId);
      setError(null);
      setNotice(null);
      try {
        await removeMember(groupId, memberId);
      } catch (e) {
        setError(getErrorMessage(e, 'Não foi possível remover o integrante.'));
      } finally {
        setBusyId(null);
      }
    },
    [groupId],
  );

  // ---- Estados de tela (depois de todos os hooks) ----
  if (usersLoading || (isEdit && groupLoading)) return <Loading />;
  if (isEdit && groupError) return <ErrorMessage message={groupError} />;
  if (isEdit && !group) return <ErrorMessage message="Grupo não encontrado." />;
  if (isEdit && group && group.ownerId !== uid) {
    return <ErrorMessage message="Apenas o proprietário pode editar este grupo." />;
  }

  const counterText = limitValid
    ? `${totalCount} de ${limit} integrantes · ${slots} ${slots === 1 ? 'vaga disponível' : 'vagas disponíveis'}`
    : 'Informe um limite válido (número inteiro, mínimo 2).';

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar uri={photoUri ?? group?.photoUrl ?? ''} size={96} onPress={onPickPhoto} />
        <Pressable onPress={onPickPhoto} accessibilityRole="button">
          <Text style={commonStyles.link}>Escolher foto do grupo</Text>
        </Pressable>
      </View>

      <Text style={commonStyles.label}>Nome do grupo</Text>
      <TextInput style={commonStyles.input} value={name} onChangeText={setName} placeholder="Ex.: Equipe do projeto" />

      <Text style={commonStyles.label}>Limite de integrantes (inclui você)</Text>
      <TextInput style={commonStyles.input} value={limitText} onChangeText={setLimitText} keyboardType="number-pad" />
      <Text style={commonStyles.muted}>{counterText}</Text>

      <Text style={commonStyles.sectionTitle}>Notificações push</Text>
      {POLICY_OPTIONS.map((opt) => {
        const selected = policy === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => setPolicy(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={{
              borderWidth: 1,
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.mine : colors.white,
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: '600', color: colors.text }}>{opt.label}</Text>
            <Text style={commonStyles.muted}>{opt.hint}</Text>
          </Pressable>
        );
      })}

      {isEdit && group ? (
        <>
          <Text style={commonStyles.sectionTitle}>Integrantes ({group.memberIds.length})</Text>
          {memberUsers.map((m) => (
            <GroupMemberItem
              key={m.uid}
              user={m}
              isOwner={m.uid === group.ownerId}
              right={
                m.uid === group.ownerId ? undefined : (
                  <Pressable
                    onPress={() => {
                      void onRemove(m.uid);
                    }}
                    disabled={busyId !== null}
                    accessibilityRole="button"
                  >
                    <Text style={{ color: colors.danger, fontWeight: '600' }}>
                      {busyId === m.uid ? '...' : 'Remover'}
                    </Text>
                  </Pressable>
                )
              }
            />
          ))}
        </>
      ) : null}

      <Text style={commonStyles.sectionTitle}>{isEdit ? 'Adicionar integrantes' : 'Escolha os integrantes'}</Text>
      {isEdit && savedSlots === 0 ? <Text style={commonStyles.muted}>Grupo sem vagas. Aumente o limite para adicionar.</Text> : null}
      <TextInput
        style={commonStyles.input}
        placeholder="Buscar por nome"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />
      {candidates.length === 0 ? <Text style={commonStyles.muted}>Nenhum usuário disponível.</Text> : null}
      {candidates.map((u) =>
        isEdit ? (
          <GroupMemberItem
            key={u.uid}
            user={u}
            right={
              <Pressable
                onPress={() => {
                  void onAdd(u.uid);
                }}
                disabled={busyId !== null || savedSlots === 0}
                accessibilityRole="button"
              >
                <Text style={{ color: busyId !== null || savedSlots === 0 ? colors.muted : colors.primary, fontWeight: '600' }}>
                  {busyId === u.uid ? '...' : 'Adicionar'}
                </Text>
              </Pressable>
            }
          />
        ) : (
          <GroupMemberItem
            key={u.uid}
            user={u}
            showCheckbox
            selected={selectedIds.includes(u.uid)}
            disabled={!selectedIds.includes(u.uid) && slots !== null && slots <= 0}
            onPress={() => toggleUser(u.uid)}
          />
        ),
      )}

      {error ? <ErrorMessage message={error} /> : null}
      {notice ? <Text style={{ color: colors.primary, textAlign: 'center' }}>{notice}</Text> : null}

      <Pressable
        style={[commonStyles.button, saving && commonStyles.buttonDisabled]}
        onPress={() => {
          void (isEdit ? onSaveEdit() : onCreate());
        }}
        disabled={saving}
        accessibilityRole="button"
      >
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={commonStyles.buttonText}>{isEdit ? 'Salvar alterações' : 'Criar grupo'}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}