import { auth } from './firebase';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function apiRequest<T>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL;
  const user = auth.currentUser;
  if (!base) throw new Error('URL da API não configurada.');
  if (!user) throw new ApiError(401, 'Sessão expirada. Entre novamente.');
  const token = await user.getIdToken();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Verifique sua internet.');
  }
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, json.error ?? 'Erro inesperado.');
  return json as T;
}