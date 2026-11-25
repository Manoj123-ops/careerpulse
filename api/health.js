import { setCorsHeaders } from './_smtp.js';
import { checkDbHealth } from './_db.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  try {
    const db = await checkDbHealth();
    return res.status(200).json({
      ok: true,
      service: 'CareerPulse API (Neon PostgreSQL + SMTP Relay)',
      db,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(200).json({
      ok: true,
      service: 'CareerPulse API',
      db: { connected: false, error: error?.message || 'Database unavailable' },
      timestamp: new Date().toISOString(),
    });
  }
}
