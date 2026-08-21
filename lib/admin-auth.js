const crypto = require('node:crypto');

const COOKIE_NAME = 'fb_graph_admin';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const SESSION_VERSION = 'v1';

function configured() {
  return Boolean(process.env.GRAPH_ADMIN_PASSWORD);
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (!left.length || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function passwordMatches(candidate) {
  return configured() && safeEqual(candidate, process.env.GRAPH_ADMIN_PASSWORD);
}

function sessionKey() {
  return crypto.scryptSync(process.env.GRAPH_ADMIN_PASSWORD, 'firstbuild-exploration-map-admin-session-v1', 32);
}

function signature(expires) {
  return crypto.createHmac('sha256', sessionKey())
    .update(`${SESSION_VERSION}|graph-admin|${expires}`)
    .digest('base64url');
}

function createSessionToken() {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${SESSION_VERSION}.${expires}.${signature(expires)}`;
}

function parseCookies(req) {
  const raw = String(req.headers.cookie || '');
  const cookies = {};
  raw.split(';').forEach(part => {
    const index = part.indexOf('=');
    if (index < 0) return;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function verifySession(req) {
  if (!configured()) return false;
  const token = parseCookies(req)[COOKIE_NAME];
  if (!token) return false;
  const [version, expiresRaw, sig] = token.split('.');
  const expires = Number(expiresRaw);
  if (version !== SESSION_VERSION || !Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  return safeEqual(sig, signature(expires));
}

function secureCookie(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '');
  return Boolean(process.env.VERCEL || proto === 'https');
}

function sessionCookie(req) {
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(createSessionToken())}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
  if (secureCookie(req)) parts.push('Secure');
  return parts.join('; ');
}

function clearCookie(req) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secureCookie(req)) parts.push('Secure');
  return parts.join('; ');
}

module.exports = {
  configured,
  passwordMatches,
  verifySession,
  sessionCookie,
  clearCookie,
  SESSION_TTL_SECONDS
};
