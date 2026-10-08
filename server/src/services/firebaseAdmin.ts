import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL } = process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY || !FIREBASE_DATABASE_URL) {
  throw new Error('Variáveis de ambiente do Firebase Admin ausentes (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_DATABASE_URL).');
}

// Aceita a chave colada com quebras de linha reais ou com "\n" escapado, e remove aspas que alguns painéis de hospedagem incluem ao salvar a variável.
function normalizePrivateKey(raw: string): string {
  const unquoted = raw.trim().replace(/^"(.*)"$/s, '$1');
  return unquoted.includes('\\n') ? unquoted.replace(/\\n/g, '\n') : unquoted;
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(FIREBASE_PRIVATE_KEY),
  }),
  databaseURL: FIREBASE_DATABASE_URL,
});
export const adminAuth = getAuth();
export const db = getFirestore();
export const rtdb = getDatabase();