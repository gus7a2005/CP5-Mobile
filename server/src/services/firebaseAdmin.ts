import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PRIVATE_KEY_BASE64, FIREBASE_DATABASE_URL } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !(FIREBASE_PRIVATE_KEY_BASE64 || FIREBASE_PRIVATE_KEY) || !FIREBASE_DATABASE_URL) {
  throw new Error('Variáveis de ambiente do Firebase Admin ausentes (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY_BASE64 ou FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL).');
}

// Prefere a chave em base64 (FIREBASE_PRIVATE_KEY_BASE64): imune a mangling de quebras de linha/aspas
// feito por painéis de hospedagem ao salvar variáveis multilinha. FIREBASE_PRIVATE_KEY fica como fallback.
function resolvePrivateKey(): string {
  if (FIREBASE_PRIVATE_KEY_BASE64) return Buffer.from(FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8');
  const raw = (FIREBASE_PRIVATE_KEY as string).trim().replace(/^"(.*)"$/s, '$1');
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: resolvePrivateKey(),
  }),
  databaseURL: FIREBASE_DATABASE_URL,
});
export const adminAuth = getAuth();
export const db = getFirestore();
export const rtdb = getDatabase();