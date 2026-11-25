import { setCorsHeaders, parseRequestBody, sendSmtpMail } from './_smtp.js';

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
    const result = await sendSmtpMail(body);
    return res.status(200).json(result);
  } catch (error) {
    console.error('SMTP send error:', error);
    const status = error?.statusCode || 500;
    return res.status(status).json({
      ok: false,
      error: error?.message || 'Failed to send email via SMTP.',
    });
  }
}
