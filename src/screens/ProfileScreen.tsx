import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/navigationRef';
import { getPublicUser, getPrivateData } from '../services/userService';
import { Avatar } from '../components/Avatar';
import { Loading } from '../components/Loading';
import { ErrorMessage } from '../components/ErrorMessage';
import { colors, commonStyles } from '../theme';
import type { PrivateUserData, PublicUser } from '../types/user';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

// 2000-12-31 -> 31/12/2000
function formatBirth(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso;
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={commonStyles.label}>{label}</Text>
      <Text style={{ fontSize: 16, color: value ? colors.text : colors.muted }}>
        {value && value !== '' ? value : 'Indisponível'}
      </Text>
    </View>
  );
}

export function ProfileScreen({ route }: Props) {
  const { uid } = route.params;
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [privateData, setPrivateData] = useState<PrivateUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getPublicUser(uid), getPrivateData(uid)])
      .then(([publicUser, priv]) => {
        if (cancelled) return;
        setProfile(publicUser);
        setPrivateData(priv); // null = as regras de segurança não permitem ver (sem conversa em comum)
        if (!publicUser) setError('Usuário não encontrado.');
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar o perfil.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (loading) return <Loading />;
  if (error || !profile) return <ErrorMessage message={error ?? 'Usuário não encontrado.'} />;

  return (
    <ScrollView style={commonStyles.screen} contentContainerStyle={[commonStyles.content, { alignItems: 'stretch' }]}>
      <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Avatar uri={profile.photoUrl} size={120} />
        <Text style={commonStyles.title}>{profile.name}</Text>
      </View>
      <Field label="E-mail" value={privateData?.email ?? null} />
      <Field label="Celular" value={privateData?.phoneNumber ?? null} />
      <Field label="Data de nascimento" value={privateData ? formatBirth(privateData.birthDate) : null} />
      {privateData === null ? (
        <Text style={commonStyles.muted}>Os dados cadastrais só aparecem para quem compartilha uma conversa com este usuário.</Text>
      ) : null}
    </ScrollView>
  );
}