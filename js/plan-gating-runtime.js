(function () {
  const PLAN_RANK = { free: 0, starter: 1, pro: 2 };

  function cfg() {
    return window.__LOKARO_SUPABASE__ || null;
  }

  function planRank(plan) {
    return PLAN_RANK[String(plan || 'free').toLowerCase()] ?? 0;
  }

  function lockElement(el, lock) {
    el.classList.toggle('is-locked', lock);
    if (lock) {
      el.setAttribute('aria-disabled', 'true');
      if (el.matches('button, input, select, textarea')) {
        el.setAttribute('disabled', 'disabled');
      }
    } else {
      el.removeAttribute('aria-disabled');
      el.removeAttribute('disabled');
    }
  }

  function applyPlanGate(access) {
    const currentPlan = String(access?.plan || 'free').toLowerCase();
    const features = Array.isArray(access?.unlocked_features)
      ? access.unlocked_features
      : [];

    document.querySelectorAll('[data-min-plan]').forEach((el) => {
      const minPlan = String(el.getAttribute('data-min-plan') || 'free').toLowerCase();
      const allowed = planRank(currentPlan) >= planRank(minPlan);
      lockElement(el, !allowed);
    });

    document.querySelectorAll('[data-feature]').forEach((el) => {
      const feature = String(el.getAttribute('data-feature') || '');
      const allowed = feature ? features.includes(feature) : true;
      lockElement(el, !allowed);
    });

    document.documentElement.setAttribute('data-current-plan', currentPlan);
  }

  async function fetchAccess() {
    const config = cfg();
    if (!config?.url || !config?.anonKey || !config?.userEmail) {
      return null;
    }

    const email = encodeURIComponent(String(config.userEmail).toLowerCase().trim());
    const endpoint = `${config.url}/rest/v1/billing_access?select=plan,status,unlocked_features&email=eq.${email}`;

    const headers = {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.accessToken || config.anonKey}`,
      Accept: 'application/json'
    };

    const response = await fetch(endpoint, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`Erro ao buscar billing_access: ${response.status}`);
    }

    const rows = await response.json();
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function bootstrap() {
    try {
      const access = await fetchAccess();
      applyPlanGate(
        access || {
          plan: 'free',
          unlocked_features: ['units_up_to_2']
        }
      );
    } catch (_) {
      applyPlanGate({
        plan: 'free',
        unlocked_features: ['units_up_to_2']
      });
    }
  }

  window.LokaroPlanGate = {
    refresh: bootstrap,
    apply: applyPlanGate
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
