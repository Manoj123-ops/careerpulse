import { setCorsHeaders, parseRequestBody, verifySmtpConnection } from './_smtp.js';
import { requireAdmin } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (!requireAdmin(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = parseRequestBody(req);
    const result = await verifySmtpConnection(body);
    return res.status(200).json(result);
  } catch (error) {
    const status = error?.statusCode || 400;
    return res.status(status).json({
      ok: false,
      error: error?.message || 'SMTP verification failed.',
    });
  }
}
