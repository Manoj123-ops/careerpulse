import { setCorsHeaders, parseRequestBody } from './_smtp.js';
import { insertApplicationLog } from './_db.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }
  try {
    const body = parseRequestBody(req);
    if (!body.id || !body.company || !body.method) {
      return res.status(400).json({ ok: false, error: 'id, company, and method are required.' });
    }
    const result = await insertApplicationLog(body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('/api/applications error:', error);
    return res.status(error?.statusCode || 500).json({
      ok: false,
      error: error?.message || 'Failed to log application to Neon DB.',
    });
  }
}
