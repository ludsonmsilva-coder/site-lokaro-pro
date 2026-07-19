const io = new IntersectionObserver((es)=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // ---- Efeitos premium ----
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Barra de progresso de rolagem
  const sb = document.getElementById('scrollbar');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    sb.style.transform = `scaleX(${h.scrollTop / (h.scrollHeight - h.clientHeight)})`;
  }, { passive: true });

  // Holofote seguindo o mouse nos cards
  document.querySelectorAll('.spot').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  if (!reduced) {
    // Tilt 3D do hero acompanhando o cursor
    const hero = document.querySelector('.hero');
    const heroEl = document.querySelector('.device-hero .browser') || document.querySelector('.mock .phone');
    if (hero && heroEl) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        heroEl.style.transform =
          `rotateY(${x * 10}deg) rotateX(${-y * 6}deg) translateZ(6px)`;
      });
      hero.addEventListener('pointerleave', () => {
        heroEl.style.transform = '';
      });
    }

    // Botões magnéticos (puxam levemente na direção do cursor)
    document.querySelectorAll('.btn, .nav-cta').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  // Revelação em cascata: irmãos .reveal ganham atraso progressivo
  document.querySelectorAll('.features, .steps, .who, .pricing, .showcase').forEach(grid => {
    [...grid.children].forEach((child, i) => {
      if (child.classList.contains('reveal') || child.classList.contains('show-item')) {
        child.style.setProperty('--rd', (i * 0.12) + 's');
      }
    });
  });

  // Itens dos planos entram um a um
  document.querySelectorAll('.plan').forEach(plan => {
    plan.querySelectorAll('li').forEach((li, i) => li.style.setProperty('--li', i));
  });

  // Mock principal: troca de seções ao clicar nas abas
  document.querySelectorAll('.phone-app').forEach(app => {
    const tabs = app.querySelectorAll('.ptab-btn');
    const views = app.querySelectorAll('.pview');
    if (!tabs.length || !views.length) return;

    function openView(target){
      views.forEach(view => view.classList.toggle('on', view.dataset.view === target));
      tabs.forEach(tab => tab.classList.toggle('on', tab.dataset.target === target));
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => openView(tab.dataset.target));
    });
  });

  // Finance mock: expenses by room
  (function(){
    const widget = document.getElementById('financeExpenseWidget');
    if (!widget) return;

    const form = document.getElementById('financeExpenseForm');
    const toggleBtn = document.getElementById('financeExpenseToggle');
    const roomInput = document.getElementById('financeExpenseRoom');
    const amountInput = document.getElementById('financeExpenseAmount');
    const descriptionInput = document.getElementById('financeExpenseDescription');
    const totalsEl = document.getElementById('financeExpenseTotals');
    const listEl = document.getElementById('financeExpenseList');
    const msgEl = document.getElementById('financeExpenseMessage');

    const totals = {};
    const lastExpenses = [];

    function toCurrency(value) {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD'
      });
    }

    function renderTotals() {
      const rooms = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      if (!rooms.length) {
        totalsEl.innerHTML = '<p class="exp-empty">No expenses yet.</p>';
        return;
      }

      totalsEl.innerHTML = rooms
        .map(([room, total]) => `
          <div class="exp-row">
            <span>${room}</span>
            <b>${toCurrency(total)}</b>
          </div>
        `)
        .join('');
    }

    function renderList() {
      if (!lastExpenses.length) {
        listEl.innerHTML = '';
        return;
      }

      listEl.innerHTML = lastExpenses
        .map((item) => `
          <div class="exp-item">
            <small>${item.room} · ${item.description}</small>
            <b>${toCurrency(item.amount)}</b>
          </div>
        `)
        .join('');
    }

    toggleBtn.addEventListener('click', () => {
      form.classList.toggle('is-hidden');
      msgEl.textContent = form.classList.contains('is-hidden') ? '' : 'Fill amount and description.';
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const room = roomInput.value.trim();
      const description = descriptionInput.value.trim();
      const amount = Number(amountInput.value);

      if (!room || !description || !Number.isFinite(amount) || amount <= 0) {
        msgEl.textContent = 'Please fill room, valid amount and description.';
        msgEl.style.color = '#FCA5A5';
        return;
      }

      totals[room] = (totals[room] || 0) + amount;
      lastExpenses.unshift({ room, description, amount });
      if (lastExpenses.length > 4) lastExpenses.pop();

      renderTotals();
      renderList();

      msgEl.textContent = `Expense added to ${room}. Room total updated.`;
      msgEl.style.color = '#93C5FD';

      form.reset();
      roomInput.focus();
    });

    renderTotals();
    renderList();
  })();


  // ---- Live demo timeline ----
  (function(){
    const scenes = document.querySelectorAll('#demo .scene');
    const steps  = document.querySelectorAll('#demo .dstep');
    const bars   = document.querySelectorAll('#demo .demo-progress i');
    if(!scenes.length) return;
    const DUR = 3600;
    let cur = -1, timer = null, counting = null;

    function countUp(){
      const el = document.getElementById('rvCount');
      if(!el) return;
      clearInterval(counting);
      const target = 4320, t0 = performance.now(), dur = 1400;
      counting = setInterval(()=>{
        const k = Math.min((performance.now()-t0)/dur, 1);
        el.textContent = Math.round(target * (1-Math.pow(1-k,3))).toLocaleString('en-US');
        if(k>=1) clearInterval(counting);
      }, 30);
    }

    function show(i){
      cur = i;
      scenes.forEach((sc,j)=>{
        sc.classList.remove('on');
        if(j===i){ void sc.offsetWidth; sc.classList.add('on'); }
      });
      steps.forEach((st,j)=>st.classList.toggle('active', j===i));
      bars.forEach((b,j)=>{
        b.classList.remove('run','done');
        if(j<i) b.classList.add('done');
        if(j===i){ b.style.setProperty('--dur', DUR+'ms'); void b.offsetWidth; b.classList.add('run'); }
      });
      if(i===2) setTimeout(countUp, 700);
    }

    function loop(){ show((cur+1)%scenes.length); timer = setTimeout(loop, DUR); }

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced){ show(0); steps.forEach(st=>st.classList.add('active')); return; }

    // começa quando a seção entra na tela
    const startIO = new IntersectionObserver((es)=>{
      es.forEach(e=>{ if(e.isIntersecting){ loop(); startIO.disconnect(); } });
    },{threshold:.3});
    startIO.observe(document.getElementById('demo'));

    // clicar num passo pula pra cena dele
    steps.forEach((st,i)=>st.addEventListener('click',()=>{
      clearTimeout(timer); show(i); timer = setTimeout(loop, DUR);
    }));
  })();

// ---- i18n ----
const translations = {
  en: {
    'nav.features':'Features','nav.how':'How it works','nav.demo':'Demo',
    'nav.app':'App','nav.pricing':'Pricing','nav.cta':'Open app',
    'hero.eyebrow':'Coworking &amp; rentals, now on the web',
    'hero.h1':'Run your space without <span class="gword">the chaos</span>',
    'hero.sub':'Members, bookings, rental leases and billing \u2014 managed in one place, with automatic invoices and email reminders your tenants actually receive.',
    'hero.cta1':'Start free \u2014 2 units','hero.cta2':'See how it works',
    'hero.note':'No credit card required \u00b7 Runs in your browser',
    'feat.eyebrow':'Everything included',
    'feat.h2':'One tool for rooms, desks, houses and studios',
    'feat.p':'Built for small operators and landlords who are done juggling spreadsheets, calendars and WhatsApp.',
    'feat1.h':'Smart bookings','feat1.p':'Hourly bookings with conflict protection, per-room business hours (even overnight and 24/7), and one-tap cancellation.',
    'feat2.h':'Rental leases','feat2.p':'Link a tenant to a house, studio or apartment. Rent invoices are generated automatically every month \u2014 no forgetting, ever.',
    'feat3.h':'Billing that runs itself','feat3.p':'Automatic invoices, revenue by day, week and month, and overdue tracking that keeps your cash flow visible.',
    'feat4.h':'Reminders people get','feat4.p':'Booking reminders and \u201crent due soon\u201d emails, sent automatically at the right time \u2014 tenants stop being surprised.',
    'feat5.h':'Members &amp; tenants','feat5.p':'Profiles, statuses (active, trial, overdue) and safe deletion rules that never let money disappear silently.',
    'feat6.h':'Web &amp; bilingual','feat6.p':'English and Spanish, light and dark mode. Runs in any browser \u2014 desktop, tablet or mobile. No install required.',
    'how.eyebrow':'How it works','how.h2':'From zero to organized in 4 steps',
    'how.p':'No manuals, no consultants. If you can use WhatsApp, you can run Lokaro.',
    'step1.h':'Create your space','step1.p':'Sign up, name your workspace, pick your time zone and currency. That is the whole setup.','step1.t':'~2 minutes',
    'step2.h':'Add your units','step2.p':'Meeting rooms, hot desks, houses, studios \u2014 each with its own hours, capacity, price and color.','step2.t':'~1 minute each',
    'step3.h':'Add members &amp; tenants','step3.p':'Register people once. Book rooms by the hour, or link a tenant to a rental with a monthly value and due day.','step3.t':'~1 minute each',
    'step4.h':'Let it run','step4.p':'Invoices are generated automatically, reminders go out by email, and your revenue dashboard updates itself.','step4.t':'0 minutes \u2014 it is automatic',
    'demo.eyebrow':'Live demo','demo.h2':'Watch Lokaro do the work','demo.p':'A real day in the app \u2014 playing on a loop, no sound needed.',
    'app.eyebrow':'Available now','app.h2':'Web app is live',
    'app.p':'Open Lokaro right now in your browser \u2014 no download needed. Mobile apps for Android and iOS are coming.',
    'app.web.tag':'\u2705 Live now','app.web.h':'Web App','app.web.p':'Full access on any browser, desktop or tablet. No install required.','app.web.btn':'Open Lokaro Web',
    'app.mobile.tag':'Coming soon','app.mobile.h':'Mobile Apps','app.mobile.p':'Android and iOS apps in development. Sign up to be notified when they launch.','app.mobile.btn':'Coming to Android &amp; iOS',
    'inside.eyebrow':'Inside the app','inside.h2':'This is what your day looks like','inside.p':'Real screens from Lokaro \u2014 dark mode, bilingual, and fast.',
    'who.eyebrow':'Made for you','who.h2':'One tool, three kinds of owners','who.p':'Lokaro adapts to what you manage \u2014 or all of it at once.',
    'who1.h':'Coworking operators','who1.p':'Rooms and desks booked by the hour, without double-booking headaches.',
    'who1.li1':'Conflict-proof scheduling','who1.li2':'Per-room business hours, even 24/7','who1.li3':'Occupancy at a glance',
    'who2.h':'House landlords','who2.p':'Every rental with its lease, value and due day \u2014 rent never slips again.',
    'who2.li1':'Monthly invoices on autopilot','who2.li2':'\u201cRent due soon\u201d emails to tenants','who2.li3':'Paid vs pending, always visible',
    'who3.h':'Kitnet &amp; studio owners','who3.p':'Many small units, many due dates \u2014 organized in one clean screen.',
    'who3.li1':'Unlimited units on Pro','who3.li2':'One tenant per unit, enforced','who3.li3':'Portfolio revenue by month',
    'pricing.eyebrow':'Pricing','pricing.h2':'Honest pricing. No surprises.','pricing.p':'Start free \u2014 no credit card. Upgrade when you grow.','pricing.pop':'MOST POPULAR',
    'free.name':'Free','free.desc':'Try Lokaro with your first units.',
    'free.li1':'Up to 2 units (rooms or rentals)','free.li2':'Bookings &amp; rental leases','free.li3':'Automatic invoices','free.li4':'Email reminders','free.btn':'Start free',
    'starter.name':'Starter','starter.desc':'For growing spaces and landlords.',
    'starter.li1':'Up to 10 units','starter.li2':'Everything in Free','starter.li3':'Revenue dashboard','starter.li4':'No Lokaro branding on emails','starter.li5':'Priority support','starter.btn':'Choose Starter',
    'pro.name':'Pro','pro.desc':'For operators managing at scale.',
    'pro.li1':'Unlimited units','pro.li2':'Everything in Starter','pro.li3':'Advanced reports','pro.li4':'Multi-property portfolio','pro.li5':'Dedicated onboarding','pro.btn':'Choose Pro',
    'faq.eyebrow':'Questions','faq.h2':'Frequently asked',
    'faq.q1':'Is the free plan really free?','faq.a1':'Yes. Up to 2 units, forever, with bookings, leases, automatic invoices and email reminders included. No credit card, no trial countdown.',
    'faq.q2':'Does it work for rentals AND coworking at the same time?','faq.a2':'Yes \u2014 that is the whole point. A unit can be a meeting room booked by the hour or a house with a monthly lease. Both live in the same dashboard and the same billing.',
    'faq.q3':'How do the automatic rent invoices work?','faq.a3':'When you create a lease, you set the monthly value and the due day. Lokaro generates the invoice 7 days before it is due, every month, and emails the tenant a reminder 3 days before. You just watch them get paid.',
    'faq.q4':'What languages and platforms are supported?','faq.a4':'English and Spanish. Lokaro runs as a web app on any browser \u2014 no download needed. Mobile apps for Android and iOS are in development.',
    'faq.q5':'Can I cancel anytime?','faq.a5':'Yes. Downgrade or cancel whenever you want \u2014 your data stays and your account simply returns to the Free plan limits.',
    'cta.h2':'Your space, finally under control',
    'cta.p':'Start for free today. No credit card, no download \u2014 open the web app and be organized in minutes.',
    'cta.btn1':'Open Lokaro \u2014 it\u2019s free','cta.btn2':'\u2709\ufe0f contato@lokaro.co',
    'cta.note':'Free plan: 2 units forever \u00b7 No credit card needed',
    'footer.tagline':'Made for people who run spaces',
  },
  es: {
    'nav.features':'Funciones','nav.how':'C\u00f3mo funciona','nav.demo':'Demo',
    'nav.app':'App','nav.pricing':'Precios','nav.cta':'Abrir app',
    'hero.eyebrow':'Coworking y rentas, ahora en la web',
    'hero.h1':'Gestiona tu espacio sin <span class="gword">el caos</span>',
    'hero.sub':'Miembros, reservas, contratos de alquiler y facturaci\u00f3n \u2014 todo en un lugar, con facturas autom\u00e1ticas y recordatorios que tus inquilinos realmente reciben.',
    'hero.cta1':'Empieza gratis \u2014 2 unidades','hero.cta2':'Ver c\u00f3mo funciona',
    'hero.note':'Sin tarjeta de cr\u00e9dito \u00b7 Funciona en tu navegador',
    'feat.eyebrow':'Todo incluido',
    'feat.h2':'Una herramienta para salas, escritorios, casas y estudios',
    'feat.p':'Dise\u00f1ado para peque\u00f1os operadores y propietarios que ya no quieren hojas de c\u00e1lculo, calendarios y WhatsApp.',
    'feat1.h':'Reservas inteligentes','feat1.p':'Reservas por hora con protecci\u00f3n de conflictos, horarios por sala (incluso nocturno y 24/7) y cancelaci\u00f3n con un toque.',
    'feat2.h':'Contratos de alquiler','feat2.p':'Vincula un inquilino a una casa, estudio o apartamento. Las facturas de alquiler se generan autom\u00e1ticamente cada mes \u2014 sin olvidarse nunca.',
    'feat3.h':'Facturaci\u00f3n autom\u00e1tica','feat3.p':'Facturas autom\u00e1ticas, ingresos por d\u00eda, semana y mes, y seguimiento de pagos pendientes que mantiene tu flujo de caja visible.',
    'feat4.h':'Recordatorios que llegan','feat4.p':'Recordatorios de reservas y correos \u201calquiler pr\u00f3ximo a vencer\u201d, enviados autom\u00e1ticamente a tiempo \u2014 los inquilinos dejan de sorprenderse.',
    'feat5.h':'Miembros e inquilinos','feat5.p':'Perfiles, estados (activo, prueba, vencido) y reglas de eliminaci\u00f3n segura que nunca dejan que el dinero desaparezca silenciosamente.',
    'feat6.h':'Web y biling\u00fce','feat6.p':'Ingl\u00e9s y espa\u00f1ol, modo claro y oscuro. Funciona en cualquier navegador \u2014 escritorio, tableta o m\u00f3vil. Sin instalaci\u00f3n.',
    'how.eyebrow':'C\u00f3mo funciona','how.h2':'De cero a organizado en 4 pasos',
    'how.p':'Sin manuales, sin consultores. Si puedes usar WhatsApp, puedes usar Lokaro.',
    'step1.h':'Crea tu espacio','step1.p':'Reg\u00edstrate, ponle nombre, elige zona horaria y moneda. Eso es toda la configuraci\u00f3n.','step1.t':'~2 minutos',
    'step2.h':'Agrega tus unidades','step2.p':'Salas de reuniones, escritorios, casas, estudios \u2014 cada uno con sus horarios, capacidad, precio y color.','step2.t':'~1 minuto cada una',
    'step3.h':'Agrega miembros e inquilinos','step3.p':'Registra a las personas una vez. Reserva salas por hora o vincula un inquilino a una renta con valor mensual y fecha de vencimiento.','step3.t':'~1 minuto cada uno',
    'step4.h':'D\u00e9jalo funcionar','step4.p':'Las facturas se generan autom\u00e1ticamente, los recordatorios se env\u00edan por correo y tu panel de ingresos se actualiza solo.','step4.t':'0 minutos \u2014 es autom\u00e1tico',
    'demo.eyebrow':'Demo en vivo','demo.h2':'Mira a Lokaro trabajar','demo.p':'Un d\u00eda real en la app \u2014 en bucle, sin sonido.',
    'app.eyebrow':'Disponible ahora','app.h2':'App web disponible',
    'app.p':'Abre Lokaro ahora mismo en tu navegador \u2014 sin descargas. Las apps m\u00f3viles est\u00e1n en camino.',
    'app.web.tag':'\u2705 Disponible ahora','app.web.h':'App Web','app.web.p':'Acceso completo en cualquier navegador, escritorio o tablet. Sin instalaci\u00f3n.','app.web.btn':'Abrir Lokaro Web',
    'app.mobile.tag':'Pr\u00f3ximamente','app.mobile.h':'Apps M\u00f3viles','app.mobile.p':'Apps para Android e iOS en desarrollo. Disponibles pronto.','app.mobile.btn':'Pr\u00f3ximamente en Android e iOS',
    'inside.eyebrow':'Dentro de la app','inside.h2':'As\u00ed se ve tu d\u00eda','inside.p':'Pantallas reales de Lokaro \u2014 modo oscuro, biling\u00fce y r\u00e1pido.',
    'who.eyebrow':'Hecho para ti','who.h2':'Una herramienta, tres tipos de propietarios','who.p':'Lokaro se adapta a lo que gestionas \u2014 o todo a la vez.',
    'who1.h':'Operadores de coworking','who1.p':'Salas y escritorios reservados por hora, sin dolores de cabeza por doble reserva.',
    'who1.li1':'Programaci\u00f3n sin conflictos','who1.li2':'Horarios por sala, incluso 24/7','who1.li3':'Ocupaci\u00f3n de un vistazo',
    'who2.h':'Propietarios de casas','who2.p':'Cada alquiler con su contrato, valor y fecha de vencimiento \u2014 el alquiler nunca se escapa.',
    'who2.li1':'Facturas mensuales en piloto autom\u00e1tico','who2.li2':'Correos \u201calquiler pr\u00f3ximo a vencer\u201d a inquilinos','who2.li3':'Pagado vs pendiente, siempre visible',
    'who3.h':'Propietarios de kitnets y estudios','who3.p':'Muchas unidades peque\u00f1as, muchas fechas \u2014 organizadas en una pantalla limpia.',
    'who3.li1':'Unidades ilimitadas en Pro','who3.li2':'Un inquilino por unidad, aplicado','who3.li3':'Ingresos del portafolio por mes',
    'pricing.eyebrow':'Precios','pricing.h2':'Precios honestos. Sin sorpresas.','pricing.p':'Empieza gratis \u2014 sin tarjeta. Actualiza cuando crezcas.','pricing.pop':'M\u00c1S POPULAR',
    'free.name':'Gratis','free.desc':'Prueba Lokaro con tus primeras unidades.',
    'free.li1':'Hasta 2 unidades (salas o alquileres)','free.li2':'Reservas y contratos de alquiler','free.li3':'Facturas autom\u00e1ticas','free.li4':'Recordatorios por correo','free.btn':'Empezar gratis',
    'starter.name':'Starter','starter.desc':'Para espacios en crecimiento y propietarios.',
    'starter.li1':'Hasta 10 unidades','starter.li2':'Todo en Gratis','starter.li3':'Panel de ingresos','starter.li4':'Sin marca Lokaro en los correos','starter.li5':'Soporte prioritario','starter.btn':'Elegir Starter',
    'pro.name':'Pro','pro.desc':'Para operadores que gestionan a escala.',
    'pro.li1':'Unidades ilimitadas','pro.li2':'Todo en Starter','pro.li3':'Reportes avanzados','pro.li4':'Portafolio multi-propiedad','pro.li5':'Onboarding dedicado','pro.btn':'Elegir Pro',
    'faq.eyebrow':'Preguntas','faq.h2':'Preguntas frecuentes',
    'faq.q1':'\u00bfEl plan gratuito es realmente gratis?','faq.a1':'S\u00ed. Hasta 2 unidades, para siempre, con reservas, contratos, facturas autom\u00e1ticas y recordatorios por correo incluidos. Sin tarjeta de cr\u00e9dito, sin cuenta regresiva.',
    'faq.q2':'\u00bfFunciona para alquileres Y coworking al mismo tiempo?','faq.a2':'S\u00ed \u2014 ese es el punto. Una unidad puede ser una sala de reuniones por hora o una casa con arriendo mensual. Ambos viven en el mismo panel y la misma facturaci\u00f3n.',
    'faq.q3':'\u00bfC\u00f3mo funcionan las facturas autom\u00e1ticas de alquiler?','faq.a3':'Al crear un contrato, defines el valor mensual y el d\u00eda de vencimiento. Lokaro genera la factura 7 d\u00edas antes, cada mes, y env\u00eda un recordatorio al inquilino 3 d\u00edas antes. Solo ves c\u00f3mo se pagan.',
    'faq.q4':'\u00bfQu\u00e9 idiomas y plataformas son compatibles?','faq.a4':'Ingl\u00e9s y espa\u00f1ol. Lokaro funciona como app web en cualquier navegador \u2014 sin descargas. Las apps m\u00f3viles para Android e iOS est\u00e1n en desarrollo.',
    'faq.q5':'\u00bfPuedo cancelar en cualquier momento?','faq.a5':'S\u00ed. Baja de plan o cancela cuando quieras \u2014 tus datos permanecen y tu cuenta vuelve a los l\u00edmites del plan Gratis.',
    'cta.h2':'Tu espacio, por fin bajo control',
    'cta.p':'Empieza gratis hoy. Sin tarjeta, sin descargas \u2014 abre la app web y organ\u00edzate en minutos.',
    'cta.btn1':'Abrir Lokaro \u2014 es gratis','cta.btn2':'\u2709\ufe0f contato@lokaro.co',
    'cta.note':'Plan gratuito: 2 unidades para siempre \u00b7 Sin tarjeta de cr\u00e9dito',
    'footer.tagline':'Hecho para personas que gestionan espacios',
  }
};

const _lang = localStorage.getItem('lokaro-lang') || 'en';

function setLang(lang) {
  localStorage.setItem('lokaro-lang', lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = translations[lang][el.dataset.i18n];
    if (val !== undefined) el.innerHTML = val;
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

setLang(_lang);

// ---- Support email: copy to clipboard on click ----
document.querySelectorAll('.support-email').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    const email = this.dataset.email || 'contato@lokaro.co';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(() => {
        const orig = this.innerHTML;
        this.innerHTML = '✓ Copied!';
        this.style.borderColor = 'var(--teal)';
        this.style.color = 'var(--teal)';
        setTimeout(() => {
          this.innerHTML = orig;
          this.style.borderColor = '';
          this.style.color = '';
        }, 2200);
      });
    } else {
      window.location.href = 'mailto:' + email;
    }
  });
});

