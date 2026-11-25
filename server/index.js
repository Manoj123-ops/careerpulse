import express from 'express';
import cors from 'cors';
import healthHandler from '../api/health.js';
import stateHandler from '../api/state.js';
import vacanciesHandler from '../api/vacancies.js';
import tailoredCvHandler from '../api/tailored-cv.js';
import applicationsHandler from '../api/applications.js';
import profileHandler from '../api/profile.js';
import assistantHandler from '../api/assistant.js';
import testSmtpHandler from '../api/test-smtp.js';
import sendEmailHandler from '../api/send-email.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.all('/api/health', healthHandler);
app.all('/api/state', stateHandler);
app.all('/api/vacancies', vacanciesHandler);
app.all('/api/tailored-cv', tailoredCvHandler);
app.all('/api/applications', applicationsHandler);
app.all('/api/profile', profileHandler);
app.all('/api/assistant', assistantHandler);
app.all('/api/test-smtp', testSmtpHandler);
app.all('/api/send-email', sendEmailHandler);

app.listen(PORT, () => {
  console.log(`CareerPulse API Server (Neon DB + SMTP) running at http://localhost:${PORT}`);
});
