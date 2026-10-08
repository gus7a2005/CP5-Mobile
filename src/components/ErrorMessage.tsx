import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = { message: string; onRetry?: () => void };

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retry}>Tentar de novo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, alignItems: 'center', gap: 6 },
  text: { color: colors.danger, textAlign: 'center' },
  retry: { color: colors.primary, fontWeight: '600' },
});