import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from './Avatar';
import { colors } from '../theme';
import type { PublicUser } from '../types/user';

type Props = {
  user: PublicUser;
  subtitle?: string;
  isOwner?: boolean;
  showCheckbox?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
};

export function GroupMemberItem({
  user,
  subtitle,
  isOwner = false,
  showCheckbox = false,
  selected = false,
  disabled = false,
  onPress,
  right,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || onPress === undefined}
      style={[styles.row, disabled && styles.disabled]}
      accessibilityRole="button"
    >
      {showCheckbox ? <Text style={styles.checkbox}>{selected ? '☑' : '☐'}</Text> : null}
      <Avatar uri={user.photoUrl} size={40} />
      <View style={styles.texts}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
          {isOwner ? '  (dono)' : ''}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  disabled: { opacity: 0.45 },
  checkbox: { fontSize: 20, color: colors.primary },
  texts: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  subtitle: { fontSize: 12, color: colors.muted },
});