/* =====================================================================
   FUNDACIÓN CDMC · Motor de animación (vanilla, sin dependencias)
   Módulos: utilidades · texto dividido · loader · scroll suave · bucle de scroll
            (progreso, header, parallax, palabras, hero, primeros minutos, tarjetas,
            banner, galería, pasos, marquesina, dots) · reveals · contadores · cursor
            · magnético/spotlight · partículas · monitor ECG · pestañas · FAQ · menú · formulario
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth01 = (t) => t * t * (3 - 2 * t);
  const pad = (n) => String(n).padStart(2, '0');
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const WA = '525510446096';
  let vw = innerWidth, vh = innerHeight;

  if (reduce) root.classList.add('no-pin', 'reduce');
  root.classList.add('is-loading');

  /* ---------- Texto dividido en palabras ---------------------------------- */
  function wrapWords(el, mask) {
    const out = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((p) => {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            if (mask) {
              const sw = document.createElement('span'); sw.className = 'sw';
              const si = document.createElement('span'); si.className = 'si'; si.textContent = p;
              sw.appendChild(si); frag.appendChild(sw); out.push(si);
            } else {
              const w = document.createElement('span'); w.className = 'w'; w.textContent = p;
              frag.appendChild(w); out.push(w);
            }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return out;
  }
  $$('[data-split]').forEach((el) => wrapWords(el, true).forEach((s, i) => s.style.setProperty('--i', i)));
  const manifesto = $('[data-words]');
  const words = manifesto ? wrapWords(manifesto, false) : [];
  $$('[data-hero]').forEach((el) => el.style.setProperty('--i', el.dataset.hero));
  $$('.menu li a').forEach((a, i) => a.style.setProperty('--i', i));
  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Reveals y contadores ---------------------------------------- */
  $$('[data-stagger]').forEach((p) => $$('[data-reveal]', p).forEach((c, i) => c.style.setProperty('--d', (i * 0.09).toFixed(2) + 's')));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal],[data-split]').forEach((el) => io.observe(el));

  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      const el = e.target, end = parseFloat(el.dataset.count), dur = reduce ? 1 : 2200, t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / dur), v = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        el.textContent = Math.round(end * v);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach((el) => countIO.observe(el));

  /* ---------- Scroll suave con inercia (solo ratón) ----------------------- */
  let goTo = (y) => scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  if (fine && !reduce) {
    let target = scrollY, current = scrollY, running = false, tween = null;
    const maxY = () => root.scrollHeight - innerHeight;
    const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const loop = (now) => {
      if (tween) {
        // salto por ancla: animación con duración propia según la distancia
        const t = clamp((now - tween.t0) / tween.dur);
        current = target = lerp(tween.from, tween.to, easeIO(t));
        if (t >= 1) { tween = null; running = false; current = target = scrollY; }
      } else {
        current = lerp(current, target, 0.085);
        if (Math.abs(target - current) < 0.4) { current = target; running = false; }
      }
      scrollTo(0, current);
      if (running) requestAnimationFrame(loop);
    };
    addEventListener('wheel', (e) => {
      if (e.ctrlKey || root.classList.contains('is-loading') || root.classList.contains('menu-open')) return;
      if (e.target.closest && e.target.closest('textarea,select,.tabs__list')) return;
      e.preventDefault();
      if (tween) { tween = null; current = scrollY; target = current; }
      target = clamp(target + e.deltaY * (e.deltaMode === 1 ? 34 : 1), 0, maxY());
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: false });
    addEventListener('scroll', () => { if (!running) target = current = scrollY; }, { passive: true });
    goTo = (y) => {
      const to = clamp(y, 0, maxY()), dist = Math.abs(to - scrollY);
      if (dist < 2) return;
      tween = { from: scrollY, to, t0: performance.now(), dur: clamp(850 + dist * 0.16, 1000, 2200) };
      running = true; requestAnimationFrame(loop);
    };
  }

  /* ---------- Loader: ECG + corazón que se abre --------------------------- */
  const loaderEl = $('#loader');
  let readyFired = false;
  function ready() {
    if (readyFired) return; readyFired = true;
    root.classList.add('is-ready');
    setTimeout(() => { const w = $('#waFloat'); if (w) { w.classList.add('show-tip'); setTimeout(() => w.classList.remove('show-tip'), 5200); } }, 6000);
  }
  function runLoader() {
    if (!loaderEl) { root.classList.remove('is-loading'); ready(); return; }
    const pctEl = $('#loaderPct'), hole = $('#loaderHole'), heartSvg = $('#loaderHeart svg');
    const minTime = reduce ? 250 : 2400;
    let loaded = document.readyState === 'complete', done = false, pct = 0;
    const t0 = performance.now();
    addEventListener('load', () => { loaded = true; });
    const open = (fast) => {
      if (done) return; done = true;
      loaderEl.classList.add('is-leaving');
      const r = heartSvg.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const s0 = r.width / 24, s1 = Math.hypot(innerWidth, innerHeight) / 5.2;
      const dur = fast ? 350 : 1250, t1 = performance.now();
      ready();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const grow = (now) => {
        const t = clamp((now - t1) / dur), s = lerp(s0, s1, ease(t));
        hole.setAttribute('transform', `translate(${cx.toFixed(1)} ${cy.toFixed(1)}) scale(${s.toFixed(2)})`);
        if (t < 1) requestAnimationFrame(grow);
        else { loaderEl.remove(); root.classList.remove('is-loading'); }
      };
      requestAnimationFrame(grow);
    };
    const tick = (now) => {
      if (done) return;
      const t = now - t0;
      let goal = clamp(t / minTime) * 92;
      if (loaded && t >= minTime) goal = 100;
      pct += (goal - pct) * 0.09;
      if (goal === 100 && 100 - pct < 0.5) pct = 100;
      pctEl.textContent = Math.round(pct);
      if (pct >= 100) { setTimeout(() => open(false), 150); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => open(true), 8000); // seguro anti-bloqueo
  }
  runLoader();

  /* ---------- Menú móvil -------------------------------------------------- */
  const header = $('#header'), burger = $('#burger'), menu = $('#menu');
  let holdHeader = false, idle = 0;
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.setAttribute('aria-hidden', String(!open));
    menu.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    if (open) header.classList.remove('is-hidden');
  }
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Anclas con scroll suave ------------------------------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const t = $(id); if (!t) return;
      e.preventDefault();
      setMenu(false);
      const sv = a.dataset.service;
      if (sv) { const r = $(`#pills input[value="${sv}"]`); if (r) r.checked = true; }
      holdHeader = true; idle = 0; // el header no se oculta durante saltos por ancla
      header.classList.remove('is-hidden');
      goTo(t.getBoundingClientRect().top + scrollY);
    });
  });

  /* ---------- Bucle principal de scroll ----------------------------------- */
  const bar = $('#progressBar');
  const heroEl = $('#inicio'), heroIn = $('.hero__in'), heroBg = $('.hero__bg');
  const parImgs = $$('[data-parallax-img]');
  const chainSec = $('[data-chain]');
  const panels = $$('[data-panel]'), chainBtns = $$('.chain__list button'), chainNum = $('#chainNum');
  const cards = $$('[data-stack]');
  const banner = $('[data-banner]');
  const galSec = $('[data-gallery]'), galTrack = $('#galTrack');
  const shots = $$('.shot');
  const stepsList = $('#stepsList'), stepItems = stepsList ? $$('li', stepsList) : [];
  const footWord = $('.footer__word');
  const dotLinks = $$('[data-dot]'), navLinks = $$('.nav a');
  const secIds = ['inicio', 'nosotros', 'servicios', 'cadena', 'cursos', 'brigadas', 'galeria', 'contacto'];
  const secEls = secIds.map((id) => $('#' + id));
  const stackMQ = matchMedia('(min-width:1000px) and (min-height:680px)');
  let lastY = scrollY, curStep = -1, curSec = '', galDist = 0, lastWordP = -1;

  function measureGallery() {
    if (!galSec || root.classList.contains('no-pin')) return;
    const last = galTrack.lastElementChild;
    const padL = parseFloat(getComputedStyle(galTrack).paddingLeft) || 0;
    galDist = Math.max(0, last.offsetLeft + last.offsetWidth + padL - innerWidth);
    galSec.style.setProperty('--gh', Math.round(galDist + innerHeight) + 'px');
  }

  function frame() {
    const y = scrollY, vy = y - lastY; lastY = y;
    const maxY = root.scrollHeight - vh;

    if (bar) bar.style.transform = `scaleX(${maxY > 0 ? (y / maxY).toFixed(4) : 0})`;

    // header: se oculta al bajar, vuelve al subir
    header.classList.toggle('is-scrolled', y > 40);
    if (!menu.classList.contains('is-open')) {
      if (holdHeader) {
        header.classList.remove('is-hidden');
        idle = Math.abs(vy) < 0.5 ? idle + 1 : 0;
        if (idle > 20) holdHeader = false;
      } else if (y > 260 && vy > 3) header.classList.add('is-hidden');
      else if (vy < -3 || y < 120) header.classList.remove('is-hidden');
    }

    // hero: salida con parallax
    if (heroEl) {
      const p = clamp(y / vh);
      if (p < 1) {
        heroIn.style.transform = `translate3d(0,${(p * -70).toFixed(1)}px,0) scale(${(1 - p * 0.05).toFixed(4)})`;
        heroIn.style.opacity = (1 - p * 1.15).toFixed(3);
        heroBg.style.transform = `translate3d(0,${(p * 90).toFixed(1)}px,0)`;
      }
    }

    // parallax de imágenes
    parImgs.forEach((img) => {
      const host = img.parentElement, r = host.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      const d = (r.top + r.height / 2 - vh / 2) * parseFloat(img.dataset.parallaxImg || 0.08);
      img.style.translate = `0 ${(-d).toFixed(1)}px`;
    });

    // palabras que se encienden
    if (words.length) {
      const r = manifesto.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) {
        const p = clamp((vh * 0.88 - r.top) / (vh * 0.62));
        if (Math.abs(p - lastWordP) > 0.002) {
          lastWordP = p; const n = words.length;
          words.forEach((w, i) => w.style.setProperty('--o', (0.14 + 0.86 * clamp((p * (n + 4) - i) / 4)).toFixed(3)));
        }
      }
    }

    // primeros minutos (fijado)
    if (chainSec && !root.classList.contains('no-pin')) {
      const r = chainSec.getBoundingClientRect(), range = chainSec.offsetHeight - vh;
      const p = clamp(-r.top / range);
      chainSec.style.setProperty('--cp', p.toFixed(4));
      const n = panels.length, idx = clamp(Math.floor(p * n), 0, n - 1);
      if (idx !== curStep) {
        curStep = idx;
        panels.forEach((el, i) => { el.classList.toggle('is-active', i === idx); el.classList.toggle('is-past', i < idx); });
        chainBtns.forEach((b, i) => b.classList.toggle('is-active', i === idx));
        chainNum.textContent = pad(idx + 1);
      }
    }

    // tarjetas de cursos apiladas
    if (cards.length > 1) {
      const on = stackMQ.matches && !root.classList.contains('no-pin');
      cards.forEach((c, i) => {
        if (i === cards.length - 1) return;
        if (!on) { c.style.transform = ''; c.style.filter = ''; return; }
        const next = cards[i + 1], nt = next.getBoundingClientRect().top;
        const stickTop = parseFloat(getComputedStyle(next).top) || 100;
        const p = clamp((vh - nt) / (vh - stickTop));
        c.style.transform = `scale(${(1 - p * 0.06).toFixed(4)})`;
        c.style.filter = p > 0.01 ? `brightness(${(1 - p * 0.45).toFixed(3)})` : '';
      });
    }

    // banner de brigadas: se abre al entrar
    if (banner) {
      const r = banner.getBoundingClientRect();
      if (r.bottom > -50 && r.top < vh + 50) {
        const e = smooth01(clamp((vh - r.top) / (vh * 0.85)));
        banner.style.setProperty('--ci', ((1 - e) * 16).toFixed(2) + '%');
        banner.style.setProperty('--cx', ((1 - e) * 10).toFixed(2) + '%');
        banner.style.setProperty('--bs', (1.32 - 0.27 * e).toFixed(3));
      }
    }

    // galería horizontal (fijada)
    if (galSec && !root.classList.contains('no-pin')) {
      const r = galSec.getBoundingClientRect(), range = galSec.offsetHeight - vh;
      if (r.bottom > -50 && r.top < vh + 50) {
        const p = clamp(-r.top / Math.max(1, range));
        galTrack.style.transform = `translate3d(${(-p * galDist).toFixed(1)}px,0,0)`;
        galSec.style.setProperty('--gp', p.toFixed(4));
        shots.forEach((s) => {
          const sr = s.getBoundingClientRect();
          if (sr.right < -100 || sr.left > vw + 100) return;
          const c = sr.left + sr.width / 2, k = clamp((c - vw / 2) / vw, -1, 1);
          s.firstElementChild.style.setProperty('--sx', (k * -sr.width * 0.07).toFixed(1) + 'px');
        });
      }
    }

    // pasos del proceso
    if (stepsList) {
      const r = stepsList.getBoundingClientRect();
      if (r.bottom > -50 && r.top < vh + 50) {
        const span = Math.max(r.height, vh * 0.45), p = clamp((vh * 0.78 - r.top) / span);
        stepsList.style.setProperty('--p', p.toFixed(3));
        stepItems.forEach((li, i) => li.classList.toggle('is-lit', p >= i / (stepItems.length - 1) - 0.001 && p > 0.01));
      }
    }

    // marquesinas con inercia de scroll
    marquees.forEach((m) => {
      const r = m.el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > vh + 50) return;
      m.o += (1.15 + Math.abs(vy) * 0.45) * m.dir;
      const pos = ((m.o % m.w) + m.w) % m.w;
      m.track.style.transform = `translate3d(${(-pos).toFixed(1)}px,0,0)`;
    });

    // palabra gigante del footer
    if (footWord) {
      const r = footWord.getBoundingClientRect();
      if (r.top < vh + 100) footWord.style.setProperty('--fy', ((1 - clamp((vh - r.top) / (r.height + vh * 0.3))) * 70).toFixed(1) + 'px');
    }

    // sección activa (menú y puntos)
    let cur = secIds[0];
    secEls.forEach((el, i) => { if (el && el.getBoundingClientRect().top <= vh * 0.45) cur = secIds[i]; });
    if (cur !== curSec) {
      curSec = cur;
      dotLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.dot === cur));
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + cur));
    }

    heroFx.draw();
    monitor.draw();
    cursor.draw();
    requestAnimationFrame(frame);
  }

  /* ---------- Marquesinas -------------------------------------------------- */
  const marquees = $$('[data-marquee]').map((el) => {
    const track = $('.marquee__track', el);
    track.innerHTML += track.innerHTML; // duplicado para el bucle
    return { el, track, dir: Math.sign(parseFloat(el.dataset.marquee)) || 1, o: 0, w: 1 };
  });
  function measureMarquees() { marquees.forEach((m) => { m.w = m.track.scrollWidth / 2 || 1; }); }

  /* ---------- Pasos del scrollytelling por botón -------------------------- */
  chainBtns.forEach((b) => b.addEventListener('click', () => {
    const range = chainSec.offsetHeight - vh, top = chainSec.getBoundingClientRect().top + scrollY;
    goTo(top + range * ((parseInt(b.dataset.go, 10) + 0.5) / panels.length));
  }));

  /* ---------- Cursor propio ------------------------------------------------ */
  const cursor = (() => {
    const el = $('.cursor');
    if (!fine || !el) return { draw() {} };
    const dot = $('.cursor__dot', el), ring = $('.cursor__ring', el);
    let mx = -100, my = -100, rx = -100, ry = -100;
    addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; el.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('pointerleave', () => el.classList.add('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      el.classList.toggle('is-hover', !!(e.target.closest && e.target.closest('a,button,[data-magnetic],label,input,textarea,.tile')));
    });
    return {
      draw() {
        rx = lerp(rx, mx, 0.16); ry = lerp(ry, my, 0.16);
        dot.style.transform = `translate3d(${mx}px,${my}px,0)`;
        ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      }
    };
  })();

  /* ---------- Magnético + spotlight + parallax de ratón ------------------- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }
  $$('[data-spot]').forEach((el) => el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  const visual = $('#heroVisual'), glow = $('#heroGlow');
  let tmx = 0, tmy = 0, cmx = 0, cmy = 0;
  if (fine && heroEl) {
    heroEl.addEventListener('pointermove', (e) => {
      const r = heroEl.getBoundingClientRect();
      tmx = ((e.clientX - r.left) / r.width - 0.5) * 2; tmy = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    heroEl.addEventListener('pointerleave', () => { tmx = 0; tmy = 0; });
  }
  $$('.chip').forEach((c, i) => c.style.setProperty('--d', c.dataset.depth || 20 + i * 6));

  /* ---------- Partículas del hero ----------------------------------------- */
  const heroFx = (() => {
    const cv = $('#heroCanvas');
    if (!cv) return { draw() {}, resize() {} };
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, parts = [], mouse = { x: -999, y: -999 };
    const rnd = (a, b) => a + Math.random() * (b - a);
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = clamp(Math.round((w * h) / 15500), 26, 95);
      parts = Array.from({ length: n }, () => ({
        x: rnd(0, w), y: rnd(0, h), vx: rnd(-0.22, 0.22), vy: rnd(-0.3, -0.05), r: rnd(1, 2.8),
        c: Math.random() < 0.72 ? '255,58,66' : Math.random() < 0.5 ? '255,140,90' : '255,255,255', a: rnd(0.35, 0.95)
      }));
    }
    heroEl && heroEl.addEventListener('pointermove', (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    heroEl && heroEl.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    let visible = true;
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(heroEl);
    resize();
    return {
      resize,
      draw() {
        // inercia del ratón y brillo que lo sigue
        cmx = lerp(cmx, tmx, 0.07); cmy = lerp(cmy, tmy, 0.07);
        if (visual) { visual.style.setProperty('--mx', cmx.toFixed(3)); visual.style.setProperty('--my', cmy.toFixed(3)); }
        if (glow) { glow.style.setProperty('--gx', (66 + cmx * 9).toFixed(1) + '%'); glow.style.setProperty('--gy', (38 + cmy * 10).toFixed(1) + '%'); }
        if (!visible || document.hidden) return;
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.x += p.vx; p.y += p.vy;
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 22000) { const f = (1 - d2 / 22000) * 0.9; p.x += (dx / Math.sqrt(d2 + 1)) * f; p.y += (dy / Math.sqrt(d2 + 1)) * f; }
          if (p.y < -10) { p.y = h + 10; p.x = rnd(0, w); }
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          for (let j = i + 1; j < parts.length; j++) {
            const q = parts[j], ex = p.x - q.x, ey = p.y - q.y, dd = ex * ex + ey * ey;
            if (dd < 11000) { ctx.strokeStyle = `rgba(255,70,80,${(1 - dd / 11000) * 0.22})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
          }
          ctx.fillStyle = `rgba(${p.c},${p.a})`;
          ctx.shadowColor = `rgba(${p.c},.9)`; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
    };
  })();

  /* ---------- Monitor de pulso (ECG en vivo) ------------------------------ */
  const monitor = (() => {
    const cv = $('#ecgCanvas'), bpmEl = $('#bpm'), core = $('.medal__core'), waves = $$('.wave');
    if (!cv) return { draw() {}, resize() {} };
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, offset = 0, last = performance.now(), lastPhase = 0, visible = true;
    const g = (t, c, s) => Math.exp(-Math.pow((t - c) / s, 2));
    const wave = (t) => 0.13 * g(t, 0.17, 0.045) - 0.14 * g(t, 0.335, 0.011) + 1.0 * g(t, 0.365, 0.0095) - 0.3 * g(t, 0.395, 0.012) + 0.24 * g(t, 0.62, 0.065);
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(cv);
    resize();
    const beat = () => {
      if (reduce || !core) return;
      core.animate([{ scale: 1 }, { scale: 1.07 }, { scale: 1 }], { duration: 460, easing: 'ease-out' });
      waves.forEach((wv) => wv.animate([{ borderColor: 'rgba(255,90,90,.95)' }, { borderColor: 'rgba(255,42,54,.55)' }], { duration: 460 }));
    };
    return {
      resize,
      draw() {
        const now = performance.now(), dt = Math.min(now - last, 60); last = now;
        if (!visible || document.hidden) return;
        const bpm = 72 + Math.sin(now / 3800) * 4, period = 190;
        offset += (period * bpm / 60) * dt / 1000;
        if (bpmEl) bpmEl.textContent = Math.round(bpm);
        const headPhase = (((w - 4 + offset) % period) + period) % period / period;
        if (lastPhase < 0.365 && headPhase >= 0.365) beat();
        lastPhase = headPhase;
        ctx.clearRect(0, 0, w, h);
        const gr = ctx.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, 'rgba(255,58,66,0)'); gr.addColorStop(0.45, 'rgba(255,58,66,.9)'); gr.addColorStop(1, 'rgba(255,150,140,1)');
        ctx.strokeStyle = gr; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.shadowColor = '#ff2a36'; ctx.shadowBlur = 10;
        ctx.beginPath();
        let hy = h / 2;
        for (let x = 0; x <= w - 4; x += 2) {
          const t = (((x + offset) % period) + period) % period / period;
          const yy = h * 0.62 - wave(t) * h * 0.52; hy = yy;
          x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.stroke();
        ctx.shadowBlur = 16; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(w - 4, hy, 3, 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0;
      }
    };
  })();

  /* ---------- Pestañas de cursos ------------------------------------------ */
  const tabSets = $$('[data-tabs]').map((box) => {
    const btns = $$('[role="tab"]', box), pans = $$('[role="tabpanel"]', box), ink = $('.tabs__ink', box);
    const place = (b) => { ink.style.setProperty('--x', b.offsetLeft + 'px'); ink.style.setProperty('--w', b.offsetWidth + 'px'); };
    const select = (i, focus) => {
      btns.forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      pans.forEach((p, j) => {
        const on = i === j; p.hidden = !on; p.classList.toggle('is-active', on);
        if (on) $$('li', p).forEach((li, k) => li.style.setProperty('--i', k));
      });
      place(btns[i]); if (focus) btns[i].focus();
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => select(i));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % btns.length, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + btns.length) % btns.length, true); }
      });
    });
    select(0);
    return { btns, place };
  });
  function placeTabs() { tabSets.forEach((t) => { const cur = t.btns.find((b) => b.getAttribute('aria-selected') === 'true'); if (cur) t.place(cur); }); }

  /* ---------- FAQ ---------------------------------------------------------- */
  $$('.acc__item button').forEach((b) => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') === 'true';
    $$('.acc__item button').forEach((o) => o.setAttribute('aria-expanded', 'false'));
    b.setAttribute('aria-expanded', String(!open));
  }));

  /* ---------- Formulario → WhatsApp --------------------------------------- */
  const form = $('#waForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const field = form.nombre.closest('.field'), err = $('.err', field), name = form.nombre.value.trim();
      if (!name) {
        field.classList.add('is-bad'); err.textContent = 'Cuéntanos tu nombre para saludarte.'; form.nombre.focus(); return;
      }
      field.classList.remove('is-bad'); err.textContent = '';
      const lines = [`Hola Fundación CDMC, soy ${name}.`];
      if (form.service.value) lines.push(`Me interesa: ${form.service.value}.`);
      if (form.msg.value.trim()) lines.push(form.msg.value.trim());
      if (form.tel.value.trim()) lines.push(`Mi teléfono: ${form.tel.value.trim()}`);
      const a = document.createElement('a');
      a.href = `https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`;
      a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    });
    form.nombre.addEventListener('input', () => { form.nombre.closest('.field').classList.remove('is-bad'); $('.err', form).textContent = ''; });
  }

  /* ---------- Resize y arranque ------------------------------------------- */
  let rt;
  function relayout() {
    vw = innerWidth; vh = innerHeight;
    measureGallery(); measureMarquees(); placeTabs(); heroFx.resize(); monitor.resize();
  }
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(relayout, 160); });
  addEventListener('load', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
  requestAnimationFrame(frame);
})();
