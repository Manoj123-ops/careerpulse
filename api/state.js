import { setCorsHeaders } from './_smtp.js';
import { requireAdmin } from './_auth.js';
import { getFullState } from './_db.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (!requireAdmin(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use GET.' });
  }
  try {
    const state = await getFullState();
    return res.status(200).json(state);
  } catch (error) {
    console.error('GET /api/state error:', error);
    return res.status(error?.statusCode || 500).json({
      ok: false,
      error: error?.message || 'Failed to load state from Neon DB.',
    });
  }
}
