import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { PublicUser, PrivateUserData } from '../types/user';

function toPublic(uid: string, d: Record<string, unknown>): PublicUser {
  return {
    uid,
    name: typeof d.name === 'string' ? d.name : 'Usuário',
    photoUrl: typeof d.photoUrl === 'string' ? d.photoUrl : '',
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
  };
}

export async function listUsers(): Promise<PublicUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((s) => toPublic(s.id, s.data()));
}
export async function getPublicUser(uid: string): Promise<PublicUser | null> {
  const s = await getDoc(doc(db, 'users', uid));
  return s.exists() ? toPublic(uid, s.data()) : null;
}
// Retorna null se as regras negarem (sem conversa em comum) → UI mostra "indisponível"
export async function getPrivateData(uid: string): Promise<PrivateUserData | null> {
  try {
    const s = await getDoc(doc(db, 'users', uid, 'private', 'data'));
    if (!s.exists()) return null;
    const d = s.data();
    return {
      email: typeof d.email === 'string' ? d.email : '',
      phoneNumber: typeof d.phoneNumber === 'string' ? d.phoneNumber : '',
      birthDate: typeof d.birthDate === 'string' ? d.birthDate : '',
    };
  } catch { return null; }
}