import React, { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/navigationRef';
import { login, mapAuthError } from '../services/authService';
import { isValidEmail } from '../utils/validation';
import { ErrorMessage } from '../components/ErrorMessage';
import { colors, commonStyles } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(async () => {
    if (!isValidEmail(email) || password.length === 0) {
      setError('Informe um e-mail válido e a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Sucesso: o AuthContext detecta o usuário e o App troca para as telas logadas.
    } catch (e) {
      setError(mapAuthError(e));
    } finally {
      setLoading(false);
    }
  }, [email, password]);

  return (
    <KeyboardAvoidingView style={commonStyles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[commonStyles.content, { flexGrow: 1, justifyContent: 'center' }]} keyboardShouldPersistTaps="handled">
        <Text style={commonStyles.title}>Entrar</Text>
        <Text style={commonStyles.muted}>Use o e-mail e a senha da sua conta.</Text>

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
          placeholder="Senha"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <ErrorMessage message={error} /> : null}

        <Pressable
          style={[commonStyles.button, loading && commonStyles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={commonStyles.buttonText}>Entrar</Text>}
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Register')} accessibilityRole="button">
          <Text style={commonStyles.link}>Criar conta</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}