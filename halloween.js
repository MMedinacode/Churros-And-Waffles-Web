/* ============================================================
   HALLOWEEN — propuesta de temporada para Churros and Waffles
   ============================================================
   Se acopla a la página sin tocar su render: cambia el acento a naranja
   calabaza y morado, pone murciélagos y calabazas en la portada, un
   letrero de temporada y una tarjeta «Especial Halloween» arriba de la
   carta.

   Cuándo se ve:
   - Vista previa: agregando ?halloween al link. Así se le muestra al
     local sin cambiar la página que ya conocen.
   - En serio: window.HALLOWEEN = { auto:true, desde:'2026-10-01',
     hasta:'2026-10-31', productos:[{nombre:'…', precio:'$…'}] }.
     Pasado «hasta» se apaga solo: la página nunca queda disfrazada en
     noviembre.

   Los productos de Halloween NO se inventan: los define el local. Sin
   productos, la tarjeta de la carta sólo aparece en la vista previa, y
   dice que ahí van los suyos.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.HALLOWEEN || {};
  var preview = /[?&]halloween\b/.test(location.search);

  function enFecha() {
    if (!CFG.auto || !CFG.desde || !CFG.hasta) return false;
    var hoy = new Date().toISOString().slice(0, 10);
    return hoy >= CFG.desde && hoy <= CFG.hasta;
  }
  if (!preview && !enFecha()) return;

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  var BAT = '<svg viewBox="0 0 64 28" aria-hidden="true"><path fill="currentColor" d="M32 9c1.6-3 3-4 3-4l.8 3.6c1.8-.4 3.4.2 4.6 1.6C45 5 52 2.5 64 5c-6 2.2-8.6 6.3-9 11-3.3-2-7-2.2-10.2.3-1.3-1.8-2.3-2-3.8-1.5L32 27l-9-12.2c-1.5-.5-2.5-.3-3.8 1.5-3.2-2.5-6.9-2.3-10.2-.3-.4-4.7-3-8.8-9-11 12-2.5 19 0 23.6 5.2 1.2-1.4 2.8-2 4.6-1.6L29 5s1.4 1 3 4z"/></svg>';
  var PUMPKIN = '<svg viewBox="0 0 64 60" aria-hidden="true">' +
    '<path fill="#5B7F2A" d="M30 12c0-5 2-9 6-11l2 3c-3 1.5-4 4-4 8z"/>' +
    '<ellipse cx="20" cy="36" rx="16" ry="21" fill="#E8661A"/><ellipse cx="44" cy="36" rx="16" ry="21" fill="#E8661A"/>' +
    '<ellipse cx="32" cy="36" rx="15" ry="22" fill="#FF7A1A"/>' +
    '<path fill="#2A1400" d="M21 30l6 5h-8zM43 30l2 5h-8zM18 43c6 6 22 6 28 0l-4 1-2 3-3-2-3 3-3-3-3 2-2-3z"/></svg>';

  var css = [
    ':root{--acento:#FF7A1A;--acento-osc:#D95F00;--segundo:#9B5DE5;}',
    '.hw-sky{position:absolute;inset:0;pointer-events:none;z-index:2;overflow:hidden;}',
    '.hw-bat{position:absolute;width:46px;color:#0E0B14;opacity:.85;filter:drop-shadow(0 0 6px rgba(255,122,26,.45));}',
    '.hw-bat svg,.hw-pump svg{display:block;width:100%;height:auto;}',
    '@keyframes hwFly{0%{transform:translate(0,0) scale(1)}25%{transform:translate(-40px,-18px) scale(.94)}',
    '50%{transform:translate(-10px,-34px) scale(1.04)}75%{transform:translate(28px,-14px) scale(.96)}100%{transform:translate(0,0) scale(1)}}',
    '@keyframes hwFlap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(.55)}}',
    '.hw-bat{animation:hwFly var(--d,14s) ease-in-out infinite;}',
    '.hw-bat svg{animation:hwFlap .5s ease-in-out infinite;transform-origin:50% 40%;}',
    '.hw-pump{position:absolute;bottom:14px;width:clamp(54px,8vw,86px);z-index:2;pointer-events:none;',
    'filter:drop-shadow(0 0 18px rgba(255,122,26,.55));}',
    '@keyframes hwGlow{0%,100%{filter:drop-shadow(0 0 14px rgba(255,122,26,.45))}50%{filter:drop-shadow(0 0 26px rgba(255,122,26,.8))}}',
    '.hw-pump{animation:hwGlow 3.2s ease-in-out infinite;}',
    '.hw-cartel{display:inline-flex;align-items:center;gap:8px;margin:0 auto 16px;padding:7px 16px;border-radius:999px;',
    'background:rgba(20,10,30,.72);border:1px solid rgba(255,122,26,.7);color:#FFD9B8;font-weight:700;font-size:.92rem;',
    'letter-spacing:.02em;box-shadow:0 0 22px rgba(155,93,229,.35);}',
    '.hw-carta{display:flex;gap:18px;align-items:center;margin:0 0 26px;padding:22px 24px;border-radius:var(--radio-g,24px);',
    'background:linear-gradient(135deg,rgba(255,122,26,.16),rgba(155,93,229,.18));border:1px solid rgba(255,122,26,.5);}',
    '.hw-carta .hw-pump{position:static;flex:0 0 auto;width:64px;}',
    '.hw-carta h3{margin:0 0 4px;font-size:1.6rem;color:#FFB070;}',
    '.hw-carta p{margin:0;color:var(--tinta-suave,#bbb);font-size:.95rem;line-height:1.5;}',
    '.hw-carta ul{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:6px;}',
    '.hw-carta li{display:flex;justify-content:space-between;gap:12px;font-weight:600;color:var(--tinta,#fff);}',
    '.hw-chip{position:fixed;top:12px;right:12px;z-index:99990;display:flex;gap:10px;align-items:center;padding:8px 12px;',
    'border-radius:12px;background:#1B1024;border:1px solid #9B5DE5;color:#EBDDFB;font:600 12.5px/1.2 var(--font-body,sans-serif);',
    'box-shadow:0 6px 20px rgba(0,0,0,.4);}',
    '.hw-chip a{color:#FFB070;}',
    '@media (max-width:640px){.hw-bat{width:34px}.hw-carta{padding:18px;gap:14px}.hw-carta .hw-pump{width:50px}.hw-chip{top:auto;bottom:14px;left:10px;right:auto;max-width:calc(100% - 150px)}}',
    '@media (prefers-reduced-motion:reduce){.hw-bat,.hw-bat svg,.hw-pump{animation:none}}'
  ].join('');

  function start() {
    var st = document.createElement('style');
    st.id = 'hw-styles';
    st.textContent = css;
    document.head.appendChild(st);

    // Portada: murciélagos, dos calabazas y el letrero.
    var hero = document.querySelector('.hero');
    if (hero) {
      var sky = document.createElement('div');
      sky.className = 'hw-sky';
      sky.setAttribute('aria-hidden', 'true');
      var pos = [[12, 18, 13], [78, 12, 16], [62, 30, 12], [24, 40, 18], [88, 46, 15]];
      pos.forEach(function (p, i) {
        var b = document.createElement('div');
        b.className = 'hw-bat';
        b.style.left = p[0] + '%';
        b.style.top = p[1] + '%';
        b.style.setProperty('--d', p[2] + 's');
        b.style.animationDelay = (-i * 2.3) + 's';
        b.innerHTML = BAT;
        sky.appendChild(b);
      });
      ['left:4%', 'right:4%'].forEach(function (lado) {
        var pk = document.createElement('div');
        pk.className = 'hw-pump';
        pk.style.cssText = lado;
        pk.innerHTML = PUMPKIN;
        sky.appendChild(pk);
      });
      hero.appendChild(sky);

      var content = hero.querySelector('.hero-content');
      if (content) {
        var cartel = document.createElement('p');
        cartel.className = 'hw-cartel';
        cartel.textContent = '🎃 Este octubre, Halloween en Churros and Waffles';
        content.insertBefore(cartel, content.firstChild);
      }
    }

    // Carta: tarjeta de temporada, con los productos del local si los hay.
    var productos = CFG.productos || [];
    var panels = document.getElementById('menuPanels');
    if (panels && (productos.length || preview)) {
      var card = document.createElement('div');
      card.className = 'hw-carta';
      var cuerpo = productos.length
        ? '<p>Sólo durante octubre.</p><ul>' + productos.map(function (x) {
            return '<li><span>' + esc(x.nombre) + '</span><span>' + esc(x.precio || '') + '</span></li>';
          }).join('') + '</ul>'
        : '<p>Aquí van sus productos de Halloween: el churro, el waffle o el milkshake de temporada que ustedes elijan, con su foto y su precio.</p>';
      card.innerHTML = '<div class="hw-pump">' + PUMPKIN + '</div><div><h3>Especial Halloween</h3>' + cuerpo + '</div>';
      panels.parentNode.insertBefore(card, panels.previousElementSibling || panels);
    }

    // Aviso de que es una vista previa, con salida.
    if (preview) {
      var chip = document.createElement('div');
      chip.className = 'hw-chip';
      chip.innerHTML = '🎃 Vista previa de Halloween · <a href="' + location.pathname + '">ver la normal</a>';
      document.body.appendChild(chip);
    }

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
