import { setCorsHeaders, parseRequestBody } from './_smtp.js';
import { requireAdmin } from './_auth.js';
import { saveProfileSettings } from './_db.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (!requireAdmin(req, res)) return;

  if (req.method !== 'PUT' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use PUT or POST.' });
  }
  try {
    const body = parseRequestBody(req);
    const result = await saveProfileSettings(body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('/api/profile error:', error);
    return res.status(error?.statusCode || 500).json({
      ok: false,
      error: error?.message || 'Failed to save profile settings to Neon DB.',
    });
  }
}
