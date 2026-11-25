import { cvToPlainText } from '../data/defaultCv.js';

export const CSV_HEADERS = [
  'Company',
  'Role',
  'Location',
  'WorkMode',
  'Experience',
  'PackageLPA',
  'InterviewType',
  'WalkInTimings',
  'ApplyLink',
  'HRName',
  'HRRole',
  'HREmail',
  'HRPhone',
  'HRNotes',
  'RequiredSkills',
  'MatchScore',
  'MatchedSkills',
  'MissingSkills',
  'DeepAnalysisNotes',
  'PostedOrDeadline',
];

function parseCsvRows(csvText) {
  const text = String(csvText || '').replace(/^\uFEFF/, ''); // strip UTF-8 BOM
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell !== ''));
}

function normalizeHeader(h) {
  return String(h || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES = {
  company: ['company', 'companyname', 'organization'],
  role: ['role', 'roletitle', 'jobtitle', 'position', 'title'],
  location: ['location', 'city', 'place'],
  workMode: ['workmode', 'mode', 'worktype'],
  experience: ['experience', 'experiencerequired', 'exp'],
  packageLpa: ['packagelpa', 'package', 'lpa', 'salary', 'ctc'],
  interviewType: ['interviewtype', 'drivetype', 'applicationtype', 'type'],
  walkInTimings: ['walkintimings', 'walkindetails', 'walkin', 'timings', 'interviewtimings', 'venue'],
  applyLink: ['applylink', 'link', 'url', 'applyurl', 'applicationlink'],
  hrName: ['hrname', 'recruitername', 'hr', 'contactname'],
  hrRole: ['hrrole', 'recruiterrole'],
  hrEmail: ['hremail', 'recruiteremail', 'email', 'contactemail'],
  hrPhone: ['hrphone', 'recruiterphone', 'phone', 'mobile', 'contactnumber'],
  hrNotes: ['hrnotes', 'contactnotes'],
  requiredSkills: ['requiredskills', 'skills', 'techstack'],
  matchScore: ['matchscore', 'fitscore', 'score', 'match'],
  matchedSkills: ['matchedskills', 'matchingskills'],
  missingSkills: ['missingskills', 'skillgaps', 'gaps'],
  deepAnalysisNotes: ['deepanalysisnotes', 'analysis', 'notes', 'insights', 'deepanalysis'],
  postedOrDeadline: ['postedordeadline', 'deadline', 'posted', 'date'],
};

function splitSkillList(val) {
  if (!val) return [];
  return String(val)
    .split(/[;|]/)
    .flatMap((part) => (part.includes(',') ? part.split(',') : [part]))
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseLpaRange(packageStr) {
  const nums = String(packageStr || '').match(/(\d+(?:\.\d+)?)/g);
  if (!nums || !nums.length) return { min: 0, max: 0 };
  const min = Number(nums[0]) || 0;
  const max = nums[1] ? Number(nums[1]) || min : min;
  return { min, max };
}

export function parseVacanciesCsv(csvText, sourceLabel = 'Uploaded CSV') {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one vacancy data row.');
  }

  const rawHeaders = rows[0].map(normalizeHeader);
  const colIndex = {};

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    const idx = rawHeaders.findIndex((h) => aliases.includes(h));
    if (idx !== -1) colIndex[field] = idx;
  });

  if (colIndex.company === undefined && colIndex.role === undefined) {
    throw new Error(
      'Could not find "Company" or "Role" columns in CSV header. Use the provided Deep Analysis Prompt or Sample CSV template.'
    );
  }

  const getCell = (r, field) => {
    const idx = colIndex[field];
    return idx !== undefined ? (r[idx] || '').trim() : '';
  };

  const vacancies = rows.slice(1).map((r, i) => {
    const company = getCell(r, 'company') || 'Unknown Company';
    const role = getCell(r, 'role') || 'Software Role';
    const packageLpa = getCell(r, 'packageLpa') || 'Not Disclosed';
    const { min, max } = parseLpaRange(packageLpa);

    const rawType = getCell(r, 'interviewType').toLowerCase();
    const walkInTimings = getCell(r, 'walkInTimings');
    const applyLink = getCell(r, 'applyLink');
    const isWalkIn =
      rawType.includes('walk') || (!rawType && Boolean(walkInTimings) && !applyLink);

    const rawScore = Number(String(getCell(r, 'matchScore')).replace('%', '').trim());
    const matchScore = Number.isFinite(rawScore) && rawScore > 0 ? Math.min(100, rawScore) : 75;

    return {
      id: `vac_csv_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      company,
      role,
      location: getCell(r, 'location') || 'Bengaluru',
      workMode: getCell(r, 'workMode') || 'On-site',
      experienceRequired: getCell(r, 'experience') || '0-1 Years / Fresher',
      packageLpa,
      lpaNumericMin: min,
      lpaNumericMax: max,
      interviewType: isWalkIn ? 'walk-in' : 'online',
      walkInTimings,
      applyLink,
      hrName: getCell(r, 'hrName'),
      hrRole: getCell(r, 'hrRole') || 'HR / Talent Acquisition',
      hrEmail: getCell(r, 'hrEmail'),
      hrPhone: getCell(r, 'hrPhone'),
      hrNotes: getCell(r, 'hrNotes'),
      requiredSkills: splitSkillList(getCell(r, 'requiredSkills')),
      matchScore,
      matchedSkills: splitSkillList(getCell(r, 'matchedSkills')),
      missingSkills: splitSkillList(getCell(r, 'missingSkills')),
      deepAnalysisNotes: getCell(r, 'deepAnalysisNotes'),
      postedOrDeadline: getCell(r, 'postedOrDeadline') || 'Active',
      status: 'New',
      source: sourceLabel,
      createdAt: new Date().toISOString(),
    };
  });

  return vacancies;
}

export function generateSampleCsv() {
  const sampleRow1 = [
    'Example Tech Systems',
    'Junior Software Engineer / Python & React',
    'Bengaluru, Karnataka',
    'On-site',
    '0-1 Years (2026 Fresher)',
    '4.5 - 6.0 LPA',
    'walk-in',
    '27-28 Nov 2026 | 9:30 AM - 1:00 PM | EcoSpace, Bellandur, Bengaluru',
    '',
    'Priya Nair',
    'HR Executive',
    'careers@exampletech.com',
    '+91-80-4000-1234',
    'Walk-in registration at reception',
    'Python; SQL; React.js; JavaScript; Git',
    '88',
    'Python; SQL; React.js; JavaScript',
    'Docker',
    'Strong fit for Dyashin internship and VTU React.js certification.',
    'Walk-in: 28 Nov 2026',
  ];
  const sampleRow2 = [
    'Acme Data Analytics',
    'Associate Data Analyst',
    'Bengaluru / Hybrid',
    'Hybrid',
    'Fresher',
    '5.0 - 6.5 LPA',
    'online',
    '',
    'https://careers.example.com/jobs/associate-data-analyst',
    'Rahul Verma',
    'Talent Acquisition Lead',
    'talent@acmedata.example.com',
    '',
    'Apply on careers portal and email HR',
    'Python; Pandas; SQL; Tableau; EDA',
    '92',
    'Python; Pandas; SQL; Tableau; EDA',
    'Power BI',
    'Direct match with Dyashin Python & Data Analytics internship.',
    'Apply by 05 Dec 2026',
  ];

  const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
  return [
    CSV_HEADERS.join(','),
    sampleRow1.map(escape).join(','),
    sampleRow2.map(escape).join(','),
  ].join('\n');
}

export function buildDeepAnalysisPrompt({
  cv,
  targetRoles = 'Software Development Engineer, Software Tester / QA, Data Analyst, Full-Stack / React.js Developer (Fresher / 2026 Graduate)',
  targetLocations = 'Bengaluru, Shivamogga, Karnataka, Remote India',
  minLpa = '3.5+ LPA',
}) {
  const cvSummary = cvToPlainText(cv);
  return `Perform deep, real-time web research and strict data analysis to find currently active job vacancies and walk-in interviews in India that match my resume below.

CANDIDATE PROFILE:
${cvSummary}

SEARCH CRITERIA:
- Target Roles: ${targetRoles}
- Locations: ${targetLocations}
- Minimum Package: ${minLpa}
- Include BOTH Walk-In Drives AND Online Career Portal / Off-Campus Openings.

STRICT VERIFICATION & ACCURACY RULES:
1. Do NOT fabricate companies, URLs, walk-in dates, HR emails, or phone numbers. Use only real, currently active listings from official career pages, Naukri, LinkedIn, Unstop, or verified walk-in announcements.
2. Package (LPA): Report exact annual CTC in LPA (e.g., "4.5 - 6.0 LPA"). If monthly salary is listed, convert to annual LPA and note it.
3. Walk-In vs Online Rule:
   - If it is a Walk-In Interview, set InterviewType = "walk-in" and fill WalkInTimings with exact Date, Time Window, and Venue Address. Leave ApplyLink empty unless there is a mandatory pre-registration URL.
   - If it is an Online Application, set InterviewType = "online", leave WalkInTimings empty (""), and put the direct clickable application URL in ApplyLink.
4. HR Contact Details: Include verified HRName, HRRole, HREmail, and HRPhone if publicly published. If a personal HR email is not published, use the verified careers/recruiting email if available or leave HREmail empty and explain in HRNotes.
5. Deep Fit Analysis: Compute MatchScore (0-100) honestly against my skills/internships/projects, list semicolon-separated RequiredSkills, MatchedSkills, and MissingSkills, and write actionable DeepAnalysisNotes (salary benchmark + interview focus areas).

OUTPUT FORMAT (STRICT CSV ONLY):
Return ONLY a valid RFC-4180 CSV (inside a single csv code block or downloadable .csv file) with these EXACT 20 column headers on row 1, quoting any cell that contains commas, and separating skill lists with semicolons (;):

Company,Role,Location,WorkMode,Experience,PackageLPA,InterviewType,WalkInTimings,ApplyLink,HRName,HRRole,HREmail,HRPhone,HRNotes,RequiredSkills,MatchScore,MatchedSkills,MissingSkills,DeepAnalysisNotes,PostedOrDeadline`;
}
