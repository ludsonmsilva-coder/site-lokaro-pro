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

  if (!supabaseUrl || !serviceRole) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes (ou aliases equivalentes).');
  }

  return { supabaseUrl, serviceRole };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeMessage(message) {
  const text = String(message || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return text.slice(0, 500);
}

function validateAdmin(req) {
  const expectedKey = process.env.SUPPORT_ADMIN_KEY;
  const providedKey = req.headers['x-admin-key'];

  if (!expectedKey) {
    throw new Error('SUPPORT_ADMIN_KEY nao configurada no ambiente.');
  }

  if (!providedKey || providedKey !== expectedKey) {
    const error = new Error('Painel admin nao autorizado.');
    error.code = 401;
    throw error;
  }
}

async function supabaseRequest(path, options) {
  const { supabaseUrl, serviceRole } = getSupabaseConfig();

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro no Supabase: ${response.status} ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function createTicket(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const message = sanitizeMessage(req.body?.message);
  const sourcePage = String(req.body?.source_page || 'unknown').trim().slice(0, 120);

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Email invalido.' });
  }

  if (!message) {
    return res.status(400).json({ ok: false, error: 'Mensagem obrigatoria.' });
  }

  if (message.length > 500) {
    return res.status(400).json({ ok: false, error: 'Mensagem deve ter no maximo 500 caracteres.' });
  }

  const payload = [{
    email,
    message,
    source_page: sourcePage,
    status: 'new'
  }];

  const data = await supabaseRequest('support_requests', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  return res.status(200).json({
    ok: true,
    ticket: data?.[0] || null
  });
}

async function listTickets(req, res) {
  validateAdmin(req);

  const data = await supabaseRequest(
    'support_requests?select=id,email,message,status,source_page,created_at,replied_at&order=created_at.desc&limit=200',
    { method: 'GET' }
  );

  return res.status(200).json({ ok: true, tickets: data || [] });
}

async function updateTicket(req, res) {
  validateAdmin(req);

  const id = Number(req.body?.id);
  const status = String(req.body?.status || '').trim();

  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'ID invalido.' });
  }

  if (!['new', 'answered'].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Status invalido.' });
  }

  const patch = {
    status,
    replied_at: status === 'answered' ? new Date().toISOString() : null
  };

  await supabaseRequest(`support_requests?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(patch)
  });

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      return await createTicket(req, res);
    }

    if (req.method === 'GET') {
      return await listTickets(req, res);
    }

    if (req.method === 'PATCH') {
      return await updateTicket(req, res);
    }

    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (error) {
    const code = error?.code && Number.isFinite(error.code) ? error.code : 400;
    return res.status(code).json({ ok: false, error: error.message || 'Falha ao processar suporte.' });
  }
}
