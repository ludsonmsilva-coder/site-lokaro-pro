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
    // Tilt 3D do iPhone do herói acompanhando o cursor
    const hero = document.querySelector('.hero');
    const heroPhone = document.querySelector('.mock .phone');
    if (hero && heroPhone) {
      hero.addEventListener('pointermove', e => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        heroPhone.style.transform =
          `rotateY(${x * 14}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
      });
      hero.addEventListener('pointerleave', () => {
        heroPhone.style.transform = '';
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

