import { Router } from 'express';
import { db } from '../services/firebaseAdmin';
import { authenticate } from '../middleware/authenticate';
import { rebuildContacts } from '../services/contacts';

const router = Router();
router.post('/direct', authenticate, async (req, res) => {
  try {
    const uid = req.uid as string;
    const other = (req.body as { otherUid?: unknown }).otherUid;
    if (typeof other !== 'string' || other === uid) { res.status(400).json({ error: 'Usuário inválido.' }); return; }
    if (!(await db.doc(`users/${other}`).get()).exists) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }
    const id = [uid, other].sort().join('_');   // id determinístico: um único par → uma única conversa
    const ref = db.doc(`directConversations/${id}`);
    await db.runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists) tx.set(ref, { participantIds: [uid, other].sort(), createdAt: Date.now() });
    });
    await rebuildContacts([uid, other]);
    res.json({ conversationId: id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
});
export default router;