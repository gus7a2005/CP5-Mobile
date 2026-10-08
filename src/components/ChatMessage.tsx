import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { ChatMessage } from '../types/chat';

type Props = {
  message: ChatMessage;
  isMine: boolean;
  showAuthor: boolean;
  authorName: string;
  targetName?: string;
};

export function ChatMessageBubble({ message, isMine, showAuthor, authorName, targetName }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {showAuthor && !isMine ? <Text style={styles.author}>{authorName}</Text> : null}
        {targetName ? <Text style={styles.target}>para {targetName}</Text> : null}
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.mine, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.theirs, borderBottomLeftRadius: 4 },
  author: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  target: { fontSize: 11, color: colors.muted, marginBottom: 2 },
  text: { fontSize: 16, color: colors.text },
  time: { fontSize: 10, color: colors.muted, alignSelf: 'flex-end', marginTop: 2 },
});