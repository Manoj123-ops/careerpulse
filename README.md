# CareerPulse AI — Deep Vacancy Analysis, Tailored CV & Job Assistant

Local React + Node.js career assistant built for **Manoj Kumar PR** (pre-loaded with your uploaded CV).

## Features
- **Gemini API & Latest Active Models Config**: Supports `gemini-4-hydrogen`, `gemini-4-carbon`, `gemini-4-neon`, `gemini-4-argon`, `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-flash-lite`, plus **Sync Live Models** from your API key.
- **Deep Vacancy Data Analysis Table**: Uses Google Search Grounding (or pasted job circulars) to strictly analyze and list:
  - Company, Role, Match Score %, Location & Skill Fit Breakdown
  - Package (LPA)
  - **Walk-In Interview Timings & Venue** (when walk-in) OR **Direct Apply Link** (when online)
  - **HR Contact Details** (editable inline)
  - **Actions**: `Generate CV` (modifies your existing CV for that company), `Edit` (live split-screen CV editor + preview), `Download` (ATS PDF / TXT), and `Send to HR` (Direct SMTP with PDF attached or 1-click Gmail Compose).
- **Analytics & Applied Companies Tracker**: Tracks how many companies applied, conversion funnel, LPA benchmarks, and skill gaps.
- **AI Job Assistant**: Context-aware interview prep and career coach.

## Run Locally
Double-click `start-app.bat`, or run in Command Prompt:
```bat
npm run dev
```
Then open `http://localhost:5173`.
