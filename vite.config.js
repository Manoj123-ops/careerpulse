import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import healthHandler from './api/health.js';
import authHandler from './api/auth.js';
import publicPortfolioHandler from './api/public-portfolio.js';
import stateHandler from './api/state.js';
import vacanciesHandler from './api/vacancies.js';
import tailoredCvHandler from './api/tailored-cv.js';
import applicationsHandler from './api/applications.js';
import profileHandler from './api/profile.js';
import assistantHandler from './api/assistant.js';
import testSmtpHandler from './api/test-smtp.js';
import sendEmailHandler from './api/send-email.js';

const API_ROUTES = {
  '/api/health': healthHandler,
  '/api/auth': authHandler,
  '/api/public-portfolio': publicPortfolioHandler,
  '/api/state': stateHandler,
  '/api/vacancies': vacanciesHandler,
  '/api/tailored-cv': tailoredCvHandler,
  '/api/applications': applicationsHandler,
  '/api/profile': profileHandler,
  '/api/assistant': assistantHandler,
  '/api/test-smtp': testSmtpHandler,
  '/api/send-email': sendEmailHandler,
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return resolve(undefined);
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function enhanceResponse(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
    }
    res.end(JSON.stringify(data));
    return res;
  };
  return res;
}

function localApiPlugin() {
  return {
    name: 'careerpulse-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = (req.url || '').split('?')[0];
        const handler = API_ROUTES[pathname];
        if (!handler) return next();

        try {
          req.body = await readJsonBody(req);
          enhanceResponse(res);
          await handler(req, res);
        } catch (err) {
          enhanceResponse(res).status(500).json({
            ok: false,
            error: err?.message || 'Internal API middleware error',
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
  server: {
    port: 5173,
  },
});
