import { Router, type Request, type Response } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db, rtdb } from '../services/firebaseAdmin';
import { authenticate } from '../middleware/authenticate';
import { rebuildContacts } from '../services/contacts';
import { HttpError } from '../errors';

const POLICIES = ['all_group_messages', 'mentioned_members', 'direct_messages_only', 'disabled'] as const;
type Policy = (typeof POLICIES)[number];
type GroupDoc = { name: string; photoUrl: string; ownerId: string; memberIds: string[]; memberLimit: number; notificationPolicy: Policy; createdAt: number; updatedAt: number };

const router = Router();
router.use(authenticate);

const isPolicy = (v: unknown): v is Policy => POLICIES.includes(v as Policy);
const isLimit = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 2 && v <= 500;

function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((e: unknown) => {
      if (e instanceof HttpError) res.status(e.status).json({ error: e.message });
      else { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
    });
  };
}

// POST /groups
router.post('/', handle(async (req, res) => {
  const uid = req.uid as string;
  const b = req.body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const photoUrl = typeof b.photoUrl === 'string' ? b.photoUrl : '';
  const extra = Array.isArray(b.memberIds) ? b.memberIds.filter((x): x is string => typeof x === 'string') : [];
  if (name.length < 3 || name.length > 60) throw new HttpError(400, 'Nome do grupo inválido (3 a 60 caracteres).');
  if (!isLimit(b.memberLimit)) throw new HttpError(400, 'O limite deve ser um inteiro válido (mínimo 2).');
  if (!isPolicy(b.notificationPolicy)) throw new HttpError(400, 'Política de notificação inválida.');
  const memberIds = [...new Set([uid, ...extra])];
  if (memberIds.length < 2) throw new HttpError(400, 'O grupo precisa de ao menos 2 integrantes.');
  if (memberIds.length > b.memberLimit) throw new HttpError(409, 'Mais integrantes do que o limite permite.');
  const users = await db.getAll(...memberIds.map((id) => db.doc(`users/${id}`)));
  if (users.some((u) => !u.exists)) throw new HttpError(400, 'Algum integrante não existe.');

  const ref = db.collection('groups').doc();
  const now = Date.now();
  const group: GroupDoc = { name, photoUrl, ownerId: uid, memberIds, memberLimit: b.memberLimit, notificationPolicy: b.notificationPolicy, createdAt: now, updatedAt: now };
  await ref.set(group);
  const mirror: Record<string, boolean> = {};
  memberIds.forEach((m) => { mirror[m] = true; });
  await rtdb.ref(`conversationMembers/${ref.id}`).set(mirror);
  await rebuildContacts(memberIds);
  res.status(201).json({ id: ref.id });
}));

// POST /groups/:id/members  { uid }  — transação garante o limite sob concorrência
router.post('/:id/members', handle(async (req, res) => {
  const caller = req.uid as string;
  const target = (req.body as { uid?: unknown }).uid;
  if (typeof target !== 'string') throw new HttpError(400, 'Usuário inválido.');
  const gid = String(req.params.id);
  const ref = db.doc(`groups/${gid}`);
  const targetUser = await db.doc(`users/${target}`).get();
  if (!targetUser.exists) throw new HttpError(404, 'Usuário não encontrado.');

  const all = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Grupo não encontrado.');
    const g = snap.data() as GroupDoc;
    if (g.ownerId !== caller) throw new HttpError(403, 'Apenas o proprietário pode adicionar integrantes.');
    if (g.memberIds.includes(target)) throw new HttpError(409, 'O usuário já é integrante.');
    if (g.memberIds.length >= g.memberLimit) throw new HttpError(409, 'Grupo sem vagas disponíveis.');
    tx.update(ref, { memberIds: FieldValue.arrayUnion(target), updatedAt: Date.now() });
    return [...g.memberIds, target];
  });
  await rtdb.ref(`conversationMembers/${gid}/${target}`).set(true);
  await rebuildContacts(all);
  res.json({ ok: true });
}));

// DELETE /groups/:id/members/:uid  (dono remove qualquer um, exceto ele mesmo; membro pode sair)
router.delete('/:id/members/:uid', handle(async (req, res) => {
  const caller = req.uid as string;
  const gid = String(req.params.id);
  const target = String(req.params.uid);
  const ref = db.doc(`groups/${gid}`);
  const affected = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Grupo não encontrado.');
    const g = snap.data() as GroupDoc;
    if (target === g.ownerId) throw new HttpError(400, 'O proprietário não pode ser removido.');
    if (caller !== g.ownerId && caller !== target) throw new HttpError(403, 'Sem permissão.');
    if (!g.memberIds.includes(target)) throw new HttpError(404, 'Usuário não é integrante.');
    tx.update(ref, { memberIds: FieldValue.arrayRemove(target), updatedAt: Date.now() });
    return g.memberIds;
  });
  await rtdb.ref(`conversationMembers/${gid}/${target}`).remove();   // corta o acesso às mensagens
  await rebuildContacts(affected);
  res.json({ ok: true });
}));

// PATCH /groups/:id  { name?, photoUrl?, memberLimit?, notificationPolicy? }
router.patch('/:id', handle(async (req, res) => {
  const caller = req.uid as string;
  const b = req.body as Record<string, unknown>;
  const ref = db.doc(`groups/${String(req.params.id)}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Grupo não encontrado.');
    const g = snap.data() as GroupDoc;
    if (g.ownerId !== caller) throw new HttpError(403, 'Apenas o proprietário pode alterar o grupo.');
    const patch: Partial<GroupDoc> = { updatedAt: Date.now() };
    if (typeof b.name === 'string') {
      if (b.name.trim().length < 3) throw new HttpError(400, 'Nome inválido.');
      patch.name = b.name.trim();
    }
    if (typeof b.photoUrl === 'string') patch.photoUrl = b.photoUrl;
    if (b.memberLimit !== undefined) {
      if (!isLimit(b.memberLimit)) throw new HttpError(400, 'Limite inválido.');
      if (b.memberLimit < g.memberIds.length) throw new HttpError(409, `O limite não pode ser menor que ${g.memberIds.length} (integrantes atuais).`);
      patch.memberLimit = b.memberLimit;
    }
    if (b.notificationPolicy !== undefined) {
      if (!isPolicy(b.notificationPolicy)) throw new HttpError(400, 'Política inválida.');
      patch.notificationPolicy = b.notificationPolicy;
    }
    tx.update(ref, patch);
  });
  res.json({ ok: true });
}));

export default router;