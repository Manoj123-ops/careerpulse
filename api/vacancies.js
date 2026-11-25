import { setCorsHeaders, parseRequestBody } from './_smtp.js';
import { upsertVacancies, patchVacancy, removeVacancy } from './_db.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'POST') {
      const body = parseRequestBody(req);
      const result = await upsertVacancies(body.vacancies || [], body.mode || 'append');
      return res.status(200).json(result);
    }

    if (req.method === 'PATCH') {
      const body = parseRequestBody(req);
      if (!body.id) {
        return res.status(400).json({ ok: false, error: 'Vacancy id is required.' });
      }
      const result = await patchVacancy(body.id, body.updates || body);
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      const clearAll = url.searchParams.get('clear') === 'all';
      const result = await removeVacancy(id, clearAll);
      return res.status(200).json(result);
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  } catch (error) {
    console.error('/api/vacancies error:', error);
    return res.status(error?.statusCode || 500).json({
      ok: false,
      error: error?.message || 'Vacancies DB operation failed.',
    });
  }
}
