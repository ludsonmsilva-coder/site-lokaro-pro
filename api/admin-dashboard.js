import crypto from 'node:crypto';

function getSupabaseConfig() {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL;

  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY;

  return {
    supabaseUrl,
    serviceRole,
    isReady: Boolean(supabaseUrl && serviceRole)
  };
}

function getAdminSecret() {
  return (process.env.ADMIN_TOKEN_SECRET || 'lokaro-admin-secret-change-me').trim();
}

function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, receivedSignature] = parts;
  const body = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64url');

  if (receivedSignature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.exp || payload.exp < now) return null;
    if (payload?.sub !== 'lokaro-admin') return null;
    return payload;
  } catch {
    return null;
  }
}

function extractBearerToken(req) {
  const raw = req.headers.authorization || '';
  const [type, token] = String(raw).split(' ');
  if (type !== 'Bearer' || !token) return '';
  return token.trim();
}

async function supabaseRequest(path) {
  const { supabaseUrl, serviceRole, isReady } = getSupabaseConfig();
  if (!isReady) return [];

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const missingTable =
      response.status === 404 ||
      text.includes('does not exist') ||
      text.includes('relation') ||
      text.includes('PGRST');

    if (missingTable) {
      return { data: [], missingTable: true };
    }
    throw new Error(`Erro no Supabase: ${response.status} ${text}`);
  }

  return { data: await response.json(), missingTable: false };
}

function asDate(value) {
  const d = new Date(value || 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const token = extractBearerToken(req);
    const payload = verifyToken(token, getAdminSecret());
    if (!payload) {
      return res.status(401).json({ ok: false, error: 'Nao autorizado.' });
    }

    const { isReady } = getSupabaseConfig();
    if (!isReady) {
      return res.status(200).json({
        ok: true,
        admin_email: payload.email,
        warning:
          'Configure SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL/VITE_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE) no deploy para ver os dados.',
        stats: {
          total_users: 0,
          total_members: 0,
          total_support_messages: 0
        },
        users: [],
        support_messages: []
      });
    }

    const [membersRes, supportRes] = await Promise.all([
      supabaseRequest('members?select=email,status,joined_at&order=joined_at.desc&limit=500'),
      supabaseRequest('support_requests?select=id,email,message,status,source_page,created_at,replied_at&order=created_at.desc&limit=500')
    ]);

    const members = membersRes.data || [];
    const supportMessages = supportRes.data || [];

    const emailsMap = new Map();

    for (const row of members || []) {
      const email = String(row?.email || '').trim().toLowerCase();
      if (!email) continue;
      const prev = emailsMap.get(email) || {
        email,
        member_status: null,
        support_messages_count: 0,
        last_seen_at: null
      };
      prev.member_status = row?.status || prev.member_status;
      const seen = asDate(row?.joined_at);
      if (seen && (!prev.last_seen_at || seen > new Date(prev.last_seen_at))) {
        prev.last_seen_at = seen.toISOString();
      }
      emailsMap.set(email, prev);
    }

    for (const row of supportMessages || []) {
      const email = String(row?.email || '').trim().toLowerCase();
      if (!email) continue;
      const prev = emailsMap.get(email) || {
        email,
        member_status: null,
        support_messages_count: 0,
        last_seen_at: null
      };
      prev.support_messages_count += 1;
      const seen = asDate(row?.created_at) || asDate(row?.replied_at);
      if (seen && (!prev.last_seen_at || seen > new Date(prev.last_seen_at))) {
        prev.last_seen_at = seen.toISOString();
      }
      emailsMap.set(email, prev);
    }

    const users = [...emailsMap.values()].sort((a, b) => {
      const aDate = asDate(a.last_seen_at)?.getTime() || 0;
      const bDate = asDate(b.last_seen_at)?.getTime() || 0;
      return bDate - aDate;
    });

    const warnings = [];
    if (supportRes.missingTable) {
      warnings.push('Tabela public.support_requests ausente no Supabase. Execute supabase/support_requests.sql.');
    }

    return res.status(200).json({
      ok: true,
      admin_email: payload.email,
      warning: warnings.length ? warnings.join(' ') : null,
      stats: {
        total_users: users.length,
        total_members: (members || []).length,
        total_support_messages: (supportMessages || []).length
      },
      users,
      support_messages: supportMessages || []
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || 'Falha ao carregar painel admin.' });
  }
}
