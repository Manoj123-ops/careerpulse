import { setCorsHeaders, parseRequestBody } from './_smtp.js';
import { requireAdmin } from './_auth.js';
import { appendAssistantMessage, resetAssistantMessages } from './_db.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'POST') {
      const body = parseRequestBody(req);
      if (!body.role || !body.text) {
        return res.status(400).json({ ok: false, error: 'role and text are required.' });
      }
      const result = await appendAssistantMessage(body.role, body.text);
      return res.status(200).json(result);
    }
    if (req.method === 'DELETE') {
      const result = await resetAssistantMessages();
      return res.status(200).json(result);
    }
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (error) {
    console.error('/api/assistant error:', error);
    return res.status(error?.statusCode || 500).json({
      ok: false,
      error: error?.message || 'Assistant DB operation failed.',
    });
  }
}
