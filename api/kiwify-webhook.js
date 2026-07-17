function normalizeMoney(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;

  const raw = String(value).trim();
  if (!raw) return 0;

  // Accepts formats like "49", "49.00", "49,00", "R$ 49,00" and cents "4900".
  const cleaned = raw.replace(/[^0-9,.-]/g, '');
  if (!cleaned) return 0;

  if (/^\d+$/.test(cleaned) && cleaned.length >= 3) {
    const cents = Number(cleaned);
    return Number.isFinite(cents) ? cents / 100 : 0;
  }

  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getEmail(payload) {
  return (
    payload?.Customer?.email ||
    payload?.customer?.email ||
    payload?.buyer?.email ||
    payload?.email ||
    ''
  ).toLowerCase().trim();
}

function isApproved(payload) {
  const state = (
    payload?.order_status ||
    payload?.payment_status ||
    payload?.status ||
    payload?.OrderStatus ||
    ''
  )
    .toString()
    .toLowerCase();

  return ['paid', 'approved', 'completed', 'authorized'].includes(state);
}

function resolvePlan(payload) {
  const productName = (
    payload?.Product?.name ||
    payload?.product_name ||
    payload?.productName ||
    payload?.offer_name ||
    ''
  )
    .toString()
    .toLowerCase();

  const amount = normalizeMoney(
    payload?.price || payload?.amount || payload?.total || payload?.Order?.amount
  );

  if (productName.includes('pro') || amount === 99) {
    return {
      plan: 'pro',
      unlocked_features: [
        'units_unlimited',
        'billing_automatic',
        'revenue_dashboard',
        'priority_support',
        'advanced_reports'
      ]
    };
  }

  if (productName.includes('starter') || amount === 49) {
    return {
      plan: 'starter',
      unlocked_features: [
        'units_up_to_10',
        'billing_automatic',
        'revenue_dashboard',
        'priority_support'
      ]
    };
  }

  return {
    plan: 'free',
    unlocked_features: ['units_up_to_2']
  };
}

async function upsertCustomerAccess(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.');
  }

  const email = getEmail(payload);
  if (!email) {
    throw new Error('Email do comprador nao encontrado no webhook.');
  }

  const { plan, unlocked_features } = resolvePlan(payload);

  const row = {
    email,
    plan,
    status: isApproved(payload) ? 'active' : 'pending',
    provider: 'kiwify',
    unlocked_features,
    last_event: payload,
    updated_at: new Date().toISOString()
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/billing_access?on_conflict=email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        Prefer: 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify([row])
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ao gravar no Supabase: ${response.status} ${text}`);
  }

  const data = await response.json();
  return { email, plan, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const expectedSecret = process.env.KIWIFY_WEBHOOK_SECRET;
  const receivedSecret = req.headers['x-webhook-secret'];

  if (expectedSecret && receivedSecret !== expectedSecret) {
    return res.status(401).json({ ok: false, error: 'Webhook nao autorizado' });
  }

  try {
    const payload = req.body || {};
    const result = await upsertCustomerAccess(payload);

    return res.status(200).json({
      ok: true,
      email: result.email,
      plan: result.plan
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error.message || 'Falha ao processar webhook'
    });
  }
}
