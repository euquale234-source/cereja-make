/* Cereja Make: comportamento do site. JavaScript puro, sem build.
   Dados: window.LOJA (loja.js) e window.PRODUTOS (produtos.js). */
(function () {
  'use strict';

  var L = window.LOJA || {};
  var PROD = ((window.PRODUTOS || {}).produtos) || [];
  var PREVIA = L.modoPrevia !== false;
  var HOME = !!document.getElementById('hero');
  var byId = {};
  PROD.forEach(function (p) { byId[p.id] = p; });

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- armazenamento (nunca quebra se estiver bloqueado) ---------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('cereja.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('cereja.' + k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } }
  };

  /* ---------- dinheiro ---------- */
  function num(n) { return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ','); }
  function brl(n) { return 'R$ ' + num(n); }
  /* Nome pra mensagem: com a marca e o número do modelo, pra loja saber qual é. */
  function nomeMsg(p) {
    return p.nome + (p.marca && p.nome.indexOf(p.marca) < 0 ? ' ' + p.marca : '') + (p.modelo ? ', modelo ' + p.modelo : '');
  }
  /* Link da foto do produto (só funciona com o site no ar ou na prévia local). */
  function linkDe(p) {
    if (!/^https?:/.test(location.protocol)) return '';
    try { return new URL('produto.html?id=' + encodeURIComponent(p.id), location.href).href; } catch (e) { return ''; }
  }
  function precoTxt(p) {
    if (p.preco == null) return '';
    return p.preco_max ? brl(p.preco) + ' a ' + brl(p.preco_max) : brl(p.preco);
  }

  /* ---------- estado ---------- */
  function lerSacola() {
    var s = store.get('sacola', []);
    return (Array.isArray(s) ? s : []).filter(function (i) { var p = i && byId[i.id]; return p && p.ativo && p.preco != null && p.estoque !== 'esgotado'; });
  }
  var sacola = lerSacola();
  var bairro = store.get('bairro', '');
  var tomEscolhido = {};

  function totalProdutos() {
    return sacola.reduce(function (s, i) { return s + byId[i.id].preco * i.q; }, 0);
  }
  function qtd() { return sacola.reduce(function (s, i) { return s + i.q; }, 0); }
  function salvar() { store.set('sacola', sacola); store.set('bairro', bairro); }

  /* ---------- bairros e taxa ---------- */
  function listaBairros() {
    var out = [];
    (L.bairros || []).forEach(function (g) { g.nomes.forEach(function (n) { out.push({ nome: n, taxa: g.taxa }); }); });
    return out;
  }
  function taxaAtual() {
    if (bairro === 'retirada') return { tipo: 'retirada', taxa: 0 };
    if (bairro === 'outro') return { tipo: 'outro', taxa: null };
    var b = listaBairros().filter(function (x) { return x.nome === bairro; })[0];
    if (!b) return { tipo: 'nenhum', taxa: null };
    var abaixo = b.taxa === 0 && L.minimoEntregaGratis && totalProdutos() < L.minimoEntregaGratis;
    return { tipo: 'bairro', taxa: abaixo ? null : b.taxa, nome: b.nome };
  }
  function taxaTxt(t) {
    if (t.tipo === 'retirada') return 'Retirada na loja, sem taxa';
    if (t.tipo === 'bairro') return t.taxa == null ? 'Entrega grátis a partir de ' + brl(L.minimoEntregaGratis) : t.taxa === 0 ? 'Entrega grátis' : 'Taxa de entrega: ' + brl(t.taxa);
    if (t.tipo === 'outro') return 'Outro bairro: a gente combina no WhatsApp';
    return '';
  }
  function seletorBairroHTML(id) {
    var opts = '<option value="">Escolha seu bairro</option><option value="retirada"' + (bairro === 'retirada' ? ' selected' : '') + '>Retirar na loja (sem taxa)</option>';
    (L.bairros || []).forEach(function (g) {
      opts += '<optgroup label="' + (g.taxa === 0 ? 'Entrega grátis' : 'Taxa de ' + brl(g.taxa)) + '">';
      g.nomes.forEach(function (n) { opts += '<option' + (bairro === n ? ' selected' : '') + '>' + esc(n) + '</option>'; });
      opts += '</optgroup>';
    });
    opts += '<option value="outro"' + (bairro === 'outro' ? ' selected' : '') + '>Outro bairro (a gente combina)</option>';
    return '<select data-bairro id="' + id + '">' + opts + '</select>';
  }

  /* ---------- mensagens do WhatsApp ---------- */
  function wa(msg) { return 'https://wa.me/' + L.whatsapp + '?text=' + encodeURIComponent(msg); }
  function linhaBairro() {
    var t = taxaAtual();
    if (t.tipo === 'retirada') return 'Retirada na loja.';
    if (t.tipo === 'bairro') return 'Meu bairro: ' + t.nome + '.';
    if (t.tipo === 'outro') return 'Meu bairro: outro (a gente combina).';
    return 'Meu bairro: ';
  }
  function listaSacolaTxt(entrega) {
    var l = ['Oi, Cereja! Vi no site e quero:'];
    sacola.forEach(function (i) {
      var p = byId[i.id];
      var lk = p.modelo ? linkDe(p) : '';
      l.push('• ' + (i.q > 1 ? i.q + 'x ' : '') + nomeMsg(p) + (i.tom ? ' (' + i.tom + ')' : '') + ' ' + brl(p.preco * i.q) + (lk ? ' ' + lk : ''));
    });
    l.push('Total dos produtos: ' + brl(totalProdutos()));
    var t = taxaAtual();
    if (entrega) l.push(entrega);
    else if (t.tipo === 'retirada') l.push('Retirada na loja');
    else if (t.tipo === 'bairro') l.push('Bairro: ' + t.nome + ' (' + (t.taxa == null ? 'entrega grátis a partir de ' + brl(L.minimoEntregaGratis) : t.taxa === 0 ? 'entrega grátis' : brl(t.taxa)) + ')');
    else if (t.tipo === 'outro') l.push('Bairro: outro (a gente combina)');
    l.push('Pode ser?');
    return l.join('\n');
  }
  var MSG = {
    geral: function () { return sacola.length ? listaSacolaTxt() : 'Oi, Cereja! Vi o site e vim dar uma olhadinha. Tô procurando: '; },
    sacola: function () { return listaSacolaTxt(); },
    oiapoque: function () { return sacola.length ? listaSacolaTxt('Envio pra Oiapoque') : 'Oi, Cereja! Sou de Oiapoque e quero fazer uma encomenda.'; },
    retirada: function () { return sacola.length ? listaSacolaTxt('Retirada na loja') : 'Oi, Cereja! Quero pedir pra retirar na loja.'; }
  };
  function msgProduto(p, tom) {
    var lk = linkDe(p);
    return 'Oi, Cereja! Vi no site e quero: ' + nomeMsg(p) + (tom ? ' (' + tom + ')' : '') + (p.preco != null ? ' por ' + brl(p.preco) : '') + '. Tem?' + (lk ? '\n' + lk : '') + '\n' + linhaBairro();
  }

  /* ---------- pendências da cliente ---------- */
  function pend(rotulo) { return PREVIA ? '<span class="pend">' + (rotulo ? esc(rotulo) + ': ' : '') + 'a confirmar</span>' : ''; }
  function val(chave, rotulo) {
    var v = L[chave];
    return v != null && v !== '' ? esc(v) : pend(rotulo);
  }
  function tem(chave) { return L[chave] != null && L[chave] !== ''; }

  /* ---------- peças de HTML ---------- */
  var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0" aria-hidden="true" focusable="false"><defs>' +
    '<symbol id="i-cereja" viewBox="0 0 48 48"><path d="M24 8c-1 8-5 14-9 22M24 8c3 7 6 13 9 22" fill="none" stroke="#2E7D32" stroke-width="2.4" stroke-linecap="round"/><path d="M24 8c4-5 10-5 14-2-4 4-9 5-14 2z" fill="#2E7D32"/><circle cx="14" cy="34" r="8.5" fill="#C8102E"/><circle cx="34" cy="34" r="8.5" fill="#C8102E"/><ellipse cx="11.5" cy="31" rx="2.2" ry="3" fill="#fff" opacity=".75" transform="rotate(-20 11.5 31)"/><ellipse cx="31.5" cy="31" rx="2.2" ry="3" fill="#fff" opacity=".75" transform="rotate(-20 31.5 31)"/></symbol>' +
    '<symbol id="i-sacola" viewBox="0 0 48 48"><path d="M16 18c0-6 3-10 8-10s8 4 8 10" fill="none" stroke="#8B0A1A" stroke-width="2.6" stroke-linecap="round"/><path d="M9 18h30l-2 24H11z" fill="#F9DDE3" stroke="#C8102E" stroke-width="2.4" stroke-linejoin="round"/><circle cx="18" cy="28" r="2.6" fill="#C8102E"/><circle cx="29" cy="33" r="2.6" fill="#C8102E"/><circle cx="25" cy="24" r="2" fill="#C8102E"/></symbol>' +
    '<symbol id="i-wa" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.8-.9c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></symbol>' +
    '<symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></symbol>' +
    '<symbol id="i-busca" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-boca" viewBox="0 0 48 48"><path d="M6 25c6-8 12-9 18-5 6-4 12-3 18 5-5 10-12 14-18 14S11 35 6 25z" fill="#F4B3C2" stroke="#3A0A12" stroke-width="2.2" stroke-linejoin="round"/><path d="M8 25c6 3 12 3 16 0 4 3 10 3 16 0" fill="none" stroke="#3A0A12" stroke-width="2" stroke-linecap="round"/><path d="M30 12l4-6M36 14l5-4" stroke="#E8B84B" stroke-width="2.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-olho" viewBox="0 0 48 48"><path d="M5 26c6-9 13-13 19-13s13 4 19 13c-6 8-13 11-19 11S11 34 5 26z" fill="#F4B3C2" stroke="#3A0A12" stroke-width="2.2" stroke-linejoin="round"/><circle cx="24" cy="25" r="6.5" fill="#fff" stroke="#3A0A12" stroke-width="2"/><circle cx="24" cy="25" r="3" fill="#3A0A12"/><path d="M10 15l-3-5M18 11l-1-6M30 11l1-6M38 15l3-5" stroke="#3A0A12" stroke-width="2.2" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-blush" viewBox="0 0 48 48"><circle cx="21" cy="29" r="14" fill="#F4B3C2" stroke="#3A0A12" stroke-width="2.2"/><circle cx="21" cy="29" r="8" fill="#C8102E" opacity=".35"/><path d="M33 8l9 9-12 8z" fill="#FFF6F3" stroke="#3A0A12" stroke-width="2.2" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-frasco" viewBox="0 0 48 48"><rect x="12" y="20" width="24" height="23" rx="6" fill="#F4B3C2" stroke="#3A0A12" stroke-width="2.2"/><rect x="19" y="12" width="10" height="8" fill="#FFF6F3" stroke="#3A0A12" stroke-width="2.2"/><path d="M24 12V6M20 6h8" stroke="#3A0A12" stroke-width="2.4" stroke-linecap="round"/><path d="M18 30h12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-presilha" viewBox="0 0 48 48"><path d="M6 28c0-9 8-15 18-15s18 6 18 15z" fill="#F4B3C2" stroke="#3A0A12" stroke-width="2.2" stroke-linejoin="round"/><path d="M10 28v7M17 28v9M24 28v9M31 28v9M38 28v7" stroke="#3A0A12" stroke-width="2.4" stroke-linecap="round"/><path d="M24 13c-4-6-9-5-9-1s5 4 9 1zM24 13c4-6 9-5 9-1s-5 4-9 1z" fill="#C8102E" stroke="#3A0A12" stroke-width="1.8" stroke-linejoin="round"/></symbol>' +
    '<symbol id="i-moto" viewBox="0 0 48 48"><circle cx="11" cy="33" r="6" fill="none" stroke="#3A0A12" stroke-width="2.4"/><circle cx="37" cy="33" r="6" fill="none" stroke="#3A0A12" stroke-width="2.4"/><path d="M11 33l8-12h10l8 12M19 21l-3-5h-4M29 21l-3 12" fill="none" stroke="#3A0A12" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><rect x="18" y="8" width="14" height="10" rx="2" fill="#C8102E" stroke="#3A0A12" stroke-width="2"/></symbol>' +
    '<symbol id="i-laco" viewBox="0 0 48 48"><path d="M24 24c-6-10-18-12-18-3s12 11 18 3zM24 24c6-10 18-12 18-3s-12 11-18 3z" fill="#F4B3C2" stroke="#C8102E" stroke-width="2.2" stroke-linejoin="round"/><circle cx="24" cy="24" r="4" fill="#C8102E"/><path d="M22 28l-5 12M26 28l5 12" stroke="#C8102E" stroke-width="2.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-beijo" viewBox="0 0 64 64"><path d="M6 34c8-14 18-14 26-8 8-6 18-6 26 8-8 16-18 22-26 22S14 50 6 34z" fill="#C8102E"/><path d="M10 34c8 4 14 4 22-1 8 5 14 5 22 1" fill="none" stroke="#8B0A1A" stroke-width="2.4" stroke-linecap="round"/></symbol>' +
    '<symbol id="i-mao" viewBox="0 0 48 48"><path d="M5 14c8 14 22 22 34 20" fill="none" stroke="#3A0A12" stroke-width="3" stroke-linecap="round"/><path d="M39 34l-9-9M39 34l-11 5" fill="none" stroke="#3A0A12" stroke-width="3" stroke-linecap="round"/></symbol>' +
    '</defs></svg>';

  function ico(id, cls) { return '<svg class="' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#' + id + '"/></svg>'; }
  var ICONE_CAT = { 'Lábios': 'i-boca', 'Olhos': 'i-olho', 'Rosto': 'i-blush', 'Cuidados': 'i-frasco', 'Acessórios': 'i-presilha', 'Tudo': 'i-cereja' };

  function so() { return '<span class="so">só</span>'; }

  /* ---------- chrome compartilhado ---------- */
  function ancora(h) { return HOME ? h : 'index.html' + h; }

  function montarChrome() {
    document.body.insertAdjacentHTML('afterbegin', SPRITE);
    var topo = document.getElementById('topo');
    if (topo) {
      topo.innerHTML =
        '<div class="topo__in">' +
        '<a class="marca" href="' + (HOME ? '#hero' : 'index.html') + '" aria-label="Cereja Make, início">' + '<img class="marca__logo" src="assets/marca/logo-120.webp" srcset="assets/marca/logo-120.webp 1x, assets/marca/logo-240.webp 2x" width="237" height="120" alt="Cereja Make">' + '</a>' +
        '<nav class="topo__nav" aria-label="Principal">' +
        '<a href="produtos.html">Produtinhos</a><a href="' + ancora('#entrega') + '">Entrega</a><a href="' + ancora('#loja') + '">A loja</a><a href="' + ancora('#duvidas') + '">Dúvidas</a></nav>' +
        '<button class="sacola-btn" id="btn-sacola" type="button" aria-label="Abrir a sacola">' + ico('i-sacola') + '<span class="sacola-cont" id="sacola-cont" aria-live="polite">0</span></button>' +
        '<a class="btn btn--acento topo__cta" data-wa="geral" href="#">' + ico('i-wa') + 'Pedir no WhatsApp</a>' +
        '<button class="menu-btn" id="menu-btn" type="button" aria-label="Abrir o menu" aria-expanded="false" aria-controls="menu">' + ico('i-menu') + '</button>' +
        '</div>';
      topo.insertAdjacentHTML('afterend',
        '<nav class="menu" id="menu" aria-label="Menu"><a href="produtos.html">Produtinhos</a><a href="' + ancora('#dez') + '">Seção de R$ 10</a><a href="' + ancora('#entrega') + '">Entrega</a><a href="' + ancora('#loja') + '">A loja</a><a href="' + ancora('#duvidas') + '">Dúvidas</a></nav>');
    }
    var rod = document.getElementById('rodape');
    if (rod) {
      rod.innerHTML =
        '<div class="rodape__in"><div><a class="rodape__marca" href="' + (HOME ? '#hero' : 'index.html') + '">' + '<img class="rodape__logo" src="assets/marca/logo-240.webp" width="474" height="240" alt="Cereja Make" loading="lazy">' + '</a>' +
        '<div class="rodape__linhas"><span>' + esc(L.endereco) + '</span><span>WhatsApp ' + esc(L.whatsappBonito) + '</span>' +
        '<span><a class="link" href="https://www.instagram.com/' + esc(L.instagram) + '/" rel="noopener">@' + esc(L.instagram) + '</a></span></div></div>' +
        '<div class="rodape__linhas"><span>Enviamos para Oiapoque</span><span>' + val('horario', 'horário') + '</span><span>' + (tem('cnpj') ? 'CNPJ ' + esc(L.cnpj) : pend('CNPJ')) + '</span></div>' +
        '<nav class="rodape__nav" aria-label="Rodapé"><a href="produtos.html">Produtinhos</a><a href="' + ancora('#entrega') + '">Entrega</a><a href="' + ancora('#loja') + '">A loja</a><a href="' + ancora('#duvidas') + '">Dúvidas</a></nav></div>';
    }
    document.body.insertAdjacentHTML('beforeend',
      '<div class="flutuante" id="flutuante"><span class="linha-mono" id="flut-horario"></span><a class="btn btn--acento" data-wa="geral" id="flut-btn" href="#">' + ico('i-wa') + '<span>Pedir no WhatsApp</span></a></div>' +
      '<div class="barra-sacola" id="barra"><button type="button" class="resumo" id="barra-resumo"><span id="barra-qtd"></span><span class="linha-mono" id="barra-sub"></span></button><a class="btn btn--acento" data-wa="sacola" href="#">' + ico('i-wa') + '<span id="barra-btn">Pedir no WhatsApp</span></a></div>' +
      '<div class="gaveta__fundo" id="gaveta-fundo"></div>' +
      '<aside class="gaveta" id="gaveta" role="dialog" aria-modal="true" aria-label="Sua sacola" aria-hidden="true"><div class="gaveta__topo"><h2>Sua sacola</h2><button type="button" class="fechar" data-fechar aria-label="Fechar a sacola">&times;</button></div><div id="gaveta-box"></div></aside>');
  }

  /* ---------- cartões de produto ---------- */
  function selosHTML(p, ctx) {
    var s = '';
    if (p.estoque === 'esgotado') s += '<span class="selo">Esgotou, volta logo</span>';
    if ((p.tags || []).indexOf('chegou') > -1) s += '<span class="selo selo--chegou">Chegou</span>';
    if (ctx !== 'dez' && (p.tags || []).indexOf('dez-reais') > -1 && p.preco === 10 && !p.preco_max) s += '<span class="selo">R$ 10</span>';
    return s ? '<div class="card__selos">' + s + '</div>' : '';
  }
  function fotoHTML(p) {
    return (p.thumb || p.imagem)
      ? '<img loading="lazy" decoding="async" width="480" height="600" src="' + esc(p.thumb || p.imagem) + '" alt="' + esc(p.nome + (p.marca ? ', ' + p.marca : '') + (p.modelo ? ', modelo ' + p.modelo : '')) + '">'
      : '<div class="card__foto--vazia" style="height:100%">' + ico('i-cereja') + '</div>';
  }
  function cardHTML(p, ctx) {
    var ok = p.ativo && p.preco != null;
    var esg = p.estoque === 'esgotado';
    var preco = ok
      ? '<div class="preco">' + precoTxt(p) + (ctx === 'dez' && p.preco === 10 && !p.preco_max ? '<small>cada</small>' : '') + '</div>'
      : '<div class="preco preco--pend">' + pend('preço') + '</div>';
    var acoes = '';
    if (ok && !esg) {
      acoes = '<a class="btn btn--contorno" data-wa-produto="' + esc(p.id) + '" href="#">Pedir no WhatsApp</a>' +
        '<button type="button" class="pill pill--sacola" data-add="' + esc(p.id) + '" aria-label="Pôr ' + esc(nomeMsg(p)) + ' na sacola">' + ico('i-sacola') + '+ Sacola</button>';
    } else if (ok && esg) {
      acoes = '<a class="btn btn--contorno" data-wa-avisa="' + esc(p.id) + '" href="#">Me avisa quando voltar</a>';
    }
    return '<article class="card' + (esg ? ' card--esgotado' : '') + '">' +
      '<div class="card__foto">' + selosHTML(p, ctx) + fotoHTML(p) + '</div>' +
      '<h3 class="card__nome"><a href="produto.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.nome) + (p.modelo ? '<span class="so-leitor">, modelo ' + p.modelo + '</span>' : '') + '</a></h3>' +
      ((p.marca || p.modelo) ? '<div class="card__marca">' + esc(p.marca || '') + (p.marca && p.modelo ? ' · ' : '') + (p.modelo ? 'modelo ' + p.modelo : '') + '</div>' : '') + preco +
      (acoes ? '<div class="card__acoes">' + acoes + '</div>' : '') + '</article>';
  }

  /* ---------- sacola: interface ---------- */
  function sacolaHTML(sufixo) {
    var itens = sacola.map(function (i, idx) {
      var p = byId[i.id];
      return '<li class="sacola__item">' +
        ((p.thumb || p.imagem) ? '<img src="' + esc(p.thumb || p.imagem) + '" alt="" width="56" height="56">' : '<div class="card__foto--vazia">' + ico('i-cereja') + '</div>') +
        '<div><div class="xodo__nome">' + esc(p.nome) + (p.modelo ? ' <small>(modelo ' + p.modelo + ')</small>' : '') + (i.tom ? ' <small>(' + esc(i.tom) + ')</small>' : '') + '</div>' +
        '<div class="preco">' + brl(p.preco * i.q) + (i.q > 1 ? '<small>' + i.q + ' x ' + brl(p.preco) + '</small>' : '') + '</div></div>' +
        '<button type="button" class="remover" data-rem="' + idx + '" aria-label="Tirar ' + esc(nomeMsg(p) + (i.tom ? ' (' + i.tom + ')' : '')) + ' da sacola">&times;</button></li>';
    }).join('');
    var t = taxaAtual();
    var total = totalProdutos();
    var linhaTaxa = taxaTxt(t);
    var comEntrega = (t.taxa != null && sacola.length) ? '<div>Com a entrega: <span class="preco">' + brl(total + t.taxa) + '</span></div>' : '';
    var minimo = (t.tipo === 'bairro' && t.taxa === 0 && L.minimoEntregaGratis) ? '<div class="linha-mono">Entrega grátis a partir de ' + brl(L.minimoEntregaGratis) + '.</div>' : '';
    return '<div class="sacola">' +
      '<div class="sacola__caixa">' + ico('i-laco', 'sacola__laco') +
      (sacola.length ? '<ul class="sacola__lista" aria-label="Itens da sacola">' + itens + '</ul>'
        : '<p class="sacola__vazia">Sua sacola está vazia. Toca em + Sacola pra começar.</p>') + '</div>' +
      '<div class="sacola__painel"><label class="campo" for="bairro-' + sufixo + '">Seu bairro' + seletorBairroHTML('bairro-' + sufixo) + '</label>' +
      (linhaTaxa ? '<div class="taxa-linha">' + esc(linhaTaxa) + '</div>' : '') + minimo +
      '<div class="totais"><div>Produtos: <span class="preco">' + brl(total) + '</span></div>' + comEntrega +
      (tem('prazo') ? '<div class="linha-mono">' + esc(L.prazo) + '</div>' : (PREVIA ? '<div>' + pend('prazo') + '</div>' : '')) + '</div>' +
      '<a class="btn btn--acento" data-wa="sacola" href="#"' + (sacola.length ? '' : ' aria-disabled="true" tabindex="-1" style="opacity:.55;pointer-events:none"') + '>' + ico('i-wa') + 'Pedir no WhatsApp</a>' +
      '<div class="linha-mono">Pagamento: ' + (tem('pagamento') ? esc(L.pagamento) : (PREVIA ? 'a confirmar' : '')) + '</div>' +
      '</div></div>';
  }

  /* ---------- atualizar tudo que depende do estado ---------- */
  function atualizar() {
    salvar();
    var n = qtd();
    var cont = $('#sacola-cont');
    if (cont) { cont.textContent = n; cont.classList.toggle('on', n > 0); }
    var barra = $('#barra');
    if (barra) {
      barra.classList.toggle('on', n > 0);
      $('#barra-qtd').textContent = n + (n === 1 ? ' item' : ' itens') + ' na sacola, ' + brl(totalProdutos());
      var t = taxaAtual();
      $('#barra-sub').textContent = taxaTxt(t) || (tem('horario') ? L.horario : '');
      $('#barra-btn').textContent = 'Pedir no WhatsApp (' + n + ')';
    }
    var fl = $('#flutuante'); if (fl) fl.style.visibility = n > 0 ? 'hidden' : '';
    var sb = $('#sacola-box'); if (sb) sb.innerHTML = sacolaHTML('f');
    var gb = $('#gaveta-box'); if (gb) gb.innerHTML = sacolaHTML('g');
    $$('[data-wa]').forEach(function (a) {
      var k = a.getAttribute('data-wa');
      a.href = wa((MSG[k] || MSG.geral)());
      a.target = '_blank'; a.rel = 'noopener';
    });
    $$('[data-wa-produto]').forEach(function (a) {
      var p = byId[a.getAttribute('data-wa-produto')];
      a.href = wa(msgProduto(p, tomEscolhido[p.id]));
      a.target = '_blank'; a.rel = 'noopener';
    });
    $$('[data-wa-avisa]').forEach(function (a) {
      var p = byId[a.getAttribute('data-wa-avisa')];
      var lk = linkDe(p); a.href = wa('Oi, Cereja! Me avisa quando ' + nomeMsg(p) + ' voltar?' + (lk ? '\n' + lk : '')); a.target = '_blank'; a.rel = 'noopener';
    });
    $$('select[data-bairro]').forEach(function (s) {
      if (s.value !== bairro && !(bairro === '' && s.value === '')) s.value = bairro;
    });
    $$('.js-entrega').forEach(function (el) {
      var t2 = taxaAtual();
      el.textContent = t2.tipo === 'nenhum' ? 'Escolha seu bairro pra ver a taxa' : 'Entrega: ' + taxaTxt(t2).replace('Taxa de entrega: ', '').replace('Entrega grátis', 'grátis');
    });
    var hor = $('#flut-horario');
    if (hor) hor.textContent = tem('horario') ? L.horario : '';
    if (hor) hor.style.display = tem('horario') ? '' : 'none';
  }

  function adicionar(id, tom, origem) {
    var p = byId[id]; if (!p || p.preco == null) return;
    var achou = sacola.filter(function (i) { return i.id === id && (i.tom || '') === (tom || ''); })[0];
    if (achou) achou.q += 1; else sacola.push({ id: id, tom: tom || '', q: 1 });
    voar(origem, p);
    atualizar();
    var b = $('#btn-sacola');
    if (b && !reduz.matches) { b.classList.remove('quica'); void b.offsetWidth; b.classList.add('quica'); }
  }
  function remover(idx) {
    var i = sacola[idx]; if (!i) return;
    if (i.q > 1) i.q -= 1; else sacola.splice(idx, 1);
    atualizar();
  }
  function voar(origem, p) {
    var alvo = $('#btn-sacola');
    if (!origem || !alvo || reduz.matches || !origem.getBoundingClientRect || !(p.thumb || p.imagem)) return;
    var a = origem.getBoundingClientRect(), b = alvo.getBoundingClientRect();
    var el = document.createElement('img');
    el.src = p.thumb || p.imagem; el.alt = ''; el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;z-index:80;width:56px;height:70px;object-fit:cover;border-radius:12px;pointer-events:none;box-shadow:0 10px 24px rgba(58,10,18,.3);left:' + (a.left + a.width / 2 - 28) + 'px;top:' + (a.top + a.height / 2 - 35) + 'px';
    document.body.appendChild(el);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var an = el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 60) + 'px) scale(.8)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.25)', opacity: .2 }
    ], { duration: 650, easing: 'cubic-bezier(.22,.61,.36,1)' });
    an.onfinish = function () { el.remove(); };
  }

  /* ---------- gaveta e menu ---------- */
  function gaveta(abrir) {
    var g = $('#gaveta'), f = $('#gaveta-fundo');
    if (!g) return;
    g.classList.toggle('on', abrir); f.classList.toggle('on', abrir);
    g.setAttribute('aria-hidden', abrir ? 'false' : 'true');
    document.documentElement.style.overflow = abrir ? 'hidden' : '';
    if (abrir) { var c = $('[data-fechar]', g); if (c) c.focus(); }
    else { var b = $('#btn-sacola'); if (b) b.focus(); }
  }
  function menu(abrir) {
    var m = $('#menu'), b = $('#menu-btn'); if (!m) return;
    m.classList.toggle('aberto', abrir); b.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]');
    if (add) { adicionar(add.getAttribute('data-add'), tomEscolhido[add.getAttribute('data-add')] || '', add); return; }
    var rem = e.target.closest('[data-rem]');
    if (rem) { remover(parseInt(rem.getAttribute('data-rem'), 10)); return; }
    if (e.target.closest('#btn-sacola') || e.target.closest('#barra-resumo')) { gaveta(true); menu(false); return; }
    if (e.target.closest('[data-fechar]') || e.target.id === 'gaveta-fundo') { gaveta(false); return; }
    var tom = e.target.closest('[data-tom]');
    if (tom) {
      var id = tom.getAttribute('data-tom-id'), v = tom.getAttribute('data-tom');
      tomEscolhido[id] = tomEscolhido[id] === v ? '' : v;
      $$('[data-tom-id="' + id + '"]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tom') === tomEscolhido[id] ? 'true' : 'false'); });
      atualizar(); return;
    }
    if (e.target.closest('#menu-btn')) { menu(!$('#menu').classList.contains('aberto')); return; }
    if (e.target.closest('#menu a')) menu(false);
  });
  document.addEventListener('change', function (e) {
    if (e.target.matches('select[data-bairro]')) { bairro = e.target.value; atualizar(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if ($('#gaveta.on')) gaveta(false); if ($('#menu.aberto')) { menu(false); $('#menu-btn').focus(); } }
  });
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('pausado', document.hidden);
  });
  /* Voltar de página (cache do navegador) ou outra aba mexeu na sacola: relê o que está salvo. */
  function reler() { sacola = lerSacola(); bairro = store.get('bairro', ''); atualizar(); }
  window.addEventListener('pageshow', function (e) { if (e.persisted) reler(); });
  window.addEventListener('storage', function (e) { if (e.key === 'cereja.sacola' || e.key === 'cereja.bairro') reler(); });

  /* ---------- observadores ---------- */
  function observarEntradas() {
    var els = $$('[data-reveal],.divisor,.desenha');
    if (!('IntersectionObserver' in window) || reduz.matches) { els.forEach(function (el) { el.classList.add('in', 'feito'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (x) {
        if (x.isIntersecting) {
          x.target.classList.add('in');
          setTimeout(function () { x.target.classList.add('feito'); }, 1800);
          io.unobserve(x.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  function cabecalho() {
    var topo = $('#topo'); if (!topo) return;
    var hero = $('#hero');
    if (!hero || !('IntersectionObserver' in window)) { topo.classList.add('topo--solido'); return; }
    var io = new IntersectionObserver(function (es) {
      topo.classList.toggle('topo--solido', !es[0].isIntersecting);
    }, { rootMargin: '-64px 0px 0px 0px', threshold: 0 });
    /* Com vídeo, o cabeçalho fica transparente o hero inteiro; com a imagem parada, só enquanto a foto está atrás dele. */
    function alvo() { io.disconnect(); io.observe(hero.classList.contains('hero--video') ? hero : ($('.hero__still', hero) || hero)); }
    alvo();
    document.addEventListener('cereja:hero', alvo);
  }

  function flutuante() {
    var f = $('#flutuante'); if (!f) return;
    var est = { cta: false, hero: false, video: false };
    function aplicar() { f.classList.toggle('on', est.video ? !est.hero : !est.cta); }
    var cta = $('#hero-cta') || $('.produto__info [data-wa-produto]') || $('.produto__info [data-wa-avisa]'), hero = $('#hero');
    if (!('IntersectionObserver' in window) || (!cta && !hero)) { f.classList.add('on'); return; }
    if (cta) new IntersectionObserver(function (es) { est.cta = es[0].isIntersecting; aplicar(); }, { threshold: 0 }).observe(cta);
    if (hero) new IntersectionObserver(function (es) { est.hero = es[0].isIntersecting; aplicar(); }, { threshold: 0 }).observe(hero);
    document.addEventListener('cereja:hero', function (e) { est.video = !!(e.detail && e.detail.video); aplicar(); });
  }

  function heroFora() {
    var h = $('#hero'); if (!h || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) { h.classList.toggle('fora', !es[0].isIntersecting); }, { threshold: 0 }).observe(h);
  }

  function glitter() {
    var g = $('.glitter'); if (!g || reduz.matches) return;
    var s = 7, html = '';
    function r() { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }
    for (var i = 0; i < 14; i++) {
      html += '<i style="left:' + (r() * 96 + 2).toFixed(1) + '%;top:' + (r() * 80 + 6).toFixed(1) + '%;--d:' + (9 + r() * 5).toFixed(1) + 's;--delay:-' + (r() * 12).toFixed(1) + 's"></i>';
    }
    g.innerHTML = html;
  }

  function caule() {
    var path = $('.caule path'), box = $('.historia');
    if (!path || !box) return;
    path.setAttribute('pathLength', '1');
    path.style.strokeDasharray = '1';
    var ultimo = -1;
    function pos() {
      if (reduz.matches) { path.style.strokeDashoffset = '0'; return; }
      var r = box.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height + vh * 0.2)));
      var v = (1 - p).toFixed(3);
      if (v !== ultimo) { path.style.strokeDashoffset = v; ultimo = v; }
    }
    pos();
    window.addEventListener('scroll', pos, { passive: true });
    window.addEventListener('resize', pos);
  }

  /* ---------- páginas ---------- */
  function renderHome() {
    var ativos = PROD.filter(function (p) { return p.ativo && p.preco != null; });

    // faixa de confiança
    var faixa = $('#faixa-extra');
    if (faixa) {
      var h = '';
      if (tem('prazo')) h += '<span class="sticker">' + esc(L.prazo) + '</span>'; else if (PREVIA) h += '<span class="sticker">' + pend('prazo') + '</span>';
      if (tem('horario')) h += '<span class="sticker">' + esc(L.horario) + '</span>'; else if (PREVIA) h += '<span class="sticker">' + pend('horário') + '</span>';
      faixa.innerHTML = h;
    }

    // B: seção de R$ 10 (a lista escolhida em loja.js; o resto está no catálogo)
    var dez = (L.dezReais || []).map(function (id) { return byId[id]; }).filter(function (p) { return p && p.ativo && p.preco === 10; });
    if (!dez.length) dez = ativos.filter(function (p) { return p.preco === 10; }).slice(0, 8);
    var gb = $('#grade-dez');
    if (gb) gb.innerHTML = dez.map(function (p) { return cardHTML(p, 'dez'); }).join('');
    var nd = $('#conta-dez');
    if (nd) nd.textContent = ativos.filter(function (p) { return p.preco === 10; }).length;

    // D: novidades (no modo prévia, mostra também os que esperam preço)
    var gn = $('#grade-novidades');
    if (gn) {
      var nov = PROD.filter(function (p) { return (p.tags || []).indexOf('chegou') > -1 && (p.ativo || PREVIA); });
      gn.innerHTML = nov.map(function (p) { return cardHTML(p, 'nov'); }).join('');
      if (!nov.length) { var sn = $('#novidades'); if (sn) sn.hidden = true; }
    }

    // E: os xodós
    var sx = $('#xodos');
    if (sx) {
      var lista = (L.maisPedidos || []).map(function (id) { return byId[id]; }).filter(function (p) { return p && p.ativo && p.preco != null; });
      if (!L.maisPedidosConfirmado && !PREVIA) { sx.hidden = true; }
      else {
        $('#prateleira').innerHTML = lista.map(function (p) {
          return '<a class="xodo" href="produto.html?id=' + encodeURIComponent(p.id) + '"><div class="xodo__foto">' + ((p.thumb || p.imagem) ? '<img loading="lazy" decoding="async" src="' + esc(p.thumb || p.imagem) + '" alt="" width="72" height="72">' : '') + '</div>' +
            '<div><div class="xodo__nome">' + esc(p.nome) + '</div><div class="xodo__meta"><span>' + esc(p.marca) + '</span><span class="preco">' + precoTxt(p) + '</span></div></div></a>';
        }).join('');
        var nota = $('#xodos-nota');
        if (nota) nota.innerHTML = L.maisPedidosConfirmado ? '' : pend('lista dos mais pedidos');
      }
    }

    // C: categorias
    var cats = $('#cats');
    if (cats) {
      var nomes = ['Lábios', 'Olhos', 'Rosto', 'Cuidados', 'Acessórios', 'Tudo'];
      cats.innerHTML = nomes.map(function (c) {
        return '<a class="cat" href="produtos.html' + (c === 'Tudo' ? '' : '?cat=' + encodeURIComponent(c)) + '">' + ico(ICONE_CAT[c]) + '<span>' + c + '</span></a>';
      }).join('');
    }

    // G: tabela de entrega
    var tb = $('#tabela-entrega');
    if (tb) {
      tb.innerHTML = (L.bairros || []).map(function (g) {
        return '<tr><th scope="row">' + (g.taxa === 0 ? 'Grátis' : brl(g.taxa)) + '</th><td>' + g.nomes.map(esc).join(', ') + '</td></tr>';
      }).join('');
    }
    var ped = $('#js-minimo'); if (ped) ped.innerHTML = val('pedidoMinimo', 'pedido mínimo');
    var pg = $('#js-pagamento'); if (pg) pg.innerHTML = val('pagamento', '');
    var pz = $('#js-prazo'); if (pz) pz.innerHTML = val('prazo', 'prazo');
    var tr = $('#js-troca'); if (tr) tr.innerHTML = tem('politicaTroca') ? esc(L.politicaTroca) : (PREVIA ? 'que a gente resolve. ' + pend('política de troca') : 'que a gente resolve.');
    var oi = $('#js-oiapoque'); if (oi) oi.innerHTML = val('oiapoque', 'detalhes do envio pra Oiapoque');

    // H: loja de verdade
    var hr = $('#js-horario'); if (hr) hr.innerHTML = val('horario', 'horário');
    var ref = $('#js-ref'); if (ref) ref.innerHTML = tem('pontoReferencia') ? 'Ponto de referência: ' + esc(L.pontoReferencia) + '.' : (PREVIA ? pend('ponto de referência') : '');
    var cn = $('#js-cnpj'); if (cn) cn.innerHTML = tem('cnpj') ? 'CNPJ ' + esc(L.cnpj) : (PREVIA ? pend('CNPJ') : '');

    // I: marcas
    var mc = $('#marcas-lista');
    if (mc) {
      var m = (L.marcas || []).map(function (x) { return '<span class="sticker">' + esc(x.nome) + (x.quemE ? ' <small>' + esc(x.quemE) + '</small>' : '') + '</span>'; }).join('');
      if (PREVIA) m += (L.marcasAConfirmar || []).map(function (n) { return '<span class="sticker">' + esc(n) + ' ' + pend('marca') + '</span>'; }).join('');
      mc.innerHTML = m;
    }

    // J: depoimentos
    var sc = $('#clientes');
    if (sc) {
      if (!L.depoimentosAutorizados && !PREVIA) sc.hidden = true;
      else {
        $('#depoimentos').innerHTML = (L.depoimentos || []).map(function (t) {
          return '<figure class="depo" style="margin:0"><span class="depo__fita" aria-hidden="true"></span><p>' + esc(t) + '</p></figure>';
        }).join('');
        var ad = $('#depo-aviso'); if (ad) ad.innerHTML = L.depoimentosAutorizados ? '' : pend('autorização das clientes');
      }
    }

    // K: nova cereja
    var nc = $('#js-nova'); if (nc) nc.innerHTML = val('novaCereja', 'o que é a nova Cereja');

    // L: dúvidas
    var fq = $('#faq');
    if (fq) {
      var itens = [
        { q: 'É original?', a: 'Sim. Tudo original, lacrado, com lote e validade.' + (tem('conferencia') ? ' ' + esc(L.conferencia) : '') },
        { q: 'Como eu pago?', k: 'pagamento', rot: 'forma de pagamento' },
        { q: 'Tem pedido mínimo?', k: 'pedidoMinimo', rot: 'pedido mínimo' },
        { q: 'Quando chega?', k: 'prazo', rot: 'prazo' },
        { q: 'Não sei meu tom.', a: L.ajudaTom === false
            ? 'Na loja você testa com palitinho. Pelo WhatsApp, ' + (tem('ajudaTomTexto') ? esc(L.ajudaTomTexto) : pend('como a equipe ajuda'))
            : 'Manda uma foto do rosto na luz do dia no WhatsApp que a gente te ajuda a escolher. Na loja você testa com palitinho.',
          link: L.ajudaTom !== false },
        { q: 'Chegou quebrado ou vazando?', a: 'Manda uma foto no WhatsApp ' + (tem('politicaTroca') ? esc(L.politicaTroca) : 'que a gente resolve.') },
        { q: 'Vocês enviam pro interior?', a: 'Hoje enviamos pra Oiapoque. Mora em outra cidade? Chama no WhatsApp que a gente vê se dá.' },
        { q: 'Posso retirar na loja?', a: 'Pode. Pede pelo WhatsApp e passa aqui pra buscar.', retirada: true }
      ];
      fq.innerHTML = itens.map(function (it) {
        var a = it.a != null ? it.a : (tem(it.k) ? esc(L[it.k]) : pend(it.rot));
        if (it.k && !tem(it.k) && !PREVIA) return '';
        var extra = it.link ? ' <a class="link" data-wa-tom href="#">Me ajuda a achar meu tom</a>' : (it.retirada ? ' <a class="link" data-wa="retirada" href="#">Quero retirar</a>' : '');
        return '<details><summary>' + esc(it.q) + '</summary><div class="resp">' + a + extra + '</div></details>';
      }).join('');
      $$('[data-wa-tom]', fq).forEach(function (a) {
        a.href = wa('Oi, Cereja! Quero ajuda pra achar meu tom. Posso mandar uma foto?'); a.target = '_blank'; a.rel = 'noopener';
      });
    }

    // sinaliza o que ainda falta, no modo prévia
    var av = $('#aviso-previa');
    if (av) {
      var faltam = ['horario', 'prazo', 'pedidoMinimo', 'pagamento', 'politicaTroca', 'oiapoque', 'cnpj', 'novaCereja'].filter(function (k) { return !tem(k); });
      var inativos = PROD.filter(function (p) { return !p.ativo; }).length;
      av.hidden = !PREVIA;
      av.innerHTML = 'Prévia para a cliente: ' + faltam.length + ' informações da loja' + (inativos ? ' e ' + inativos + ' produtos' : '') + ' esperam confirmação. Os itens marcados "a confirmar" somem do site quando o modo prévia for desligado.';
    }
  }

  function renderCatalogo() {
    var grade = $('#grade-catalogo'); if (!grade) return;
    var q = new URLSearchParams(location.search);
    var estado = { cat: q.get('cat') || '', marca: q.get('marca') || '', faixa: q.get('faixa') || '', busca: q.get('q') || '' };
    var ORDEM = ['Lábios', 'Olhos', 'Rosto', 'Cuidados', 'Acessórios'];
    var ativos = PROD.filter(function (p) { return p.ativo && p.preco != null; }).sort(function (a, b) {
      return (ORDEM.indexOf(a.categoria) - ORDEM.indexOf(b.categoria)) || a.nome.localeCompare(b.nome, 'pt-BR') || ((a.modelo || 0) - (b.modelo || 0));
    });
    var cats = ['Lábios', 'Olhos', 'Rosto', 'Cuidados', 'Acessórios'].filter(function (c) { return ativos.some(function (p) { return p.categoria === c; }); });
    var marcas = Array.from(new Set(ativos.map(function (p) { return p.marca; }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    var faixas = [{ v: '10', t: 'R$ 10' }, { v: '15', t: 'Até R$ 15' }, { v: '25', t: 'Até R$ 25' }];

    function pilulas(grupo, itens) {
      return itens.map(function (i) {
        var v = typeof i === 'string' ? i : i.v, t = typeof i === 'string' ? i : i.t;
        return '<button type="button" class="pill" data-f="' + grupo + '" data-v="' + esc(v) + '" aria-pressed="' + (estado[grupo] === v ? 'true' : 'false') + '">' + esc(t) + '</button>';
      }).join('');
    }
    $('#filtro-cat').innerHTML = pilulas('cat', cats);
    $('#filtro-faixa').innerHTML = pilulas('faixa', faixas);
    $('#filtro-marca').innerHTML = '<option value="">Todas as marcas</option>' + marcas.map(function (m) { return '<option' + (estado.marca === m ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
    $('#busca').value = estado.busca;
    var slot = $('#slot-bairro-c'); if (slot) slot.innerHTML = seletorBairroHTML('bairro-c');

    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function filtrar() {
      var termos = norm(estado.busca).split(/\s+/).filter(Boolean);
      var lista = ativos.filter(function (p) {
        if (estado.cat && p.categoria !== estado.cat) return false;
        if (estado.marca && p.marca !== estado.marca) return false;
        if (estado.faixa === '10' && !(p.preco === 10)) return false;
        if (estado.faixa === '15' && !(p.preco <= 15)) return false;
        if (estado.faixa === '25' && !(p.preco <= 25)) return false;
        if (termos.length) { var txt = norm(p.nome + ' ' + p.marca + ' ' + p.categoria + ' ' + (p.descricao || '')); if (!termos.every(function (w) { return txt.indexOf(w) > -1; })) return false; }
        return true;
      });
      grade.innerHTML = lista.map(function (p) { return cardHTML(p, 'cat'); }).join('');
      $('#vazio').hidden = lista.length > 0;
      $('#contagem').textContent = lista.length + (lista.length === 1 ? ' produtinho' : ' produtinhos');
      var qs = new URLSearchParams(location.search);
      ['cat', 'marca', 'faixa'].forEach(function (k) { if (estado[k]) qs.set(k, estado[k]); else qs.delete(k); });
      if (estado.busca) qs.set('q', estado.busca); else qs.delete('q');
      try { history.replaceState(null, '', location.pathname + (String(qs) ? '?' + qs : '') + location.hash); } catch (e) { /* file:// ou limite do navegador */ }
      atualizar();
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-f]'); if (!b) return;
      var g = b.getAttribute('data-f'), v = b.getAttribute('data-v');
      estado[g] = estado[g] === v ? '' : v;
      $$('[data-f="' + g + '"]').forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-v') === estado[g] ? 'true' : 'false'); });
      filtrar();
    });
    $('#filtro-marca').addEventListener('change', function (e) { estado.marca = e.target.value; filtrar(); });
    $('#busca').addEventListener('input', function (e) { estado.busca = e.target.value; filtrar(); });
    var av = $('#aviso-previa');
    if (av) { var n = PROD.filter(function (p) { return !p.ativo; }).length; av.hidden = !PREVIA || !n; av.textContent = 'Prévia: ' + n + ' produtos ainda esperam preço ou confirmação da cliente e por isso não aparecem aqui.'; }
    filtrar();
  }

  function renderProduto() {
    var raiz = $('#produto-raiz'); if (!raiz) return;
    var id = new URLSearchParams(location.search).get('id');
    var p = byId[id];
    if (!p || !p.ativo || p.preco == null) {
      raiz.innerHTML = '<p class="vazio">Esse produtinho não está na vitrine agora. <a class="link" href="produtos.html">Ver todos os produtinhos</a> ou <a class="link" data-wa="geral" href="#">perguntar no WhatsApp</a>.</p>';
      atualizar(); return;
    }
    document.title = p.nome + (p.modelo ? ', modelo ' + p.modelo : '') + (p.marca ? ' | ' + p.marca : '') + ' | Cereja Make';
    var tons = (p.tons || []).map(function (t) { return '<button type="button" class="pill" data-tom="' + esc(t) + '" data-tom-id="' + esc(p.id) + '" aria-pressed="false">' + esc(t) + '</button>'; }).join('');
    var det = (p.detalhes || []).map(function (t) { return '<span class="sticker sticker--peq">' + esc(t) + '</span>'; }).join('');
    var rel = ativosRel(p);
    var esg = p.estoque === 'esgotado';
    raiz.innerHTML =
      '<a class="volta" href="produtos.html">&larr; Voltar pros produtinhos</a>' +
      '<div class="produto"><div class="produto__foto">' + (p.imagem ? '<img width="1000" height="1250" src="' + esc(p.imagem) + '" alt="' + esc(p.nome + (p.marca ? ', ' + p.marca : '') + (p.modelo ? ', modelo ' + p.modelo : '')) + '">' : '<div class="card__foto--vazia" style="height:100%">' + ico('i-cereja') + '</div>') + '</div>' +
      '<div class="produto__info"><div>' + ((p.marca || p.modelo) ? '<div class="kicker">' + esc(p.marca || '') + (p.marca && p.modelo ? ' · ' : '') + (p.modelo ? 'modelo ' + p.modelo : '') + '</div>' : '') + '<h1>' + esc(p.nome) + '</h1></div>' +
      '<div class="preco">' + precoTxt(p) + '</div>' +
      '<label class="campo" for="bairro-p">Seu bairro' + seletorBairroHTML('bairro-p') + '</label>' +
      '<div class="taxa-linha js-entrega"></div>' +
      (p.descricao ? '<p>' + esc(p.descricao) + '</p>' : '') +
      (det ? '<div class="tons" aria-label="Detalhes">' + det + '</div>' : '') +
      (tons ? '<div><div class="linha-mono" style="margin-bottom:8px">Escolha o tom ou a versão</div><div class="tons" role="group" aria-label="Tons e versões">' + tons + '</div></div>' : '') +
      (esg ? '<a class="btn btn--acento" data-wa-avisa="' + esc(p.id) + '" href="#">Me avisa quando voltar</a>'
        : '<a class="btn btn--acento" data-wa-produto="' + esc(p.id) + '" href="#">' + ico('i-wa') + 'Pedir no WhatsApp</a>' +
          '<button type="button" class="pill pill--sacola" data-add="' + esc(p.id) + '">' + ico('i-sacola') + '+ Sacola</button>') +
      '<div class="linha-mono">Pagamento: ' + (tem('pagamento') ? esc(L.pagamento) : (PREVIA ? 'a confirmar' : '')) + '</div>' +
      (p.swatch ? '<div class="produto__foto" style="aspect-ratio:auto"><img src="' + esc(p.swatch) + '" alt="Cor de ' + esc(p.nome) + ' aplicada"></div>'
        : ((p.tons || []).length ? '<a class="link" data-wa-swatch="' + esc(p.id) + '" href="#">Quer ver a cor de perto? Pede um swatch no WhatsApp</a>' : '')) +
      ((p.tons || []).length ? '<a class="link" data-wa-tom2="' + esc(p.id) + '" href="#">Me ajuda a achar meu tom</a>' : '') +
      '<p class="linha-mono">Original, lacrado, com lote e validade.</p></div></div>' +
      (rel.length ? '<section class="relacionados" aria-label="Relacionados"><h2 style="font-size:1.8rem">Mais ' + esc(p.categoria.toLowerCase()) + '</h2><div class="grade">' + rel.map(function (r) { return cardHTML(r, 'rel'); }).join('') + '</div></section>' : '');
    var ref = document.referrer;
    if (ref.indexOf(location.origin + '/') === 0 && /\/produtos\.html(\?|$)/.test(ref)) $('.volta', raiz).href = ref;
    $$('[data-wa-swatch]').forEach(function (a) { a.href = wa('Oi, Cereja! Pode me mandar um swatch de ' + nomeMsg(p) + (tomEscolhido[p.id] ? ' (' + tomEscolhido[p.id] + ')' : '') + '?'); a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-wa-tom2]').forEach(function (a) { a.href = wa('Oi, Cereja! Quero ajuda pra achar meu tom de ' + nomeMsg(p) + '. Posso mandar uma foto?'); a.target = '_blank'; a.rel = 'noopener'; });
    atualizar();
  }
  function ativosRel(p) {
    return PROD.filter(function (x) { return x.ativo && x.preco != null && x.id !== p.id && x.categoria === p.categoria; }).slice(0, 4);
  }

  /* ---------- início ---------- */
  function iniciar() {
    montarChrome();
    renderHome();
    renderCatalogo();
    renderProduto();
    atualizar();
    cabecalho();
    flutuante();
    heroFora();
    glitter();
    caule();
    observarEntradas();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
