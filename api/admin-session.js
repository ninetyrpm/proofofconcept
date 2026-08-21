const auth = require('../lib/admin-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      configured: auth.configured(),
      authenticated: auth.verifySession(req),
      sessionHours: auth.SESSION_TTL_SECONDS / 3600
    });
  }

  if (req.method === 'POST') {
    if (!auth.configured()) return res.status(503).json({ error: 'GRAPH_ADMIN_PASSWORD is not configured.' });
    const password = typeof req.body === 'object' && req.body !== null
      ? String(req.body.password || '')
      : String(JSON.parse(req.body || '{}').password || '');
    if (!auth.passwordMatches(password)) return res.status(401).json({ error: 'Incorrect Graph Admin password.' });
    res.setHeader('Set-Cookie', auth.sessionCookie(req));
    return res.status(200).json({ authenticated: true });
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', auth.clearCookie(req));
    return res.status(200).json({ authenticated: false });
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed.' });
};
