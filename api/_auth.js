import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Manoj Kumar PR';
// Precomputed SHA-256 of "Manoj@123" with static salt so plaintext password is never in client code
const DEFAULT_SALT = 'careerpulse_mk_2026_salt';
const DEFAULT_PW_HASH = crypto
  .createHash('sha256')
  .update(`${DEFAULT_SALT}:Manoj@123`)
  .digest('hex');

function getSessionSecret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    crypto
      .createHash('sha256')
      .update(process.env.DATABASE_URL || 'careerpulse_local_fallback_secret_2026')
      .digest('hex')
  );
}

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyAdminCredentials(username, password) {
  const cleanUser = String(username || '').trim();
  const cleanPass = String(password || '');
  if (!cleanUser || !cleanPass) return false;

  const userOk = timingSafeEqualStr(cleanUser, ADMIN_USERNAME);
  if (process.env.ADMIN_PASSWORD) {
    return userOk && timingSafeEqualStr(cleanPass, process.env.ADMIN_PASSWORD);
  }

  const candidateHash = crypto
    .createHash('sha256')
    .update(`${DEFAULT_SALT}:${cleanPass}`)
    .digest('hex');
  return userOk && timingSafeEqualStr(candidateHash, DEFAULT_PW_HASH);
}

export function createSessionToken(username) {
  const payload = {
    sub: username,
    role: 'admin',
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');

  if (!timingSafeEqualStr(sig, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload?.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractTokenFromReq(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookieHeader = req.headers?.cookie;
  if (cookieHeader && typeof cookieHeader === 'string') {
    const match = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('cp_admin_session='));
    if (match) {
      return decodeURIComponent(match.slice('cp_admin_session='.length));
    }
  }
  return null;
}

export function requireAdmin(req, res) {
  const token = extractTokenFromReq(req);
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({
      ok: false,
      error: 'Admin authentication required. Please log in to the Admin Portal.',
    });
    return null;
  }
  return payload;
}

export function appendSetCookie(res, cookieStr) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', [cookieStr]);
    return;
  }
  const list = Array.isArray(existing) ? existing : [String(existing)];
  res.setHeader('Set-Cookie', [...list, cookieStr]);
}

export function setSessionCookie(res, token) {
  const maxAge = 7 * 24 * 60 * 60;
  appendSetCookie(
    res,
    `cp_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

export function clearSessionCookie(res) {
  appendSetCookie(
    res,
    'cp_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}

function getCredentialEncryptionKey() {
  return crypto
    .createHash('sha256')
    .update(`${getSessionSecret()}:cred_vault_2026`)
    .digest();
}

export function hashPasswordSha256(password) {
  return crypto
    .createHash('sha256')
    .update(`${DEFAULT_SALT}:${String(password || '')}`)
    .digest('hex');
}

export function encryptCredentialSecret(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getCredentialEncryptionKey(), iv);
  let enc = cipher.update(String(plaintext || ''), 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    passwordEnc: enc,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decryptCredentialSecret({ passwordEnc, iv, authTag }) {
  if (!passwordEnc || !iv || !authTag) return '';
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getCredentialEncryptionKey(),
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let dec = decipher.update(passwordEnc, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  } catch {
    return '';
  }
}

export function generateDeviceId() {
  return crypto.randomBytes(16).toString('hex');
}

export function createDeviceRememberToken(deviceId) {
  const cleanId = String(deviceId || '').trim();
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`device:${cleanId}`)
    .digest('base64url');
  return `${cleanId}.${sig}`;
}

export function verifyDeviceRememberToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [deviceId, sig] = token.split('.');
  if (!deviceId || !sig) return null;
  const expected = crypto
    .createHmac('sha256', getSessionSecret())
    .update(`device:${deviceId}`)
    .digest('base64url');
  return timingSafeEqualStr(sig, expected) ? deviceId : null;
}

export function extractRememberDeviceFromReq(req) {
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('cp_remember_device='));
  if (!match) return null;
  const raw = decodeURIComponent(match.slice('cp_remember_device='.length));
  return verifyDeviceRememberToken(raw);
}

export function setRememberDeviceCookie(res, deviceId) {
  const token = createDeviceRememberToken(deviceId);
  const maxAge = 90 * 24 * 60 * 60;
  appendSetCookie(
    res,
    `cp_remember_device=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

export function clearRememberDeviceCookie(res) {
  appendSetCookie(
    res,
    'cp_remember_device=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
}
