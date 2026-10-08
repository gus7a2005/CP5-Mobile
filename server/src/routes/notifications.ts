// routes/notifications.ts
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { notifyMessage } from '../services/notificationSender';
import { HttpError } from '../errors';

const router = Router();
router.post('/messages', authenticate, async (req, res) => {
  const { conversationId, messageId } = req.body as { conversationId?: unknown; messageId?: unknown };
  if (typeof conversationId !== 'string' || typeof messageId !== 'string') {
    res.status(400).json({ error: 'conversationId e messageId são obrigatórios.' }); return;
  }
  try { res.json(await notifyMessage(req.uid as string, conversationId, messageId)); }
  catch (e) {
    if (e instanceof HttpError) res.status(e.status).json({ error: e.message });
    else { console.error(e); res.status(500).json({ error: 'Erro interno.' }); }
  }
});
export default router;