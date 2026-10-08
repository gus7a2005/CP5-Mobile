import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  registerDevice,
  parseNotificationData,
  NotificationPermissionError,
} from "../services/notificationService";
import { navigationRef } from "../navigation/navigationRef";

// Registra o aparelho para receber push (quando há usuário logado) e trata o toque na notificação.
export function useNotifications(uid: string | null) {
  const [warning, setWarning] = useState<string | null>(null);
  // useLastNotificationResponse não é suportado no web — Platform.OS é constante, então a condição nunca muda entre renders
  const lastResponse =
    Platform.OS === "web" ? null : Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || Platform.OS === "web") return;
    registerDevice(uid)
      .then(() => setWarning(null))
      .catch((e: unknown) => {
        setWarning(
          e instanceof NotificationPermissionError
            ? "Notificações desativadas. Ative nas configurações do aparelho para receber mensagens."
            : "Não foi possível registrar este aparelho para notificações.",
        );
      });
  }, [uid]);

  useEffect(() => {
    if (!uid || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledId.current === id) return; // não abrir a mesma notificação duas vezes
    const target = parseNotificationData(
      lastResponse.notification.request.content.data,
    );
    if (target && navigationRef.isReady()) {
      handledId.current = id;
      navigationRef.navigate("Chat", target);
    }
  }, [lastResponse, uid]);

  return { warning };
}
