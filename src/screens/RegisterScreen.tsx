import React, { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/navigationRef';
import { register, mapAuthError } from '../services/authService';
import { pickImage, PermissionDeniedError } from '../services/imageService';
import { isValidEmail, isValidBirthDate } from '../utils/validation';
import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { colors, commonStyles } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

// 12122000 -> 12/12/2000
function maskDate(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birth, setBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickPhoto = useCallback(async () => {
    setError(null);
    try {
      const uri = await pickImage();
      if (uri) setPhotoUri(uri);
    } catch (e) {
      setError(
        e instanceof PermissionDeniedError
          ? 'Permita o acesso às fotos nas configurações do aparelho para escolher uma foto.'
          : 'Não foi possível abrir a galeria.',
      );
    }
  }, []);

  const onSubmit = useCallback(async () => {
    if (name.trim().length < 2) return setError('Informe seu nome.');
    if (!isValidEmail(email)) return setError('Informe um e-mail válido.');
    if (phone.replace(/\D/g, '').length < 10) return setError('Informe o celular com DDD.');
    if (!isValidBirthDate(birth)) return setError('Informe a data de nascimento no formato DD/MM/AAAA.');
    if (password.length < 6) return setError('A senha precisa ter ao menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');

    setLoading(true);
    setError(null);
    try {
      await register({ name, email, password, phoneNumber: phone, birthDate: birth, photoUri });
      // Sucesso: o App troca automaticamente para as telas logadas.
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  }, [name, email, phone, birth, password, confirm, photoUri]);

  return (
    <KeyboardAvoidingView style={commonStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={commonStyles.content} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Avatar uri={photoUri ?? ''} size={96} onPress={onPickPhoto} />
          <Pressable onPress={onPickPhoto} accessibilityRole="button">
            <Text style={commonStyles.link}>{photoUri ? 'Trocar foto' : 'Escolher foto de perfil'}</Text>
          </Pressable>
        </View>

        <TextInput style={commonStyles.input} placeholder="Nome completo" value={name} onChangeText={setName} />
        <TextInput
          style={commonStyles.input}
          placeholder="E-mail"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={commonStyles.input}
          placeholder="Celular com DDD"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          style={commonStyles.input}
          placeholder="Nascimento (DD/MM/AAAA)"
          keyboardType="number-pad"
          value={birth}
          onChangeText={(v) => setBirth(maskDate(v))}
        />
        <TextInput style={commonStyles.input} placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput
          style={commonStyles.input}
          placeholder="Confirmar senha"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        {error ? <ErrorMessage message={error} /> : null}

        <Pressable
          style={[commonStyles.button, loading && commonStyles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={commonStyles.buttonText}>Criar conta</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={commonStyles.link}>Já tenho conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}