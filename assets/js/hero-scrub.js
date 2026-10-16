/* Cereja Make: o vídeo do topo que anda com a rolagem.
   Padrão da skill 10k-websites (scrub-pipeline.md): Blob com anel de progresso,
   tempo suavizado por dt, seeks com portão, escrita no DOM só quando muda,
   legendas por faixa de rolagem e os cinco portões do hero estático, vivos.
   Sem vídeo configurado (data-video vazio), nada aqui roda e o topo fica parado. */
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero || (!hero.getAttribute('data-video') && !hero.getAttribute('data-video-mobile'))) return;

  var VIDEO_URL = hero.getAttribute('data-video');
  var VIDEO_BYTES = parseInt(hero.getAttribute('data-bytes') || '0', 10);
  var POSTER_URL = hero.getAttribute('data-poster');
  var MOBILE_URL = hero.getAttribute('data-video-mobile');
  /* Mapa rolagem -> segundos do vídeo, por trechos ("p:t,p:t,..."). A queda dura 1,2 s no vídeo
     mas ganha um terço da rolagem; o impacto cai em p = 0,34, junto do "Chegou.". */
  var MAPA = (hero.getAttribute('data-mapa') || '0:0,1:1').split(',').map(function (par) {
    var x = par.split(':'); return [parseFloat(x[0]), parseFloat(x[1])];
  });

  var stage = hero.querySelector('.hero__stage');
  var video = hero.querySelector('.hero__video');
  var posterLayer = hero.querySelector('.hero__poster');
  var ring = hero.querySelector('.hero__ring');
  var bands = Array.prototype.slice.call(hero.querySelectorAll('.band'));

  /* Os cinco portões. As mesmas strings, caractere por caractere, estão no CSS. */
  var GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function tempoDe(p) {
    var t = MAPA[MAPA.length - 1][1];
    for (var i = 1; i < MAPA.length; i++) {
      if (p <= MAPA[i][0]) {
        var a = MAPA[i - 1], b = MAPA[i];
        t = a[1] + (b[1] - a[1]) * ((p - a[0]) / ((b[0] - a[0]) || 1));
        break;
      }
    }
    return clamp(t, 0, (video.duration || t) - 0.04);
  }
  function smoothstep(p, e0, e1) { var t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  /* ---------- divide os títulos em palavras, uma vez ---------- */
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function dividir(el, seed, spread) {
    var r = rng(seed);
    var texto = el.textContent.replace(/\s+/g, ' ').trim();
    var visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    var nos = Array.prototype.slice.call(el.childNodes);
    var palavras = [];
    nos.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (pedaco) {
          if (!pedaco) return;
          if (/^\s+$/.test(pedaco)) { visual.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span'); w.className = 'w'; w.textContent = pedaco;
          visual.appendChild(w); palavras.push(w);
        });
      } else if (n.nodeType === 1) {
        var w2 = document.createElement('span'); w2.className = 'w'; w2.appendChild(n.cloneNode(true));
        visual.appendChild(w2); palavras.push(w2);
      }
    });
    palavras.forEach(function (w, i) {
      var th = (palavras.length > 1 ? i / (palavras.length - 1) : 0) * spread + r() * 0.04;
      w.style.setProperty('--th', th.toFixed(3));
      if (el.getAttribute('data-em') && w.textContent.trim() === el.getAttribute('data-em')) w.classList.add('em');
    });
    var leitor = document.createElement('span'); leitor.className = 'so-leitor'; leitor.textContent = texto;
    el.textContent = '';
    el.appendChild(leitor); el.appendChild(visual);
  }
  bands.forEach(function (b, i) {
    var h = b.querySelector('[data-split]');
    if (h) dividir(h, 11 + i * 7, parseFloat(b.getAttribute('data-spread') || '0.5'));
    b.a = parseFloat(b.getAttribute('data-a'));
    b.b = parseFloat(b.getAttribute('data-b'));
    b.ramp = parseFloat(b.getAttribute('data-ramp') || '0') || Math.min(0.025, (b.b - b.a) * 0.35);
    b.op = -1; b.k = -1;
  });

  /* ---------- progresso da rolagem dentro do hero ---------- */
  function heroProgress() {
    var r = hero.getBoundingClientRect();
    var range = hero.offsetHeight - window.innerHeight;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  }

  /* ---------- legendas: opacidade e montagem, só quando mudam ---------- */
  var loadK = 0, loadStart = 0;
  function updateCaptions(p) {
    bands.forEach(function (b, i) {
      var f = Math.min(0.02, (b.b - b.a) / 3);
      var first = i === 0, last = i === bands.length - 1;
      var abre = first ? 1 : smoothstep(p, b.a, b.a + f);
      var fecha = last ? 0 : smoothstep(p, b.b - f, b.b);
      var op = (p < b.a && !first) ? 0 : abre * (1 - fecha);
      if (first && p > b.b) op = 0;
      var k = clamp((p - b.a) / b.ramp, 0, 1);
      if (first) k = Math.max(k, loadK);
      if (Math.abs(op - b.op) > 0.004 || (op === 0) !== (b.op === 0)) {
        b.op = op; b.style.opacity = op.toFixed(3);
        b.style.visibility = op > 0 ? 'visible' : 'hidden';
      }
      if (Math.abs(k - b.k) > 0.008 || (k === 1 && b.k !== 1) || (k === 0 && b.k !== 0)) {
        b.k = k; b.style.setProperty('--k', k.toFixed(3));
      }
    });
  }
  function rampaDeCarga(now) {
    if (!loadStart) loadStart = now;
    loadK = clamp((now - loadStart) / 900, 0, 1);
    loadK = loadK * loadK * (3 - 2 * loadK);
    updateCaptions(heroProgress());
    if (loadK < 1 && scrubOn) requestAnimationFrame(rampaDeCarga);
  }

  /* ---------- seeks com portão (um de cada vez, nunca trava) ---------- */
  var seekBusy = false, pendingTime = null;
  function requestSeek(t) {
    if (!video.duration) return;
    if (seekBusy) { pendingTime = t; return; }
    seekBusy = true;
    video.currentTime = t;
  }
  video.addEventListener('seeked', function () {
    seekBusy = false;
    if (pendingTime !== null) { var t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', function () { seekBusy = false; pendingTime = null; failVideo(); });

  /* ---------- tempo suavizado (rAF que descansa) ---------- */
  var target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    var k = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) { shown = target; rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
    if (video.duration) requestSeek(tempoDe(shown));
    updateCaptions(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      heroOnScreen = es[0].isIntersecting;
      if (heroOnScreen) onScroll();
    }, { threshold: 0 }).observe(hero);
  }

  /* ---------- o vídeo como Blob, com anel honesto e vigia de 20 s ---------- */
  var started = false;
  function startBlobFetch() {
    if (started) return;
    started = true;
    hero.classList.add('carregando');
    loadHeroBlob().catch(failVideo);
  }
  function loadHeroBlob() {
    var ctrl = window.AbortController ? new AbortController() : null;
    var watchdog = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
    return fetch(VIDEO_URL, ctrl ? { priority: 'low', signal: ctrl.signal } : {}).then(function (res) {
      if (!res.ok) throw new Error('vídeo ' + res.status);
      var total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES || 1;
      if (!res.body || !res.body.getReader) return res.blob();
      var reader = res.body.getReader(), chunks = [], got = 0, lastRing = 0;
      function ler() {
        return reader.read().then(function (r) {
          if (r.done) return new Blob(chunks, { type: 'video/mp4' });
          clearTimeout(watchdog);
          watchdog = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
          chunks.push(r.value); got += r.value.length;
          var frac = Math.min(1, got / total), now = performance.now();
          if (now - lastRing > 100 || frac === 1) { lastRing = now; ring.style.setProperty('--ld', Math.round(126 * (1 - frac))); }
          return ler();
        });
      }
      return ler();
    }).then(function (blob) {
      clearTimeout(watchdog);
      ring.style.setProperty('--ld', 0);
      video.src = URL.createObjectURL(blob);
      video.load();
      video.addEventListener('canplay', function () {
        hero.classList.remove('carregando');
        requestSeek(tempoDe(heroProgress()));
        hero.classList.add('video-ready');
      }, { once: true });
    });
  }
  /* Sem vídeo (rede ruim, arquivo aberto com dois cliques), o topo vira a versão parada, completa. */
  var videoFalhou = false;
  function failVideo() {
    if (videoFalhou) return;
    videoFalhou = true;
    hero.classList.remove('carregando');
    hero.classList.add('video-failed');
    disableScrub();
  }

  /* ---------- liga e desliga o scrub conforme os portões, ao vivo ---------- */
  var iniciado = false, scrubOn = false;
  function initHeroOnce() {
    if (iniciado) return; iniciado = true;
    posterLayer.style.backgroundImage = "url('" + POSTER_URL + "')";
    var img = new Image();
    img.onload = startBlobFetch; img.onerror = startBlobFetch;
    img.src = POSTER_URL;
    setTimeout(startBlobFetch, 4000);
  }
  function enableScrub() {
    if (scrubOn) return; scrubOn = true;
    hero.classList.add('hero--video');
    initHeroOnce();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    bands.forEach(function (b) { b.op = -1; b.k = -1; });
    loadStart = 0; requestAnimationFrame(rampaDeCarga);
    target = shown = heroProgress();
    updateCaptions(shown);
    onScroll();
    document.dispatchEvent(new CustomEvent('cereja:hero', { detail: { video: true } }));
  }
  function disableScrub() {
    if (!scrubOn) return; scrubOn = false;
    var antes = hero.getBoundingClientRect().top < 0 && hero.getBoundingClientRect().bottom > 0;
    hero.classList.remove('hero--video');
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (antes) window.scrollTo(0, hero.offsetTop);
    document.dispatchEvent(new CustomEvent('cereja:hero', { detail: { video: false } }));
  }
  /* No celular (e no tablet em pé) não há scrub: a cereja cai sozinha uma vez, ao abrir a página,
     e o texto entra junto. Movimento reduzido e economia de dados ficam com a imagem parada. */
  var intro = null;
  function introCelular() {
    if (intro || !MOBILE_URL) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var con = navigator.connection; if (con && con.saveData) return;
    var box = hero.querySelector('.hero__still'); if (!box) return;
    intro = document.createElement('video');
    intro.className = 'hero__mvideo';
    intro.muted = true; intro.defaultMuted = true; intro.playsInline = true;
    intro.setAttribute('muted', ''); intro.setAttribute('playsinline', '');
    intro.setAttribute('aria-hidden', 'true'); intro.tabIndex = -1;
    intro.preload = 'auto';
    intro.src = MOBILE_URL;
    box.insertBefore(intro, box.querySelector('.glitter'));
    hero.classList.add('hero--intro');
    var tocou = false;
    function visivel() { var r = box.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight; }
    function tocar() {
      if (tocou || !visivel()) return; /* sem esperar readyState: no iPhone o vídeo só começa a baixar depois do play() */
      tocou = true;
      var pr = intro.play();
      if (pr && pr.catch) pr.catch(function () { desistir(); });
    }
    function desistir() { tocou = true; if (intro) { intro.remove(); } hero.classList.remove('intro-tocando'); }
    intro.addEventListener('playing', function () { hero.classList.add('intro-tocando'); });
    intro.addEventListener('timeupdate', function () { if (intro.currentTime >= 1.15) hero.classList.add('intro-impacto'); });
    intro.addEventListener('ended', function () { hero.classList.add('intro-impacto'); });
    intro.addEventListener('error', desistir);
    intro.addEventListener('canplay', tocar);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) tocar(); }, { threshold: 0.3 }).observe(box);
  }

  function applyHeroMode() {
    if (videoFalhou || !VIDEO_URL || GATES.some(function (q) { return window.matchMedia(q).matches; })) { disableScrub(); introCelular(); }
    else enableScrub();
  }
  var MQLS = GATES.map(function (q) { return window.matchMedia(q); });
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyHeroMode);
    else if (m.addListener) m.addListener(applyHeroMode);
  });
  window.__cerejaMQLS = MQLS;
  applyHeroMode();
})();
