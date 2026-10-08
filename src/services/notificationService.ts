import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ConversationType } from '../types/chat';

export class NotificationPermissionError extends Error {}
let currentDeviceId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }),
});

export async function registerDevice(uid: string): Promise<void> {
  if (!Device.isDevice) throw new Error('Push só funciona em dispositivo físico.');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default', importance: Notifications.AndroidImportance.MAX,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') throw new NotificationPermissionError('Permissão de notificações negada.');

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('projectId do EAS não encontrado (rode eas init).');
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  currentDeviceId = token.replace(/^ExponentPushToken\[|\]$/g, '');
  await setDoc(doc(db, 'users', uid, 'devices', currentDeviceId), {
    token, platform: Platform.OS, enabled: true, updatedAt: Date.now(),
  });
}

export async function unregisterDevice(uid: string): Promise<void> {
  if (!currentDeviceId) return;
  await updateDoc(doc(db, 'users', uid, 'devices', currentDeviceId), { enabled: false, updatedAt: Date.now() });
}

export type NotificationTarget = { conversationId: string; conversationType: ConversationType };
export function parseNotificationData(data: Record<string, unknown>): NotificationTarget | null {
  const { conversationId, conversationType } = data;
  if (typeof conversationId !== 'string') return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  return { conversationId, conversationType };
}