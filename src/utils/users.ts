import type { PublicUser } from '../types/user';

// Usado quando o perfil não pôde ser carregado (removido, sem permissão, etc).
export function unknownUser(uid: string): PublicUser {
  return { uid, name: 'Usuário indisponível', photoUrl: '', createdAt: 0 };
}
