import express from 'express';
import conversationsRouter from './routes/conversations';
import groupsRouter from './routes/groups';
import notificationsRouter from './routes/notifications';

const app = express();
app.use(express.json());

// Health check — usado para comprovar que a API está publicada e no ar.
app.get('/health', (_req, res) => res.json({ ok: true, timestamp: Date.now() }));

app.use('/conversations', conversationsRouter);
app.use('/groups', groupsRouter);
app.use('/notifications', notificationsRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API listening on port ${port}`));

export default app;
