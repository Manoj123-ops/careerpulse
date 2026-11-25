import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

let pool = null;
let schemaInitialized = false;
let schemaPromise = null;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL environment variable is not configured.');
    err.statusCode = 500;
    throw err;
  }
  if (!pool) {
    // Use Neon pooler TCP+TLS directly; attach error handler so idle Neon compute-suspend resets never crash Node
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
    });
    pool.on('error', (err) => {
      console.warn('Neon DB idle pool client reset (handled safely):', err?.message || err);
    });
  }
  return pool;
}

export async function ensureSchema() {
  if (schemaInitialized) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    const db = getPool();

    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        base_cv JSONB NOT NULL,
        selected_model TEXT NOT NULL DEFAULT 'gemini-4-hydrogen',
        profile_photo TEXT DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      ALTER TABLE app_settings
      ADD COLUMN IF NOT EXISTS profile_photo TEXT DEFAULT ''
    `);

    await db.query(`
      ALTER TABLE app_settings
      ADD COLUMN IF NOT EXISTS site_content JSONB
    `);

    await db.query(`
      ALTER TABLE app_settings
      ADD COLUMN IF NOT EXISTS silhouette_photo TEXT DEFAULT ''
    `);

    await db.query(`
      ALTER TABLE app_settings
      ADD COLUMN IF NOT EXISTS editorial_photo TEXT DEFAULT ''
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS vacancies (
        id TEXT PRIMARY KEY,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        location TEXT DEFAULT '',
        work_mode TEXT DEFAULT 'On-site',
        experience_required TEXT DEFAULT '',
        package_lpa TEXT DEFAULT 'Not Disclosed',
        lpa_numeric_min NUMERIC DEFAULT 0,
        lpa_numeric_max NUMERIC DEFAULT 0,
        interview_type TEXT DEFAULT 'online',
        walk_in_timings TEXT DEFAULT '',
        apply_link TEXT DEFAULT '',
        hr_name TEXT DEFAULT '',
        hr_role TEXT DEFAULT '',
        hr_email TEXT DEFAULT '',
        hr_phone TEXT DEFAULT '',
        hr_notes TEXT DEFAULT '',
        required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        match_score INTEGER DEFAULT 75,
        matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
        deep_analysis_notes TEXT DEFAULT '',
        posted_or_deadline TEXT DEFAULT 'Active',
        status TEXT NOT NULL DEFAULT 'New',
        source TEXT DEFAULT 'Uploaded CSV',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tailored_cvs (
        vacancy_id TEXT PRIMARY KEY REFERENCES vacancies(id) ON DELETE CASCADE,
        ats_score INTEGER DEFAULT 85,
        tailoring_notes TEXT DEFAULT '',
        added_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
        tailored_cv JSONB NOT NULL,
        model_used TEXT DEFAULT '',
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        edited_at TIMESTAMPTZ
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS application_logs (
        id TEXT PRIMARY KEY,
        vacancy_id TEXT REFERENCES vacancies(id) ON DELETE SET NULL,
        company TEXT NOT NULL,
        role TEXT DEFAULT '',
        method TEXT NOT NULL,
        hr_email TEXT DEFAULT '',
        subject TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS assistant_messages (
        id SERIAL PRIMARY KEY,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS portfolio_visitors (
        visitor_id TEXT PRIMARY KEY,
        visitor_name TEXT DEFAULT '',
        visitor_company TEXT DEFAULT '',
        visitor_role TEXT DEFAULT '',
        device_summary TEXT DEFAULT '',
        timezone TEXT DEFAULT '',
        browser_lang TEXT DEFAULT '',
        referrer TEXT DEFAULT '',
        ip_region TEXT DEFAULT '',
        liked BOOLEAN NOT NULL DEFAULT FALSE,
        visit_count INTEGER NOT NULL DEFAULT 1,
        first_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        liked_at TIMESTAMPTZ
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_saved_logins (
        device_id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_enc TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        user_agent TEXT DEFAULT '',
        last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    schemaInitialized = true;
  })();

  try {
    await schemaPromise;
  } catch (err) {
    schemaPromise = null;
    throw err;
  }
}

function mapVacancyRow(r) {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    location: r.location || '',
    workMode: r.work_mode || 'On-site',
    experienceRequired: r.experience_required || '',
    packageLpa: r.package_lpa || 'Not Disclosed',
    lpaNumericMin: Number(r.lpa_numeric_min) || 0,
    lpaNumericMax: Number(r.lpa_numeric_max) || 0,
    interviewType: r.interview_type || 'online',
    walkInTimings: r.walk_in_timings || '',
    applyLink: r.apply_link || '',
    hrName: r.hr_name || '',
    hrRole: r.hr_role || '',
    hrEmail: r.hr_email || '',
    hrPhone: r.hr_phone || '',
    hrNotes: r.hr_notes || '',
    requiredSkills: Array.isArray(r.required_skills) ? r.required_skills : [],
    matchScore: Number(r.match_score) || 75,
    matchedSkills: Array.isArray(r.matched_skills) ? r.matched_skills : [],
    missingSkills: Array.isArray(r.missing_skills) ? r.missing_skills : [],
    deepAnalysisNotes: r.deep_analysis_notes || '',
    postedOrDeadline: r.posted_or_deadline || 'Active',
    status: r.status || 'New',
    source: r.source || 'Uploaded CSV',
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
  };
}

export async function checkDbHealth() {
  const db = getPool();
  await ensureSchema();
  const res = await db.query('SELECT NOW() AS now');
  return { connected: true, provider: 'Neon PostgreSQL', serverTime: res.rows[0]?.now };
}

export async function getFullState() {
  const db = getPool();
  await ensureSchema();

  const [settingsRes, vacancyRes, tailoredRes, logRes, msgRes, visitorRes] = await Promise.all([
    db.query(
      `SELECT base_cv, selected_model, profile_photo, site_content, silhouette_photo, editorial_photo, updated_at
       FROM app_settings WHERE id = 'default' LIMIT 1`
    ),
    db.query(`SELECT * FROM vacancies ORDER BY created_at DESC`),
    db.query(`SELECT * FROM tailored_cvs`),
    db.query(`SELECT * FROM application_logs ORDER BY created_at ASC`),
    db.query(`SELECT id, role, text, created_at FROM assistant_messages ORDER BY id ASC LIMIT 60`),
    db.query(`SELECT * FROM portfolio_visitors ORDER BY last_visited_at DESC LIMIT 200`),
  ]);

  const tailoredMap = {};
  for (const t of tailoredRes.rows) {
    tailoredMap[t.vacancy_id] = {
      atsScore: Number(t.ats_score) || 85,
      tailoringNotes: t.tailoring_notes || '',
      addedKeywords: Array.isArray(t.added_keywords) ? t.added_keywords : [],
      tailoredCv: t.tailored_cv,
      modelUsed: t.model_used || '',
      generatedAt: t.generated_at ? new Date(t.generated_at).toISOString() : undefined,
      editedAt: t.edited_at ? new Date(t.edited_at).toISOString() : undefined,
    };
  }

  const portfolioVisitors = visitorRes.rows.map((v) => ({
    visitorId: v.visitor_id,
    visitorName: v.visitor_name || '',
    visitorCompany: v.visitor_company || '',
    visitorRole: v.visitor_role || '',
    deviceSummary: v.device_summary || '',
    timezone: v.timezone || '',
    browserLang: v.browser_lang || '',
    referrer: v.referrer || '',
    ipRegion: v.ip_region || '',
    liked: Boolean(v.liked),
    visitCount: Number(v.visit_count) || 1,
    firstVisitedAt: v.first_visited_at ? new Date(v.first_visited_at).toISOString() : undefined,
    lastVisitedAt: v.last_visited_at ? new Date(v.last_visited_at).toISOString() : undefined,
    likedAt: v.liked_at ? new Date(v.liked_at).toISOString() : undefined,
  }));

  const statsRes = await db.query(`
    SELECT
      COUNT(*)::int AS total_visitors,
      COUNT(*) FILTER (WHERE liked = TRUE)::int AS total_likes
    FROM portfolio_visitors
  `);

  return {
    ok: true,
    baseCv: settingsRes.rows[0]?.base_cv || null,
    selectedModel: settingsRes.rows[0]?.selected_model || null,
    profilePhoto: settingsRes.rows[0]?.profile_photo || '',
    siteContent: settingsRes.rows[0]?.site_content || null,
    silhouettePhoto: settingsRes.rows[0]?.silhouette_photo || '',
    editorialPhoto: settingsRes.rows[0]?.editorial_photo || '',
    vacancies: vacancyRes.rows.map(mapVacancyRow),
    tailoredMap,
    applicationLogs: logRes.rows.map((l) => ({
      id: l.id,
      vacancyId: l.vacancy_id,
      company: l.company,
      role: l.role || '',
      method: l.method,
      hrEmail: l.hr_email || '',
      subject: l.subject || '',
      timestamp: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString(),
    })),
    assistantMessages: msgRes.rows.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      createdAt: m.created_at ? new Date(m.created_at).toISOString() : undefined,
    })),
    portfolioVisitors,
    portfolioStats: {
      totalVisitors: Number(statsRes.rows[0]?.total_visitors) || 0,
      totalLikes: Number(statsRes.rows[0]?.total_likes) || 0,
    },
  };
}

export async function saveProfileSettings({
  baseCv,
  selectedModel,
  profilePhoto,
  siteContent,
  silhouettePhoto,
  editorialPhoto,
}) {
  const db = getPool();
  await ensureSchema();

  if (baseCv !== undefined) {
    await db.query(
      `INSERT INTO app_settings (
         id, base_cv, selected_model, profile_photo, site_content, silhouette_photo, editorial_photo, updated_at
       )
       VALUES ('default', $1::jsonb, $2, $3, $4::jsonb, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET
         base_cv = EXCLUDED.base_cv,
         selected_model = COALESCE($7, app_settings.selected_model),
         profile_photo = COALESCE($8, app_settings.profile_photo),
         site_content = COALESCE($9::jsonb, app_settings.site_content),
         silhouette_photo = COALESCE($10, app_settings.silhouette_photo),
         editorial_photo = COALESCE($11, app_settings.editorial_photo),
         updated_at = NOW()`,
      [
        JSON.stringify(baseCv),
        selectedModel || 'gemini-4-hydrogen',
        profilePhoto !== undefined ? profilePhoto : '',
        siteContent !== undefined ? JSON.stringify(siteContent) : null,
        silhouettePhoto !== undefined ? silhouettePhoto : '',
        editorialPhoto !== undefined ? editorialPhoto : '',
        selectedModel || null,
        profilePhoto !== undefined ? profilePhoto : null,
        siteContent !== undefined ? JSON.stringify(siteContent) : null,
        silhouettePhoto !== undefined ? silhouettePhoto : null,
        editorialPhoto !== undefined ? editorialPhoto : null,
      ]
    );
  } else {
    if (selectedModel !== undefined) {
      await db.query(
        `UPDATE app_settings SET selected_model = $1, updated_at = NOW() WHERE id = 'default'`,
        [selectedModel]
      );
    }
    if (profilePhoto !== undefined) {
      await db.query(
        `UPDATE app_settings SET profile_photo = $1, updated_at = NOW() WHERE id = 'default'`,
        [profilePhoto]
      );
    }
    if (siteContent !== undefined) {
      await db.query(
        `UPDATE app_settings SET site_content = $1::jsonb, updated_at = NOW() WHERE id = 'default'`,
        [siteContent === null ? null : JSON.stringify(siteContent)]
      );
    }
    if (silhouettePhoto !== undefined) {
      await db.query(
        `UPDATE app_settings SET silhouette_photo = $1, updated_at = NOW() WHERE id = 'default'`,
        [silhouettePhoto]
      );
    }
    if (editorialPhoto !== undefined) {
      await db.query(
        `UPDATE app_settings SET editorial_photo = $1, updated_at = NOW() WHERE id = 'default'`,
        [editorialPhoto]
      );
    }
  }

  return { ok: true };
}

export async function upsertVacancies(items, mode = 'append') {
  const db = getPool();
  await ensureSchema();

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    if (mode === 'replace') {
      await client.query('DELETE FROM vacancies');
    }

    for (const v of items || []) {
      await client.query(
        `INSERT INTO vacancies (
          id, company, role, location, work_mode, experience_required,
          package_lpa, lpa_numeric_min, lpa_numeric_max,
          interview_type, walk_in_timings, apply_link,
          hr_name, hr_role, hr_email, hr_phone, hr_notes,
          required_skills, match_score, matched_skills, missing_skills,
          deep_analysis_notes, posted_or_deadline, status, source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15, $16, $17,
          $18::jsonb, $19, $20::jsonb, $21::jsonb,
          $22, $23, $24, $25, $26, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          company = EXCLUDED.company,
          role = EXCLUDED.role,
          location = EXCLUDED.location,
          package_lpa = EXCLUDED.package_lpa,
          interview_type = EXCLUDED.interview_type,
          walk_in_timings = EXCLUDED.walk_in_timings,
          apply_link = EXCLUDED.apply_link,
          hr_name = EXCLUDED.hr_name,
          hr_email = EXCLUDED.hr_email,
          hr_phone = EXCLUDED.hr_phone,
          status = EXCLUDED.status,
          updated_at = NOW()`,
        [
          v.id,
          v.company,
          v.role,
          v.location || '',
          v.workMode || 'On-site',
          v.experienceRequired || '',
          v.packageLpa || 'Not Disclosed',
          Number(v.lpaNumericMin) || 0,
          Number(v.lpaNumericMax) || 0,
          v.interviewType || 'online',
          v.walkInTimings || '',
          v.applyLink || '',
          v.hrName || '',
          v.hrRole || '',
          v.hrEmail || '',
          v.hrPhone || '',
          v.hrNotes || '',
          JSON.stringify(v.requiredSkills || []),
          Number(v.matchScore) || 75,
          JSON.stringify(v.matchedSkills || []),
          JSON.stringify(v.missingSkills || []),
          v.deepAnalysisNotes || '',
          v.postedOrDeadline || 'Active',
          v.status || 'New',
          v.source || 'Uploaded CSV',
          v.createdAt || new Date().toISOString(),
        ]
      );
    }

    await client.query('COMMIT');
    return { ok: true, count: (items || []).length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function patchVacancy(id, updates) {
  const db = getPool();
  await ensureSchema();

  const existing = await db.query(`SELECT * FROM vacancies WHERE id = $1 LIMIT 1`, [id]);
  if (!existing.rows.length) {
    const err = new Error('Vacancy not found.');
    err.statusCode = 404;
    throw err;
  }
  const cur = existing.rows[0];

  await db.query(
    `UPDATE vacancies SET
      status = $1,
      hr_name = $2,
      hr_role = $3,
      hr_email = $4,
      hr_phone = $5,
      updated_at = NOW()
     WHERE id = $6`,
    [
      updates.status !== undefined ? updates.status : cur.status,
      updates.hrName !== undefined ? updates.hrName : cur.hr_name,
      updates.hrRole !== undefined ? updates.hrRole : cur.hr_role,
      updates.hrEmail !== undefined ? updates.hrEmail : cur.hr_email,
      updates.hrPhone !== undefined ? updates.hrPhone : cur.hr_phone,
      id,
    ]
  );

  return { ok: true };
}

export async function removeVacancy(id, clearAll = false) {
  const db = getPool();
  await ensureSchema();
  if (clearAll) {
    await db.query(`DELETE FROM vacancies`);
  } else if (id) {
    await db.query(`DELETE FROM vacancies WHERE id = $1`, [id]);
  }
  return { ok: true };
}

export async function upsertTailoredCv(vacancyId, payload) {
  const db = getPool();
  await ensureSchema();
  await db.query(
    `INSERT INTO tailored_cvs (
      vacancy_id, ats_score, tailoring_notes, added_keywords, tailored_cv, model_used, generated_at, edited_at
    ) VALUES (
      $1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8
    )
    ON CONFLICT (vacancy_id) DO UPDATE SET
      ats_score = EXCLUDED.ats_score,
      tailoring_notes = EXCLUDED.tailoring_notes,
      added_keywords = EXCLUDED.added_keywords,
      tailored_cv = EXCLUDED.tailored_cv,
      model_used = EXCLUDED.model_used,
      edited_at = EXCLUDED.edited_at`,
    [
      vacancyId,
      Number(payload.atsScore) || 85,
      payload.tailoringNotes || '',
      JSON.stringify(payload.addedKeywords || []),
      JSON.stringify(payload.tailoredCv),
      payload.modelUsed || '',
      payload.generatedAt || new Date().toISOString(),
      payload.editedAt || null,
    ]
  );
  return { ok: true };
}

export async function insertApplicationLog(log) {
  const db = getPool();
  await ensureSchema();
  await db.query(
    `INSERT INTO application_logs (id, vacancy_id, company, role, method, hr_email, subject, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      log.id,
      log.vacancyId || null,
      log.company,
      log.role || '',
      log.method,
      log.hrEmail || '',
      log.subject || '',
      log.timestamp || new Date().toISOString(),
    ]
  );
  if (log.vacancyId) {
    await db.query(`UPDATE vacancies SET status = 'Applied', updated_at = NOW() WHERE id = $1`, [
      log.vacancyId,
    ]);
  }
  return { ok: true };
}

export async function appendAssistantMessage(role, text) {
  const db = getPool();
  await ensureSchema();
  await db.query(`INSERT INTO assistant_messages (role, text) VALUES ($1, $2)`, [role, text]);
  return { ok: true };
}

export async function resetAssistantMessages() {
  const db = getPool();
  await ensureSchema();
  await db.query(`DELETE FROM assistant_messages`);
  return { ok: true };
}

export async function getPublicEngagementSummary() {
  const db = getPool();
  await ensureSchema();
  const [countsRes, recentRes] = await Promise.all([
    db.query(`
      SELECT
        COUNT(*)::int AS total_visitors,
        COUNT(*) FILTER (WHERE liked = TRUE)::int AS total_likes
      FROM portfolio_visitors
    `),
    db.query(`
      SELECT visitor_name, visitor_company, visitor_role, liked, ip_region, device_summary, last_visited_at
      FROM portfolio_visitors
      ORDER BY last_visited_at DESC
      LIMIT 12
    `),
  ]);

  return {
    totalVisitors: Number(countsRes.rows[0]?.total_visitors) || 0,
    totalLikes: Number(countsRes.rows[0]?.total_likes) || 0,
    recentVisitors: recentRes.rows.map((r) => ({
      visitorName: r.visitor_name || '',
      visitorCompany: r.visitor_company || '',
      visitorRole: r.visitor_role || '',
      liked: Boolean(r.liked),
      ipRegion: r.ip_region || '',
      deviceSummary: r.device_summary || '',
      lastVisitedAt: r.last_visited_at ? new Date(r.last_visited_at).toISOString() : undefined,
    })),
  };
}

export async function recordPortfolioEngagement({
  visitorId,
  action = 'visit',
  visitorName,
  visitorCompany,
  visitorRole,
  deviceSummary,
  timezone,
  browserLang,
  referrer,
  ipRegion,
}) {
  const db = getPool();
  await ensureSchema();

  const cleanId = String(visitorId || '').slice(0, 120) || `anon_${Date.now()}`;
  const isLikeAction = action === 'like';
  const isUnlikeAction = action === 'unlike';

  await db.query(
    `INSERT INTO portfolio_visitors (
      visitor_id, visitor_name, visitor_company, visitor_role,
      device_summary, timezone, browser_lang, referrer, ip_region,
      liked, visit_count, first_visited_at, last_visited_at, liked_at
    ) VALUES (
      $1, $2, $3, $4,
      $5, $6, $7, $8, $9,
      $10, 1, NOW(), NOW(), $11
    )
    ON CONFLICT (visitor_id) DO UPDATE SET
      visitor_name = CASE WHEN $2 <> '' THEN $2 ELSE portfolio_visitors.visitor_name END,
      visitor_company = CASE WHEN $3 <> '' THEN $3 ELSE portfolio_visitors.visitor_company END,
      visitor_role = CASE WHEN $4 <> '' THEN $4 ELSE portfolio_visitors.visitor_role END,
      device_summary = CASE WHEN $5 <> '' THEN $5 ELSE portfolio_visitors.device_summary END,
      timezone = CASE WHEN $6 <> '' THEN $6 ELSE portfolio_visitors.timezone END,
      browser_lang = CASE WHEN $7 <> '' THEN $7 ELSE portfolio_visitors.browser_lang END,
      referrer = CASE WHEN $8 <> '' THEN $8 ELSE portfolio_visitors.referrer END,
      ip_region = CASE WHEN $9 <> '' THEN $9 ELSE portfolio_visitors.ip_region END,
      visit_count = CASE WHEN $12 = 'visit' THEN portfolio_visitors.visit_count + 1 ELSE portfolio_visitors.visit_count END,
      liked = CASE
        WHEN $12 = 'like' THEN TRUE
        WHEN $12 = 'unlike' THEN FALSE
        ELSE portfolio_visitors.liked
      END,
      liked_at = CASE
        WHEN $12 = 'like' THEN COALESCE(portfolio_visitors.liked_at, NOW())
        WHEN $12 = 'unlike' THEN NULL
        ELSE portfolio_visitors.liked_at
      END,
      last_visited_at = NOW()`,
    [
      cleanId,
      String(visitorName || '').trim().slice(0, 100),
      String(visitorCompany || '').trim().slice(0, 100),
      String(visitorRole || '').trim().slice(0, 100),
      String(deviceSummary || '').trim().slice(0, 140),
      String(timezone || '').trim().slice(0, 80),
      String(browserLang || '').trim().slice(0, 40),
      String(referrer || '').trim().slice(0, 200),
      String(ipRegion || '').trim().slice(0, 100),
      isLikeAction,
      isLikeAction ? new Date().toISOString() : null,
      isUnlikeAction ? 'unlike' : action,
    ]
  );

  const summary = await getPublicEngagementSummary();
  const selfRow = await db.query(
    `SELECT liked, visitor_name, visitor_company FROM portfolio_visitors WHERE visitor_id = $1 LIMIT 1`,
    [cleanId]
  );

  return {
    ok: true,
    ...summary,
    viewerLiked: Boolean(selfRow.rows[0]?.liked),
    viewerName: selfRow.rows[0]?.visitor_name || '',
    viewerCompany: selfRow.rows[0]?.visitor_company || '',
  };
}

export async function saveRememberedAdminLogin({
  deviceId,
  username,
  passwordHash,
  passwordEnc,
  iv,
  authTag,
  userAgent,
}) {
  const db = getPool();
  await ensureSchema();
  await db.query(
    `INSERT INTO admin_saved_logins (
      device_id, username, password_hash, password_enc, iv, auth_tag, user_agent, last_used_at, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    ON CONFLICT (device_id) DO UPDATE SET
      username = EXCLUDED.username,
      password_hash = EXCLUDED.password_hash,
      password_enc = EXCLUDED.password_enc,
      iv = EXCLUDED.iv,
      auth_tag = EXCLUDED.auth_tag,
      user_agent = EXCLUDED.user_agent,
      last_used_at = NOW()`,
    [
      String(deviceId),
      String(username || '').trim(),
      String(passwordHash || ''),
      String(passwordEnc || ''),
      String(iv || ''),
      String(authTag || ''),
      String(userAgent || '').slice(0, 220),
    ]
  );
  return { ok: true };
}

export async function getRememberedAdminLogin(deviceId) {
  if (!deviceId) return null;
  const db = getPool();
  await ensureSchema();
  const res = await db.query(
    `SELECT device_id, username, password_enc, iv, auth_tag, last_used_at
     FROM admin_saved_logins WHERE device_id = $1 LIMIT 1`,
    [String(deviceId)]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    deviceId: row.device_id,
    username: row.username,
    passwordEnc: row.password_enc,
    iv: row.iv,
    authTag: row.auth_tag,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at).toISOString() : undefined,
  };
}

export async function deleteRememberedAdminLogin(deviceId) {
  if (!deviceId) return { ok: true };
  const db = getPool();
  await ensureSchema();
  await db.query(`DELETE FROM admin_saved_logins WHERE device_id = $1`, [String(deviceId)]);
  return { ok: true };
}
