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
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
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

  const [settingsRes, vacancyRes, tailoredRes, logRes, msgRes] = await Promise.all([
    db.query(`SELECT base_cv, selected_model, updated_at FROM app_settings WHERE id = 'default' LIMIT 1`),
    db.query(`SELECT * FROM vacancies ORDER BY created_at DESC`),
    db.query(`SELECT * FROM tailored_cvs`),
    db.query(`SELECT * FROM application_logs ORDER BY created_at ASC`),
    db.query(`SELECT id, role, text, created_at FROM assistant_messages ORDER BY id ASC LIMIT 60`),
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

  return {
    ok: true,
    baseCv: settingsRes.rows[0]?.base_cv || null,
    selectedModel: settingsRes.rows[0]?.selected_model || null,
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
  };
}

export async function saveProfileSettings({ baseCv, selectedModel }) {
  const db = getPool();
  await ensureSchema();

  if (baseCv && selectedModel) {
    await db.query(
      `INSERT INTO app_settings (id, base_cv, selected_model, updated_at)
       VALUES ('default', $1::jsonb, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET
         base_cv = EXCLUDED.base_cv,
         selected_model = EXCLUDED.selected_model,
         updated_at = NOW()`,
      [JSON.stringify(baseCv), selectedModel]
    );
  } else if (baseCv) {
    await db.query(
      `INSERT INTO app_settings (id, base_cv, selected_model, updated_at)
       VALUES ('default', $1::jsonb, 'gemini-4-hydrogen', NOW())
       ON CONFLICT (id) DO UPDATE SET
         base_cv = EXCLUDED.base_cv,
         updated_at = NOW()`,
      [JSON.stringify(baseCv)]
    );
  } else if (selectedModel) {
    await db.query(
      `UPDATE app_settings SET selected_model = $1, updated_at = NOW() WHERE id = 'default'`,
      [selectedModel]
    );
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
