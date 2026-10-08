import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../services/firebaseAdmin';

declare global { namespace Express { interface Request { uid?: string } } }

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Token ausente.' }); return; }
  try {
    req.uid = (await adminAuth.verifyIdToken(token)).uid;
    next();
  } catch { res.status(401).json({ error: 'Sessão inválida ou expirada.' }); }
}