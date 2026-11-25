import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODELS } from '../data/models.js';
import { cvToPlainText } from '../data/defaultCv.js';

function getClient(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Please configure your Gemini API key in Settings first.');
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

function extractJsonFromText(rawText) {
  if (!rawText) throw new Error('Empty response received from Gemini.');
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const startObj = trimmed.indexOf('{');
    const startArr = trimmed.indexOf('[');
    let start = -1;
    let end = -1;
    if (startArr !== -1 && (startObj === -1 || startArr < startObj)) {
      start = startArr;
      end = trimmed.lastIndexOf(']');
    } else if (startObj !== -1) {
      start = startObj;
      end = trimmed.lastIndexOf('}');
    }
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Model response could not be parsed as valid JSON.');
  }
}

export async function testGeminiConnection(apiKey, modelId) {
  const ai = getClient(apiKey);
  const started = performance.now();
  const response = await ai.models.generateContent({
    model: modelId,
    contents: 'Reply with a concise 1-line confirmation: "Gemini connection active."',
  });
  const elapsedMs = Math.round(performance.now() - started);
  return {
    ok: true,
    latencyMs: elapsedMs,
    reply: response.text?.trim() || 'Connected',
  };
}

export async function fetchAvailableGeminiModels(apiKey) {
  const ai = getClient(apiKey);
  const modelsPager = await ai.models.list({ config: { pageSize: 50 } });
  const liveIds = [];
  for await (const m of modelsPager) {
    const id = (m.name || '').replace(/^models\//, '');
    if (id && id.includes('gemini')) {
      liveIds.push({
        id,
        displayName: m.displayName || id,
        description: m.description || '',
      });
    }
  }
  const knownMap = new Map(GEMINI_MODELS.map((m) => [m.id, m]));
  const extraModels = liveIds
    .filter((m) => !knownMap.has(m.id))
    .filter((m) => !m.id.includes('embedding') && !m.id.includes('tts') && !m.id.includes('image'))
    .map((m) => ({
      id: m.id,
      name: m.displayName,
      family: 'Live API Discovered',
      badge: 'Live API',
      tier: 'live',
      speed: 'Standard',
      contextWindow: 'API Listed',
      maxOutput: 'API Listed',
      supportsSearchGrounding: true,
      supportsStructuredWithTools: true,
      description: m.description || 'Dynamically discovered from your Gemini API key.',
    }));

  return {
    curated: GEMINI_MODELS,
    extra: extraModels,
    liveCount: liveIds.length,
  };
}

const TAILORED_CV_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    atsScore: { type: Type.NUMBER },
    tailoringNotes: { type: Type.STRING },
    addedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    tailoredCv: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        headline: { type: Type.STRING },
        phone: { type: Type.STRING },
        email: { type: Type.STRING },
        linkedin: { type: Type.STRING },
        github: { type: Type.STRING },
        location: { type: Type.STRING },
        summary: { type: Type.STRING },
        education: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              degree: { type: Type.STRING },
              institution: { type: Type.STRING },
              period: { type: Type.STRING },
              score: { type: Type.STRING },
            },
          },
        },
        skills: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              items: { type: Type.STRING },
            },
          },
        },
        experience: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              company: { type: Type.STRING },
              period: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
        projects: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              tech: { type: Type.STRING },
              bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
        certifications: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['fullName', 'headline', 'summary', 'skills', 'experience', 'projects'],
    },
  },
  required: ['atsScore', 'tailoringNotes', 'addedKeywords', 'tailoredCv'],
};

export async function generateTailoredCv({ apiKey, modelId, baseCv, vacancy }) {
  const ai = getClient(apiKey);
  const prompt = `You are an expert ATS Resume Architect.
Modify the candidate's EXISTING CV specifically for the target company and role below.

STRICT TRUTHFULNESS RULES:
- Preserve 100% of the candidate's real facts: exact name, contact details, exact colleges/CGPA/dates, exact internship companies/dates (Dyashin Technosoft Pvt. Ltd., VTU Centre for Online Education), exact projects (Diabetes Mellitus Prediction, Library Management System), and exact certifications.
- DO NOT invent fake experience, fake companies, or fake metrics.
- DO tailor:
  1. Headline to mirror the target role at ${vacancy.company}.
  2. Professional Summary to spotlight the exact relevant experience & skills for ${vacancy.role}.
  3. Technical Skills ordering & grouping so the most relevant skills for ${vacancy.company} appear first.
  4. Experience and Project bullet phrasing to naturally integrate ATS keywords from the role's required skills (${(vacancy.requiredSkills || []).join(', ')}) while remaining 100% faithful to what the candidate actually did.

TARGET VACANCY:
Company: ${vacancy.company}
Role: ${vacancy.role}
Location: ${vacancy.location}
Package: ${vacancy.packageLpa}
Required Skills: ${(vacancy.requiredSkills || []).join(', ')}
Analysis Notes: ${vacancy.deepAnalysisNotes}

CANDIDATE BASE CV (JSON):
${JSON.stringify(baseCv, null, 2)}`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      temperature: 0.25,
      responseMimeType: 'application/json',
      responseJsonSchema: TAILORED_CV_SCHEMA,
    },
  });

  const result = extractJsonFromText(response.text);
  // Guarantee personal contact & education preservation fallback
  const mergedCv = {
    ...baseCv,
    ...result.tailoredCv,
    fullName: result.tailoredCv?.fullName || baseCv.fullName,
    phone: baseCv.phone,
    email: baseCv.email,
    linkedin: baseCv.linkedin,
    github: baseCv.github,
    education: result.tailoredCv?.education?.length ? result.tailoredCv.education : baseCv.education,
    certifications: result.tailoredCv?.certifications?.length
      ? result.tailoredCv.certifications
      : baseCv.certifications,
  };

  return {
    atsScore: Math.min(100, Math.max(0, Number(result.atsScore) || 85)),
    tailoringNotes: result.tailoringNotes || `Tailored for ${vacancy.role} at ${vacancy.company}.`,
    addedKeywords: result.addedKeywords || [],
    tailoredCv: mergedCv,
    generatedAt: new Date().toISOString(),
    modelUsed: modelId,
  };
}

export async function generateHrEmailDraft({ apiKey, modelId, cv, vacancy }) {
  const ai = getClient(apiKey);
  const prompt = `Write a concise, persuasive, professional job application email to HR.

CANDIDATE:
Name: ${cv.fullName}
Headline: ${cv.headline}
Phone: ${cv.phone}
Email: ${cv.email}
LinkedIn: ${cv.linkedin}
GitHub: ${cv.github}
Summary: ${cv.summary}

TARGET ROLE:
Company: ${vacancy.company}
Role: ${vacancy.role}
HR Name: ${vacancy.hrName || 'Hiring Team'}
Interview Type: ${vacancy.interviewType}
${vacancy.walkInTimings ? `Walk-In Details: ${vacancy.walkInTimings}` : ''}

Return valid JSON with keys "subject" and "body".
Keep the email body under 180 words, crisp, confident, mentioning relevant highlights (Dyashin Technosoft internship / VTU React & Cybersecurity Elite Gold / 83% ML ensemble or MySQL project depending on role fit), and clearly noting that the tailored CV PDF is attached.`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      temperature: 0.35,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          body: { type: Type.STRING },
        },
        required: ['subject', 'body'],
      },
    },
  });

  return extractJsonFromText(response.text);
}

export async function askJobAssistant({ apiKey, modelId, question, history, cv, vacancies }) {
  const ai = getClient(apiKey);
  const applied = vacancies.filter((v) => ['Applied', 'Interview', 'Offer'].includes(v.status));
  const walkIns = vacancies.filter((v) => v.interviewType === 'walk-in');

  const systemContext = `You are CareerPulse AI, Manoj Kumar PR's personal Job & Career Assistant.
Be specific, practical, data-driven, and reference the actual vacancies and CV data below.

CANDIDATE CV SUMMARY:
${cvToPlainText(cv)}

CURRENT PIPELINE SNAPSHOT:
- Total Vacancies Tracked: ${vacancies.length}
- Applied / Interview / Offer Count: ${applied.length}
- Walk-In Drives Found: ${walkIns.length}
- Tracked Vacancies JSON:
${JSON.stringify(
  vacancies.map((v) => ({
    company: v.company,
    role: v.role,
    packageLpa: v.packageLpa,
    interviewType: v.interviewType,
    walkInTimings: v.walkInTimings,
    applyLink: v.applyLink,
    hrEmail: v.hrEmail,
    status: v.status,
    matchScore: v.matchScore,
    missingSkills: v.missingSkills,
  })),
  null,
  2
)}`;

  const conversationHistory = (history || [])
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n\n');

  const fullPrompt = `${systemContext}

${conversationHistory ? `CONVERSATION SO FAR:\n${conversationHistory}\n\n` : ''}User: ${question}`;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: fullPrompt,
    config: {
      temperature: 0.4,
    },
  });

  return response.text?.trim() || 'I could not generate a response. Please try again.';
}
