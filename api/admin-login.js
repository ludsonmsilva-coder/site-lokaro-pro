import crypto from 'node:crypto';

const DEFAULT_ADMIN_EMAIL = 'ludson.m.silva@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'Jo@o1008';
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function getAuthConfig() {
  return {
    email: (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
    password: (process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD).trim(),
    secret: (process.env.ADMIN_TOKEN_SECRET || 'lokaro-admin-secret-change-me').trim()
  };
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body || {};
    const safeEmail = String(email || '').trim().toLowerCase();
    const safePassword = String(password || '');

    const cfg = getAuthConfig();

    if (!safeEmail || !safePassword) {
      return res.status(400).json({ ok: false, error: 'Informe email e senha.' });
    }

    if (safeEmail !== cfg.email || safePassword !== cfg.password) {
      return res.status(401).json({ ok: false, error: 'Credenciais invalidas.' });
    }

    const now = Math.floor(Date.now() / 1000);
    const token = signToken(
      {
        sub: 'lokaro-admin',
        email: cfg.email,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS
      },
      cfg.secret
    );

    return res.status(200).json({ ok: true, token, email: cfg.email });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Falha no login admin.' });
  }
}
