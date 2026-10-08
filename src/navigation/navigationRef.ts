import { createNavigationContainerRef } from '@react-navigation/native';
import type { ConversationType } from '../types/chat';

// Mapa de TODAS as telas e dos parâmetros que cada uma recebe.
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Conversations: undefined;
  Users: undefined;
  GroupForm: { groupId?: string };
  Chat: { conversationId: string; conversationType: ConversationType };
  Profile: { uid: string };
};

// Referência para navegar de fora de componentes (usada ao tocar numa notificação).
export const navigationRef = createNavigationContainerRef<RootStackParamList>();