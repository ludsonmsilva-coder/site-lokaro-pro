// Exemplo de gating de recursos por plano no frontend.
// Requer: npm i @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

const PLAN_RANK = {
  free: 0,
  starter: 1,
  pro: 2
};

export function createSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY nao configurado.');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function fetchMyBillingAccess(supabase) {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from('billing_access')
    .select('plan,status,unlocked_features')
    .eq('email', user.email)
    .maybeSingle();

  if (error) throw error;

  // Fallback para conta sem assinatura ativa.
  return (
    data || {
      plan: 'free',
      status: 'inactive',
      unlocked_features: ['units_up_to_2']
    }
  );
}

export function hasPlanOrAbove(access, minPlan) {
  const current = PLAN_RANK[access?.plan || 'free'] ?? 0;
  const target = PLAN_RANK[minPlan || 'free'] ?? 0;
  return current >= target;
}

export function hasFeature(access, feature) {
  return Array.isArray(access?.unlocked_features)
    ? access.unlocked_features.includes(feature)
    : false;
}

export function applyPlanGate(access) {
  // 1) Bloqueio por plano minimo: data-min-plan="starter"
  document.querySelectorAll('[data-min-plan]').forEach((element) => {
    const minPlan = element.getAttribute('data-min-plan') || 'free';
    const allowed = hasPlanOrAbove(access, minPlan);

    element.classList.toggle('is-locked', !allowed);
    element.toggleAttribute('disabled', !allowed);
    element.setAttribute('aria-disabled', String(!allowed));
  });

  // 2) Bloqueio por feature especifica: data-feature="advanced_reports"
  document.querySelectorAll('[data-feature]').forEach((element) => {
    const feature = element.getAttribute('data-feature');
    const allowed = feature ? hasFeature(access, feature) : true;

    element.classList.toggle('is-locked', !allowed);
    element.toggleAttribute('disabled', !allowed);
    element.setAttribute('aria-disabled', String(!allowed));
  });
}

// Exemplo de bootstrap no app:
// const supabase = createSupabaseClient();
// const access = await fetchMyBillingAccess(supabase);
// applyPlanGate(access);
