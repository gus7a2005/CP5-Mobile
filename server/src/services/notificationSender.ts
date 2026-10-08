import { db, rtdb } from './firebaseAdmin';
import { HttpError } from '../errors';
import { resolveRecipients, type ConversationCtx, type Policy } from './recipientResolver';

type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };
type DeviceRef = { path: string; token: string };

async function loadContext(cid: string): Promise<{ ctx: ConversationCtx; title: string }> {
  const g = await db.doc(`groups/${cid}`).get();
  if (g.exists) {
    const d = g.data() as { name: string; memberIds: string[]; notificationPolicy: Policy };
    return { ctx: { type: 'group', memberIds: d.memberIds, policy: d.notificationPolicy }, title: d.name };
  }
  const dc = await db.doc(`directConversations/${cid}`).get();
  if (dc.exists) return { ctx: { type: 'direct', participantIds: (dc.data() as { participantIds: string[] }).participantIds }, title: '' };
  throw new HttpError(404, 'Conversa não encontrada.');
}

export async function notifyMessage(senderUid: string, cid: string, mid: string): Promise<{ sent: number; skipped?: string }> {
  const snap = await rtdb.ref(`messages/${cid}/${mid}`).get();
  if (!snap.exists()) throw new HttpError(404, 'Mensagem não encontrada.');
  const raw = snap.val() as { senderId?: unknown; mentionedUserIds?: unknown; target?: { type?: unknown; memberId?: unknown } };
  if (raw.senderId !== senderUid) throw new HttpError(403, 'O remetente da mensagem não corresponde ao usuário autenticado.');

  // Idempotência: .create() falha se o documento já existe (código 6 ALREADY_EXISTS)
  const lock = db.doc(`notificationLogs/${cid}_${mid}`);
  try { await lock.create({ status: 'processing', createdAt: Date.now() }); }
  catch (e) {
    if ((e as { code?: number }).code === 6) return { sent: 0, skipped: 'duplicate' };
    throw e;
  }

  try {
    const { ctx, title } = await loadContext(cid);
    const recipients = resolveRecipients(ctx, {
      senderId: senderUid,
      mentionedUserIds: Array.isArray(raw.mentionedUserIds) ? raw.mentionedUserIds.map(String) : [],
      targetMemberId: raw.target?.type === 'member' && typeof raw.target.memberId === 'string' ? raw.target.memberId : null,
    });
    if (recipients.length === 0) { await lock.update({ status: 'skipped' }); return { sent: 0, skipped: 'policy' }; }

    const sender = await db.doc(`users/${senderUid}`).get();
    const senderName = String(sender.data()?.name ?? 'Alguém');
    const devices: DeviceRef[] = [];
    for (const uid of recipients) {
      const q = await db.collection(`users/${uid}/devices`).where('enabled', '==', true).get();
      q.forEach((d) => devices.push({ path: d.ref.path, token: String(d.data().token) }));
    }

    let sent = 0;
    for (let i = 0; i < devices.length; i += 100) {
      const chunk = devices.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk.map((d) => ({
          to: d.token, sound: 'default', channelId: 'default', priority: 'high',
          title: ctx.type === 'group' ? title : senderName,
          body: ctx.type === 'group' ? `${senderName} enviou uma nova mensagem` : 'Nova mensagem',   // não expõe o conteúdo
          data: { conversationId: cid, conversationType: ctx.type, messageId: mid },
        }))),
      });
      const json = (await res.json()) as { data?: Ticket[] };
      await Promise.all((json.data ?? []).map(async (t, idx) => {
        if (t.status === 'ok') { sent += 1; return; }
        const device = chunk[idx];
        if (device && t.details?.error === 'DeviceNotRegistered') {          // token inválido → desativa
          await db.doc(device.path).update({ enabled: false, updatedAt: Date.now() });
        }
      }));
    }
    await lock.update({ status: 'sent', sent });
    return { sent };
  } catch (e) {
    await lock.delete().catch(() => undefined);   // libera o retry
    throw e;
  }
}