import { setCorsHeaders, parseRequestBody } from './_smtp.js';
import {
  getPool,
  ensureSchema,
  getPublicEngagementSummary,
  recordPortfolioEngagement,
} from './_db.js';

function getClientRegion(req) {
  const city = req.headers?.['x-vercel-ip-city'];
  const country = req.headers?.['x-vercel-ip-country'];
  if (city && country) return `${decodeURIComponent(city)}, ${country}`;
  if (country) return country;
  return 'Web Visitor';
}

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    try {
      const db = getPool();
      await ensureSchema();
      const [settingsResult, engagement] = await Promise.all([
        db.query(
          `SELECT base_cv, profile_photo, site_content, silhouette_photo, editorial_photo
           FROM app_settings WHERE id = 'default' LIMIT 1`
        ),
        getPublicEngagementSummary(),
      ]);
      const row = settingsResult.rows[0] || {};
      return res.status(200).json({
        ok: true,
        baseCv: row.base_cv || null,
        profilePhoto: row.profile_photo || '',
        siteContent: row.site_content || null,
        silhouettePhoto: row.silhouette_photo || '',
        editorialPhoto: row.editorial_photo || '',
        engagement,
      });
    } catch (error) {
      return res.status(200).json({
        ok: true,
        baseCv: null,
        profilePhoto: '',
        siteContent: null,
        silhouettePhoto: '',
        editorialPhoto: '',
        engagement: { totalVisitors: 0, totalLikes: 0, recentVisitors: [] },
        fallback: true,
        error: error?.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = parseRequestBody(req);
      const result = await recordPortfolioEngagement({
        ...body,
        ipRegion: body.ipRegion || getClientRegion(req),
      });
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error?.message || 'Failed to record portfolio engagement.',
      });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed.' });
}
