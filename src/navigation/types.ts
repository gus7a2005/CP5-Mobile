import { createNavigationContainerRef } from '@react-navigation/native';
import type { ConversationType } from '../types/chat';

export type RootStackParamList = {
  Login: undefined; Register: undefined;
  Conversations: undefined; Users: undefined;
  GroupForm: { groupId?: string };
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
};
export const navigationRef = createNavigationContainerRef<RootStackParamList>();