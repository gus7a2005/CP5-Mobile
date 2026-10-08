import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  disabled: boolean;
  showMention: boolean;
  mentionCount: number;
  onMentionPress: () => void;
};

export function ChatInput({ value, onChange, onSend, disabled, showMention, mentionCount, onMentionPress }: Props) {
  const canSend = value.trim().length > 0 && !disabled;
  return (
    <View style={styles.bar}>
      {showMention ? (
        <Pressable onPress={onMentionPress} style={styles.mention} accessibilityLabel="Marcar integrantes">
          <Text style={styles.mentionText}>@{mentionCount > 0 ? mentionCount : ''}</Text>
        </Pressable>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Digite uma mensagem"
        style={styles.input}
        multiline
        maxLength={2000}
      />
      <Pressable
        onPress={onSend}
        disabled={!canSend}
        style={[styles.send, !canSend && styles.sendDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensagem"
      >
        <Text style={styles.sendText}>Enviar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  mention: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  mentionText: { fontWeight: '700', color: colors.primary },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    color: colors.text,
  },
  send: { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.white, fontWeight: '600' },
});