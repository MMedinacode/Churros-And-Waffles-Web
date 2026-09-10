/* ============================================================
   VIDA — módulo reusable del portafolio de cafeterías
   ============================================================
   Los sitios cargaban, hacían su scroll-reveal, y después quedaban
   completamente quietos. Este módulo les agrega movimiento ambiente
   y micro-interacciones, SIN tocar el CSS ni el JS de cada proyecto.

   Qué agrega:
     1. Ken Burns muy lento en la foto del hero (zoom/paneo apenas
        perceptible) — da vida desde el primer segundo.
     2. Latido en el indicador "Abierto ahora" — solo cuando está
        abierto de verdad; si el local está cerrado, no late.
     3. Levantada + sombra al pasar el mouse por tarjetas y productos.
     4. Subrayado que crece en los links del menú.
     5. Hundido al presionar botones.
     6. Escala suave en el widget flotante de redes.

   Reglas de convivencia:
     - Antes de agregar un efecto de hover revisa las hojas de estilo
       del propio sitio: si ese elemento YA tiene un :hover con
       transform, no le pone nada encima.
     - Respeta `prefers-reduced-motion`: con esa preferencia activada
       se apagan todas las animaciones continuas.
     - Hereda el color de acento del sitio en runtime.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.VIDA_CONFIG || {};

  /* ---------- ¿el usuario pidió menos movimiento? ---------- */
  var quieto = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- paleta del sitio ---------- */
  function acento() {
    var probes = ['.btn-solid', '.menu-tab.active', '.price', '.btn',
      '.cta-primary', '.badge'];
    for (var i = 0; i < probes.length; i++) {
      var el = document.querySelector(probes[i]);
      if (!el) continue;
      var cs = getComputedStyle(el);
      var bg = cs.backgroundColor;
      if (bg && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bg) && bg !== 'transparent') return bg;
      if (cs.color) return cs.color;
    }
    return '#8a6a43';
  }

  /* ---------- ¿este selector ya tiene un :hover con transform? ----------
     Se recorren las hojas de estilo propias del sitio. Si alguna regla
     :hover que calce con el elemento ya mueve algo, no se le agrega el
     efecto para no pelear con el diseño original. */
  // Los selectores se recogen UNA sola vez y se cachean: recorrer todas las
  // hojas de estilo por cada elemento hacía que la página se colgara en las
  // cartas grandes (180+ productos).
  var hoversPropios = null;

  function recogerHovers() {
    if (hoversPropios) return hoversPropios;
    hoversPropios = [];
    var hojas = document.styleSheets;
    for (var i = 0; i < hojas.length; i++) {
      var reglas;
      try { reglas = hojas[i].cssRules; } catch (e) { continue; } // hoja externa
      if (!reglas) continue;
      for (var j = 0; j < reglas.length; j++) {
        var r = reglas[j];
        if (!r.selectorText || r.selectorText.indexOf(':hover') === -1) continue;
        if (!/transform|translate|scale/.test(r.style.cssText || '')) continue;
        r.selectorText.split(',').forEach(function (s) {
          var base = s.replace(/:hover/g, '').trim();
          if (base && base.indexOf('vida-') === -1 && hoversPropios.indexOf(base) === -1) {
            hoversPropios.push(base);
          }
        });
      }
    }
    return hoversPropios;
  }

  function yaTieneHoverPropio(el) {
    var sels = recogerHovers();
    for (var i = 0; i < sels.length; i++) {
      try { if (el.matches(sels[i])) return true; } catch (e) { /* selector raro */ }
    }
    return false;
  }

  /* ---------- estilos ---------- */
  function inyectar(ac) {
    var css = [
      /* 1. Ken Burns del hero: 34s, alternando, casi imperceptible */
      '@keyframes vidaKenBurns{0%{transform:scale(1) translate3d(0,0,0);}',
      '100%{transform:scale(1.07) translate3d(0,-1.2%,0);}}',
      '.vida-kenburns{animation:vidaKenBurns 34s ease-in-out infinite alternate;',
      'will-change:transform;}',
      /* Capas del hero cuando la foto venía como background-image */
      '.vida-bg{position:absolute;inset:0;z-index:0;pointer-events:none;',
      'background-repeat:no-repeat;}',
      '.vida-bg-tinte{z-index:1;}',

      /* 2. Latido del indicador "abierto ahora" */
      '@keyframes vidaLatido{0%{box-shadow:0 0 0 0 currentColor;opacity:1;}',
      '70%{box-shadow:0 0 0 9px transparent;opacity:.85;}',
      '100%{box-shadow:0 0 0 0 transparent;opacity:1;}}',
      '.vida-latido{animation:vidaLatido 2.4s ease-out infinite;}',

      /* 3. Tarjetas y productos: se levantan al pasar el mouse */
      '.vida-lift{transition:transform .22s cubic-bezier(.22,.61,.36,1),',
      'box-shadow .22s ease;}',
      '.vida-lift:hover{transform:translateY(-4px);',
      'box-shadow:0 10px 26px rgba(0,0,0,.13);}',

      /* 4. Subrayado que crece en el menú */
      '.vida-underline{position:relative;}',
      '.vida-underline::after{content:"";position:absolute;left:0;right:0;',
      'bottom:-4px;height:1.5px;background:' + ac + ';transform:scaleX(0);',
      'transform-origin:right;transition:transform .28s cubic-bezier(.22,.61,.36,1);}',
      '.vida-underline:hover::after{transform:scaleX(1);transform-origin:left;}',

      /* 5. Botones: se hunden al presionar */
      '.vida-press{transition:transform .12s ease;}',
      '.vida-press:active{transform:scale(.96);}',

      /* 6. Widget flotante de redes */
      '.vida-float{transition:transform .2s cubic-bezier(.22,.61,.36,1);}',
      '.vida-float:hover{transform:scale(1.13) rotate(-4deg);}',

      /* Preferencia de accesibilidad: se apaga lo que se mueve solo y lo que
         desplaza elementos. Los efectos que responden al mouse se conservan
         (son cortos y los provoca el propio usuario), pero cambiando color y
         sombra en vez de mover cosas de lugar. */
      '@media (prefers-reduced-motion:reduce){',
      '.vida-kenburns,.vida-latido{animation:none!important;}',
      '.vida-lift:hover,.vida-press:active,.vida-float:hover{transform:none!important;}',
      '.vida-underline::after{transform:scaleX(1)!important;opacity:0;',
      'transition:opacity .2s ease;}',
      '.vida-underline:hover::after{opacity:1;}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'vida-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- 1. Ken Burns en la foto del hero ----------
     Dos casos distintos según cómo el sitio puso la foto:

     A) Hay una <img> real → se le aplica el zoom directamente.

     B) La foto está como background-image del hero, normalmente mezclada
        con un degradado en la misma declaración
        (`background-image: linear-gradient(...), url(foto.jpg)`).
        Ahí NO se puede escalar el hero: se llevaría el texto con él. Se
        separa la foto a una capa propia detrás, el degradado a otra capa
        encima, y solo la foto se mueve. El texto queda quieto. */

  // Parte un valor de background-image en sus capas, respetando los
  // paréntesis anidados de rgba()/gradientes.
  function capasDe(valor) {
    var capas = [], prof = 0, actual = '';
    for (var i = 0; i < valor.length; i++) {
      var c = valor[i];
      if (c === '(') prof++;
      else if (c === ')') prof--;
      if (c === ',' && prof === 0) { capas.push(actual.trim()); actual = ''; }
      else actual += c;
    }
    if (actual.trim()) capas.push(actual.trim());
    return capas;
  }

  // El contenedor del hero no siempre se llama ".hero": hay proyectos con
  // .hero-split, .hero-section, etc. Se busca el primer bloque grande de la
  // parte de arriba cuya clase contenga "hero".
  function buscarHero() {
    var directo = document.querySelector('.hero, header.hero, #hero, [data-hero]');
    if (directo) return directo;
    var cands = document.querySelectorAll('[class*="hero"], [id*="hero"]');
    // 1º intento: el bloque grande de arriba.
    for (var i = 0; i < cands.length; i++) {
      var r = cands[i].getBoundingClientRect();
      if (r.width > 400 && r.height > 220) return cands[i];
    }
    // 2º intento: en los SPA por pestañas el hero puede estar en un panel
    // oculto y medir 0. Se acepta el primero que contenga una foto grande.
    for (var j = 0; j < cands.length; j++) {
      var im = cands[j].querySelector('img');
      if (im && im.naturalWidth > 200) return cands[j];
    }
    return null;
  }

  function kenBurns() {
    if (quieto) return 0;
    var hero = buscarHero();
    if (!hero) return 0;
    if (hero.querySelector('.vida-bg')) return 0; // ya aplicado

    // --- Caso A: <img> real dentro del hero ---
    // Se mide por el tamaño INTRÍNSECO (naturalWidth), no por el renderizado:
    // en los sitios SPA el hero vive en el panel "Inicio" y si el visitante
    // llega con otra pestaña activa el rect da 0 y se saltaba el efecto.
    var img = hero.querySelector('.hero-bg img, .hero-media img, .hero-image img, img');
    if (img) {
      if (!img.complete || !img.naturalWidth) {
        // Todavía no carga: se reintenta cuando termine.
        img.addEventListener('load', function () { kenBurns(); }, { once: true });
        return 0;
      }
      if (img.naturalWidth > 200 || img.getBoundingClientRect().width > 200) {
        if (getComputedStyle(img).animationName !== 'none') return 0;
        var cont = img.parentElement || hero;
        if (getComputedStyle(cont).overflow === 'visible') cont.style.overflow = 'hidden';
        img.classList.add('vida-kenburns');
        return 1;
      }
    }

    // --- Caso B: foto como background-image ---
    var nodos = [hero].concat(Array.prototype.slice.call(hero.children));
    for (var i = 0; i < nodos.length; i++) {
      var nodo = nodos[i];
      var cs = getComputedStyle(nodo);
      var bi = cs.backgroundImage;
      if (!bi || bi === 'none' || bi.indexOf('url(') === -1) continue;
      if (cs.animationName !== 'none') continue;

      var fotos = [], tintes = [];
      capasDe(bi).forEach(function (capa) {
        (capa.indexOf('url(') > -1 ? fotos : tintes).push(capa);
      });
      if (!fotos.length) continue;

      if (cs.position === 'static') nodo.style.position = 'relative';
      nodo.style.overflow = 'hidden';

      var foto = document.createElement('div');
      foto.className = 'vida-bg vida-kenburns';
      foto.style.backgroundImage = fotos.join(', ');
      foto.style.backgroundSize = cs.backgroundSize !== 'auto' ? cs.backgroundSize : 'cover';
      foto.style.backgroundPosition = cs.backgroundPosition || 'center';
      nodo.insertBefore(foto, nodo.firstChild);

      if (tintes.length) {
        var tinte = document.createElement('div');
        tinte.className = 'vida-bg vida-bg-tinte';
        tinte.style.backgroundImage = tintes.join(', ');
        nodo.insertBefore(tinte, foto.nextSibling);
      }
      nodo.style.backgroundImage = 'none';

      // El contenido del hero tiene que quedar por encima de las dos capas.
      Array.prototype.forEach.call(nodo.children, function (hijo) {
        if (hijo.classList.contains('vida-bg')) return;
        var hcs = getComputedStyle(hijo);
        if (hcs.position === 'static') hijo.style.position = 'relative';
        if (hcs.zIndex === 'auto') hijo.style.zIndex = '2';
      });
      return 1;
    }
    return 0;
  }

  /* ---------- 2. Latido del indicador abierto/cerrado ----------
     Solo late si el local está ABIERTO de verdad. Cerrado = punto quieto,
     que es lo honesto: el latido comunica "estamos funcionando ahora".
     Se re-evalúa si el sitio cambia la clase del punto (los proyectos la
     recalculan según la hora), así el indicador se enciende solo cuando
     el local abre sin necesidad de recargar. */
  var puntosVigilados = false;

  function estaCerrado(p) {
    return p.classList.contains('closed') || p.classList.contains('cerrado');
  }

  function latido() {
    if (quieto) return 0;
    var puntos = document.querySelectorAll(
      '#statusDot, #statusDot2, .status-dot, .dot-live, [data-status-dot]');
    var n = 0;

    Array.prototype.forEach.call(puntos, function (p) {
      var debeLatir = !estaCerrado(p);
      var yaLate = p.classList.contains('vida-latido');
      // Solo se escribe la clase si el estado REALMENTE cambia: tocar el
      // atributo igual igual dispara una mutación, y el observer de abajo
      // volvería a llamar acá en bucle infinito (colgaba la página).
      if (debeLatir && !yaLate) p.classList.add('vida-latido');
      else if (!debeLatir && yaLate) p.classList.remove('vida-latido');
      if (debeLatir) n++;
    });

    if (!puntosVigilados && puntos.length) {
      puntosVigilados = true;
      var mo = new MutationObserver(function () { latido(); });
      Array.prototype.forEach.call(puntos, function (p) {
        mo.observe(p, { attributes: true, attributeFilter: ['class'] });
      });
    }
    return n;
  }

  /* ---------- 3. Levantada en tarjetas ---------- */
  function levantar() {
    var sel = CFG.cards ||
      '.review-card, .resena-card, .reseña-card, .menu-item, .product-card, ' +
      '.menu-card, .card, .info-card, .contact-box, .feature-card';
    var n = 0;
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
      if (el.dataset.vidaLift) return;
      if (el.closest('.uc-panel, .uc-overlay')) return; // el carrito ya tiene lo suyo
      if (yaTieneHoverPropio(el)) return;
      el.classList.add('vida-lift');
      el.dataset.vidaLift = '1';
      n++;
    });
    return n;
  }

  /* ---------- 4, 5, 6. Micro-interacciones ---------- */
  function micro() {
    var n = 0;
    Array.prototype.forEach.call(
      document.querySelectorAll('.nav-link, .navlink, nav a'), function (el) {
        if (el.dataset.vidaU) return;
        if (yaTieneHoverPropio(el)) return;
        el.classList.add('vida-underline');
        el.dataset.vidaU = '1';
        n++;
      });

    Array.prototype.forEach.call(
      document.querySelectorAll('.btn, button, .menu-tab, .cta'), function (el) {
        if (el.dataset.vidaP) return;
        if (el.closest('.uc-overlay')) return;
        el.classList.add('vida-press');
        el.dataset.vidaP = '1';
        n++;
      });

    Array.prototype.forEach.call(
      document.querySelectorAll(
        '.float-widget a, .float-widget button, .floating a, .social-float a'),
      function (el) {
        if (el.dataset.vidaF) return;
        el.classList.add('vida-float');
        el.dataset.vidaF = '1';
        n++;
      });
    return n;
  }

  /* ---------- arranque ---------- */
  function start() {
    if (document.getElementById('vida-styles')) return;
    inyectar(acento());
    window.__vida = {
      kenburns: kenBurns(), latido: latido(),
      tarjetas: levantar(), micro: micro(), reducido: quieto
    };

    // Gancho de QA: el navegador de pruebas reporta prefers-reduced-motion,
    // así que sin esto no hay forma de comprobar el hero ni el latido.
    // Ignora la preferencia una sola vez, a pedido, desde la consola.
    window.__vidaForzar = function () {
      quieto = false;
      var s = document.getElementById('vida-styles');
      if (s) s.textContent = s.textContent.split('@media (prefers-reduced-motion:reduce)')[0];
      return { kenburns: kenBurns(), latido: latido() };
    };
    // Las cartas por pestañas renderizan al vuelo: se reaplica al cambiar el
    // DOM. Con debounce, porque los otros módulos insertan cientos de nodos
    // de golpe y reaccionar a cada uno congelaba la página.
    var pendiente = null;
    var mo = new MutationObserver(function () {
      if (pendiente) return;
      pendiente = setTimeout(function () {
        pendiente = null;
        levantar(); micro(); latido();
      }, 200);
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 220); });
  } else {
    setTimeout(start, 220);
  }
})();
