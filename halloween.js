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

    decorarPestanas();

    // Aviso de que es una vista previa, con salida.
    if (preview) {
      var chip = document.createElement('div');
      chip.className = 'hw-chip';
      chip.innerHTML = '🎃 Vista previa · <a href="' + location.pathname + '">quitar</a>';
      document.body.appendChild(chip);
    }

  }

  /* ---------- el resto de las pestañas ---------- */

  // Telaraña de esquina, dibujada: hilos que salen de la esquina y vueltas
  // que cuelgan un poco entre hilo e hilo.
  function telarana() {
    var ang = [3, 24, 46, 67, 87].map(function (g) { return g * Math.PI / 180; });
    var d = '';
    ang.forEach(function (a) { d += 'M0 0L' + (130 * Math.cos(a)).toFixed(1) + ' ' + (130 * Math.sin(a)).toFixed(1); });
    [24, 46, 68, 90, 112].forEach(function (r) {
      var pts = ang.map(function (a) { return [r * Math.cos(a), r * Math.sin(a)]; });
      d += 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
      for (var i = 1; i < pts.length; i++) {
        var mx = (pts[i - 1][0] + pts[i][0]) / 2 * 0.86, my = (pts[i - 1][1] + pts[i][1]) / 2 * 0.86;
        d += 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
      }
    });
    return '<svg viewBox="0 0 130 130" aria-hidden="true"><path d="' + d +
      '" fill="none" stroke="rgba(236,228,255,.5)" stroke-width="1.1" stroke-linecap="round"/></svg>';
  }

  var ARANA = '<svg viewBox="0 0 40 130" aria-hidden="true">' +
    '<line x1="20" y1="0" x2="20" y2="104" stroke="rgba(236,228,255,.6)" stroke-width="1"/>' +
    '<g fill="#3B2160" stroke="#3B2160" stroke-linecap="round"><ellipse cx="20" cy="114" rx="7" ry="8.5"/><circle cx="20" cy="104" r="4.8"/>' +
    '<path fill="none" stroke-width="1.7" d="M14 109L5 102L1 108M14 113L3 113L0 120M14 118L5 122L3 129M26 109L35 102L39 108M26 113L37 113L40 120M26 118L35 122L37 129"/></g>' +
    '<circle cx="18.2" cy="103.4" r="1.1" fill="#FF7A1A"/><circle cx="21.8" cy="103.4" r="1.1" fill="#FF7A1A"/></svg>';

  var FANTASMA = '<svg viewBox="0 0 60 70" aria-hidden="true">' +
    '<path fill="rgba(246,242,255,.93)" d="M30 3C15 3 6 15 6 30v34l8-7 8 7 8-7 8 7 8-7 8 7V30C54 15 45 3 30 3z"/>' +
    '<ellipse cx="22" cy="28" rx="4" ry="6" fill="#1B1024"/><ellipse cx="38" cy="28" rx="4" ry="6" fill="#1B1024"/>' +
    '<ellipse cx="30" cy="43" rx="4.5" ry="3.6" fill="#1B1024"/></svg>';

  // Dulce envuelto: cuerpo con rayas y las dos puntas torcidas del papel.
  function dulce(c1, c2) {
    return '<svg viewBox="0 0 84 36" aria-hidden="true">' +
      '<path fill="' + c1 + '" d="M2 5L22 14V22L2 31L9 18Z"/><path fill="' + c1 + '" d="M82 5L62 14V22L82 31L75 18Z"/>' +
      '<path fill="rgba(0,0,0,.18)" d="M9 18L22 14V22Z"/><path fill="rgba(0,0,0,.18)" d="M75 18L62 14V22Z"/>' +
      '<rect x="19" y="7" width="46" height="22" rx="11" fill="' + c1 + '"/>' +
      '<path d="M31 8v20M42 8v20M53 8v20" stroke="' + c2 + '" stroke-width="4.5" opacity=".75"/>' +
      '<ellipse cx="34" cy="12.5" rx="9" ry="2.4" fill="#fff" opacity=".35"/></svg>';
  }

  var cssDeco = [
    '.hw-sec{position:relative;}',
    '.hw-sec > .wrap{position:relative;z-index:1;}',
    '.hw-deco{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;}',
    '.hw-web{position:absolute;top:0;width:clamp(84px,13vw,150px);}',
    '.hw-web svg,.hw-arana svg,.hw-fantasma svg,.hw-dulce svg{display:block;width:100%;height:auto;}',
    '.hw-web.l{left:0;}.hw-web.r{right:0;transform:scaleX(-1);}',
    '@keyframes hwBob{0%,100%{transform:translateY(-6px)}50%{transform:translateY(22px)}}',
    '.hw-arana{position:absolute;top:-20px;width:30px;animation:hwBob 4.5s ease-in-out infinite;',
    'filter:drop-shadow(0 0 6px rgba(255,122,26,.55));}',
    '.hw-sec .hw-bat{color:#3B2160;filter:drop-shadow(0 0 7px rgba(255,122,26,.6));}',
    '@keyframes hwFloat{0%,100%{transform:translateY(0) rotate(-5deg)}50%{transform:translateY(-14px) rotate(5deg)}}',
    '.hw-fantasma{position:absolute;width:clamp(40px,5vw,60px);opacity:.88;animation:hwFloat 5s ease-in-out infinite;',
    'filter:drop-shadow(0 0 14px rgba(155,93,229,.55));}',
    '.hw-mapa{position:relative;}',
    '.hw-dulce{position:absolute;width:clamp(46px,6vw,64px);z-index:3;pointer-events:none;',
    'filter:drop-shadow(0 3px 6px rgba(0,0,0,.5));}',
    '.hw-review-web{position:absolute;top:0;right:0;width:56px;transform:scaleX(-1);opacity:.7;pointer-events:none;}',
    '.hw-review-web svg{display:block;width:100%;height:auto;}',
    '@media (max-width:640px){.hw-fantasma{width:36px}.hw-web{width:78px}}',
    '@media (prefers-reduced-motion:reduce){.hw-arana,.hw-fantasma{animation:none}}'
  ].join('');

  function capa(panel) {
    var sec = document.querySelector('[data-tab-panel="' + panel + '"] .section');
    if (!sec) return null;
    sec.classList.add('hw-sec');
    var deco = document.createElement('div');
    deco.className = 'hw-deco';
    deco.setAttribute('aria-hidden', 'true');
    deco.innerHTML = '<div class="hw-web l">' + telarana() + '</div><div class="hw-web r">' + telarana() + '</div>';
    sec.insertBefore(deco, sec.firstChild);
    return deco;
  }

  function pieza(deco, clase, svg, estilo) {
    var el = document.createElement('div');
    el.className = clase;
    el.style.cssText = estilo || '';
    el.innerHTML = svg;
    deco.appendChild(el);
    return el;
  }

  function decorarPestanas() {
    var st = document.createElement('style');
    st.id = 'hw-deco-styles';
    st.textContent = cssDeco;
    document.head.appendChild(st);

    // Nosotros y Carta: telarañas en las esquinas y un par de murciélagos.
    ['nosotros', 'carta'].forEach(function (p, i) {
      var d = capa(p);
      if (!d) return;
      pieza(d, 'hw-bat', BAT, 'left:' + (i ? 78 : 16) + '%;top:' + (i ? 60 : 90) + 'px;--d:15s');
      pieza(d, 'hw-bat', BAT, 'left:' + (i ? 12 : 82) + '%;top:' + (i ? 140 : 40) + 'px;--d:12s;animation-delay:-4s');
    });

    // Reseñas: fantasmas flotando y telarañas chicas en cada tarjeta.
    var dr = capa('resenas');
    if (dr) {
      pieza(dr, 'hw-fantasma', FANTASMA, 'right:5%;top:120px');
      pieza(dr, 'hw-fantasma', FANTASMA, 'left:4%;bottom:60px;animation-delay:-2.5s');
      Array.prototype.forEach.call(document.querySelectorAll('[data-tab-panel="resenas"] .review-card'), function (c) {
        if (getComputedStyle(c).position === 'static') c.style.position = 'relative';
        var w = document.createElement('div');
        w.className = 'hw-review-web';
        w.setAttribute('aria-hidden', 'true');
        w.innerHTML = telarana();
        c.appendChild(w);
      });
    }

    // Redes: arañas colgando de su hilo.
    var dn = capa('redes');
    if (dn) {
      pieza(dn, 'hw-arana', ARANA, 'right:10%');
      pieza(dn, 'hw-arana', ARANA, 'left:14%;animation-delay:-2s;animation-duration:5.5s');
    }

    // Visítanos: dulces envueltos alrededor del mapa, como caídos de una bolsa.
    capa('visitanos');
    var mapa = document.querySelector('[data-tab-panel="visitanos"] .map-frame');
    if (mapa) {
      mapa.classList.add('hw-mapa');
      [
        ['#FF7A1A', '#FFE08A', 'top:14px;left:14px;transform:rotate(-18deg)'],
        ['#9B5DE5', '#F4E9FF', 'top:18px;right:16px;transform:rotate(22deg)'],
        ['#3FAE5A', '#E6FFD9', 'bottom:22px;left:18px;transform:rotate(12deg)'],
        ['#E0457B', '#FFE0EC', 'bottom:16px;right:20px;transform:rotate(-26deg)'],
        ['#FFB23F', '#7A3B00', 'bottom:60px;right:74px;transform:rotate(40deg) scale(.8)']
      ].forEach(function (c) {
        var el = document.createElement('div');
        el.className = 'hw-dulce';
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = c[2];
        el.innerHTML = dulce(c[0], c[1]);
        mapa.appendChild(el);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
