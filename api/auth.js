import { setCorsHeaders, parseRequestBody } from './_smtp.js';
import {
  verifyAdminCredentials,
  createSessionToken,
  verifySessionToken,
  extractTokenFromReq,
  setSessionCookie,
  clearSessionCookie,
  hashPasswordSha256,
  encryptCredentialSecret,
  decryptCredentialSecret,
  generateDeviceId,
  extractRememberDeviceFromReq,
  setRememberDeviceCookie,
  clearRememberDeviceCookie,
} from './_auth.js';
import {
  saveRememberedAdminLogin,
  getRememberedAdminLogin,
  deleteRememberedAdminLogin,
} from './_db.js';

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const reqUrl = String(req.url || '');

  if (req.method === 'GET') {
    const token = extractTokenFromReq(req);
    const payload = verifySessionToken(token);
    let rememberedLogin = null;

    if (reqUrl.includes('remembered=1')) {
      try {
        const deviceId = extractRememberDeviceFromReq(req);
        if (deviceId) {
          const saved = await getRememberedAdminLogin(deviceId);
          if (saved) {
            const plainPassword = decryptCredentialSecret({
              passwordEnc: saved.passwordEnc,
              iv: saved.iv,
              authTag: saved.authTag,
            });
            if (plainPassword) {
              rememberedLogin = {
                username: saved.username,
                password: plainPassword,
                lastUsedAt: saved.lastUsedAt,
              };
            }
          }
        }
      } catch (err) {
        console.warn('/api/auth remembered lookup skipped:', err?.message || err);
      }
    }

    return res.status(200).json({
      ok: true,
      authenticated: Boolean(payload),
      user: payload ? { name: payload.sub, role: payload.role } : null,
      rememberedLogin,
    });
  }

  if (req.method === 'POST') {
    const body = parseRequestBody(req);
    const { username, password, rememberMe = true } = body || {};
    const cleanUsername = String(username || '').trim();

    if (!verifyAdminCredentials(cleanUsername, password)) {
      return res.status(401).json({
        ok: false,
        error: 'Invalid username or password.',
      });
    }

    const token = createSessionToken(cleanUsername);
    setSessionCookie(res, token);

    let savedToDb = false;
    try {
      const existingDeviceId = extractRememberDeviceFromReq(req);
      if (rememberMe !== false) {
        const deviceId = existingDeviceId || generateDeviceId();
        const { passwordEnc, iv, authTag } = encryptCredentialSecret(password);
        await saveRememberedAdminLogin({
          deviceId,
          username: cleanUsername,
          passwordHash: hashPasswordSha256(password),
          passwordEnc,
          iv,
          authTag,
          userAgent: req.headers?.['user-agent'] || '',
        });
        setRememberDeviceCookie(res, deviceId);
        savedToDb = true;
      } else if (existingDeviceId) {
        await deleteRememberedAdminLogin(existingDeviceId);
        clearRememberDeviceCookie(res);
      }
    } catch (err) {
      console.warn('/api/auth DB remember-login skipped:', err?.message || err);
    }

    return res.status(200).json({
      ok: true,
      authenticated: true,
      savedToDb,
      token,
      user: { name: cleanUsername, role: 'admin' },
    });
  }

  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    if (reqUrl.includes('forget=1')) {
      try {
        const deviceId = extractRememberDeviceFromReq(req);
        if (deviceId) {
          await deleteRememberedAdminLogin(deviceId);
        }
      } catch (err) {
        console.warn('/api/auth forget-login warning:', err?.message || err);
      }
      clearRememberDeviceCookie(res);
    }
    return res.status(200).json({ ok: true, authenticated: false });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed.' });
}
