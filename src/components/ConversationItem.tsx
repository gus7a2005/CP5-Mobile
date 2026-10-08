import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors } from '../theme';
import type { ConversationType } from '../types/chat';

type Props = {
  title: string;
  subtitle: string;
  photoUrl: string;
  type: ConversationType;
  onPress: () => void;
};

export function ConversationItem({ title, subtitle, photoUrl, type, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <Avatar uri={photoUrl} size={48} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {type === 'group' ? '👥 ' : '👤 '}
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  texts: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
});