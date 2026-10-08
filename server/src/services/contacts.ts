import { db } from './firebaseAdmin';

export async function rebuildContacts(uids: string[]): Promise<void> {
  await Promise.all([...new Set(uids)].map(async (uid) => {
    const [g, d] = await Promise.all([
      db.collection('groups').where('memberIds', 'array-contains', uid).get(),
      db.collection('directConversations').where('participantIds', 'array-contains', uid).get(),
    ]);
    const ids = new Set<string>();
    g.forEach((s) => (s.data().memberIds as string[]).forEach((m) => ids.add(m)));
    d.forEach((s) => (s.data().participantIds as string[]).forEach((m) => ids.add(m)));
    ids.delete(uid);
    await db.doc(`users/${uid}/private/contacts`).set({ ids: [...ids], updatedAt: Date.now() });
  }));
}