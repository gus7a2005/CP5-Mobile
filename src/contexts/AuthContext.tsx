import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { observeAuth, logout } from '../services/authService';
import { unregisterDevice } from '../services/notificationService';

type AuthContextValue = { user: User | null; loading: boolean; signOutUser: () => Promise<void> };
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => observeAuth((u) => { setUser(u); setLoading(false); }), []);

  const signOutUser = useCallback(async () => {
    if (user) await unregisterDevice(user.uid).catch(() => undefined); // desativa o token antes de sair
    await logout();   // user = null desmonta o navegador logado e os listeners
  }, [user]);

  const value = useMemo(() => ({ user, loading, signOutUser }), [user, loading, signOutUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}