import { setCorsHeaders, parseRequestBody } from './_smtp.js';
import { upsertTailoredCv } from './_db.js';

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
    if (!body.vacancyId || !body.tailoredCv) {
      return res.status(400).json({ ok: false, error: 'vacancyId and tailoredCv are required.' });
    }
    const result = await upsertTailoredCv(body.vacancyId, body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('/api/tailored-cv error:', error);
    return res.status(error?.statusCode || 500).json({
      ok: false,
      error: error?.message || 'Failed to save tailored CV to Neon DB.',
    });
  }
}
