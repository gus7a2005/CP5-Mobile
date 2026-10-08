import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, deleteUser, onAuthStateChanged, type User, type Unsubscribe } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { uploadImage } from './imageService';
import { toIsoDate } from '../utils/validation';
import type { RegisterInput } from '../types/user';

export function mapAuthError(e: unknown): string {
  const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'E-mail ou senha inválidos.';
    case 'auth/email-already-in-use': return 'Este e-mail já está cadastrado.';
    case 'auth/weak-password': return 'A senha precisa ter ao menos 6 caracteres.';
    case 'auth/invalid-email': return 'E-mail inválido.';
    case 'auth/network-request-failed': return 'Falha de conexão. Tente novamente.';
    case 'auth/too-many-requests': return 'Muitas tentativas. Aguarde um pouco.';
    default: return 'Não foi possível concluir. Tente novamente.';
  }
}

export async function register(input: RegisterInput): Promise<void> {
  const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
  try {
    const photoUrl = input.photoUri ? await uploadImage(input.photoUri) : '';
    const uid = cred.user.uid;
    await setDoc(doc(db, 'users', uid), { name: input.name.trim(), photoUrl, createdAt: Date.now() });
    await setDoc(doc(db, 'users', uid, 'private', 'data'), {
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber.trim(),
      birthDate: toIsoDate(input.birthDate),
    });
  } catch (e) {
    await deleteUser(cred.user);   // rollback: não deixa conta sem perfil
    throw e;
  }
}

export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email.trim(), password);
export const logout = () => signOut(auth);
export const observeAuth = (cb: (u: User | null) => void): Unsubscribe => onAuthStateChanged(auth, cb);