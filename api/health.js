const adminAuth = require('../lib/admin-auth');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    graphPersistenceConfigured: Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN),
    graphPersistenceAuth: process.env.BLOB_STORE_ID ? 'vercel-oidc' : process.env.BLOB_READ_WRITE_TOKEN ? 'static-token' : 'none',
    graphAdminPasswordConfigured: adminAuth.configured()
  });
};
