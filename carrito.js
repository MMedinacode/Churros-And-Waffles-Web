/* ============================================================
   CARRITO UNIVERSAL — módulo reusable del portafolio de cafeterías
   ============================================================
   Se acopla a cualquier sitio del portafolio SIN tocar su lógica de
   render: detecta los productos ya renderizados en el DOM (.menu-item
   y variantes), les inyecta un botón "+", y arma un panel de pedido
   flotante.

   - Hereda la paleta del sitio automáticamente (lee el color de un
     botón/tab existente en runtime), así no hay que configurar colores
     por proyecto.
   - Funciona con productos CON precio y SIN precio: si algún ítem no
     tiene precio, el total se muestra como "A consultar" en vez de
     inventar un número.
   - El botón de cierre del pedido se configura con window.CARRITO_CONFIG
     antes de cargar este script:
       window.CARRITO_CONFIG = { href: 'https://wa.me/569...', label: 'Pedir por WhatsApp' }
     Si no se configura, busca automáticamente un link wa.me / tel: del
     propio sitio.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.CARRITO_CONFIG || {};
  // Cubre los distintos markups del portafolio: filas simples (.menu-item),
  // tarjetas-botón con foto (.product-card, .menu-card) y variantes.
  var ITEM_SELECTOR = CFG.selector ||
    '.menu-item, .carta-item, .producto-item, .product-card, .menu-card';

  /* ---------- utilidades ---------- */
  function parsePrice(txt) {
    if (!txt) return null;
    // Toma el PRIMER precio del texto (ej. "Simple $2.500 · Doppio $3.400" -> 2500)
    var m = String(txt).replace(/\s/g, '').match(/\$\s*([\d.,]+)/);
    if (!m) return null;
    var n = parseInt(m[1].replace(/[.,]/g, ''), 10);
    return isNaN(n) || n <= 0 ? null : n;
  }

  function money(n) {
    return '$' + n.toLocaleString('es-CL');
  }

  function pickAccent() {
    // Busca un color de acento real del sitio para que el carrito no
    // desentone: primero un botón sólido, después un tab activo, etc.
    var probes = ['.btn-solid', '.btn.btn-solid', '.menu-tab.active', '.btn',
      '.cta-primary', '.boton-principal', '.badge'];
    for (var i = 0; i < probes.length; i++) {
      var el = document.querySelector(probes[i]);
      if (!el) continue;
      var bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bg)) return bg;
      var bc = getComputedStyle(el).borderColor;
      if (bc && bc !== 'transparent' && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bc)) return bc;
    }
    return '#8a6a43';
  }

  function pickSurface() {
    var bg = getComputedStyle(document.body).backgroundColor;
    return (bg && bg !== 'transparent') ? bg : '#ffffff';
  }

  function isDark(rgb) {
    var m = String(rgb).match(/\d+/g);
    if (!m) return false;
    var lum = (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255;
    return lum < 0.5;
  }

  function textoLimpio(el) {
    // Devuelve el texto del elemento SIN los nodos de descripción/precio que
    // algunos sitios anidan dentro del propio nombre (ej. Kila Coffee mete
    // <span class="desc"> dentro de <span class="name">).
    if (!el) return '';
    var clon = el.cloneNode(true);
    Array.prototype.forEach.call(
      clon.querySelectorAll('.desc, .price, .descripcion, .precio, .veg-tag, .badge, .tag'),
      function (n) { n.parentNode.removeChild(n); }
    );
    return clon.textContent.replace(/\s+/g, ' ').trim();
  }

  function findCheckoutLink() {
    if (CFG.href) return { href: CFG.href, label: CFG.label || 'Enviar pedido' };
    var wa = document.querySelector('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (wa) return { href: wa.getAttribute('href'), label: 'Pedir por WhatsApp' };
    var tel = document.querySelector('a[href^="tel:"]');
    if (tel) return { href: tel.getAttribute('href'), label: 'Consultar por teléfono' };
    var ig = document.querySelector('a[href*="instagram.com"]');
    if (ig) return { href: ig.getAttribute('href'), label: 'Consultar por Instagram' };
    return { href: '#', label: 'Consultar' };
  }

  /* ---------- estilos ---------- */
  function injectStyles(accent, surface, onSurface, border) {
    var css = [
      '.uc-add{flex:0 0 auto;width:30px;height:30px;border-radius:50%;border:1.5px solid ' + accent + ';',
      'background:transparent;color:' + accent + ';font-size:17px;line-height:1;cursor:pointer;display:inline-flex;',
      'align-items:center;justify-content:center;transition:transform .12s ease,background .18s ease,color .18s ease;',
      'align-self:center;margin-left:10px;font-family:inherit;padding:0;}',
      '.uc-add:hover{background:' + accent + ';color:' + surface + ';}',
      '.uc-add:active{transform:scale(.85);}',
      '.uc-add.uc-done{background:' + accent + ';color:' + surface + ';}',
      // En tarjetas con foto el "+" flota en la esquina para no romper la grilla
      '.uc-add-card{position:absolute;top:10px;right:10px;margin:0;z-index:5;',
      'background:' + surface + ';box-shadow:0 2px 8px rgba(0,0,0,.22);}',

      '.uc-fab{position:fixed;left:20px;bottom:20px;z-index:100000;width:56px;height:56px;border-radius:50%;',
      'background:' + accent + ';color:' + surface + ';border:none;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.28);',
      'display:none;align-items:center;justify-content:center;transition:transform .2s ease;}',
      '.uc-fab.show{display:flex;}',
      '.uc-fab:hover{transform:scale(1.08);}',
      '.uc-fab:active{transform:scale(.94);}',
      '.uc-fab svg{width:26px;height:26px;}',
      '.uc-count{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;border-radius:11px;',
      'background:' + surface + ';color:' + accent + ';border:2px solid ' + accent + ';font-size:12px;font-weight:700;',
      'display:flex;align-items:center;justify-content:center;padding:0 5px;font-family:inherit;}',

      '.uc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100001;display:none;',
      'align-items:stretch;justify-content:flex-end;}',
      '.uc-overlay.open{display:flex;}',
      '.uc-panel{width:min(400px,100%);background:' + surface + ';color:' + onSurface + ';display:flex;',
      'flex-direction:column;padding:24px;overflow-y:auto;animation:ucIn .28s ease;}',
      '@keyframes ucIn{from{transform:translateX(28px);opacity:0}to{transform:none;opacity:1}}',
      '.uc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;}',
      '.uc-head h3{margin:0;font-size:1.25rem;font-family:inherit;color:' + onSurface + ';}',
      '.uc-x{background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:' + onSurface + ';padding:0 4px;}',
      '.uc-line{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px 0;',
      'border-bottom:1px solid ' + border + ';}',
      '.uc-line-name{font-weight:600;font-size:.95rem;}',
      '.uc-line-price{white-space:nowrap;font-weight:700;color:' + accent + ';font-size:.9rem;}',
      '.uc-qty{display:flex;align-items:center;gap:9px;margin-top:7px;}',
      '.uc-qty button{width:26px;height:26px;border-radius:50%;border:1px solid ' + border + ';background:transparent;',
      'color:' + onSurface + ';cursor:pointer;font-size:15px;line-height:1;font-family:inherit;padding:0;}',
      '.uc-qty button:active{transform:scale(.88);}',
      '.uc-qty span{min-width:18px;text-align:center;font-weight:700;font-size:.92rem;}',
      '.uc-empty{opacity:.65;font-size:.95rem;margin-top:26px;text-align:center;}',
      '.uc-total{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:1.05rem;',
      'padding:16px 0;border-top:2px solid ' + accent + ';margin-top:auto;}',
      '.uc-note{font-size:.78rem;opacity:.7;margin-top:-8px;margin-bottom:10px;line-height:1.45;}',
      '.uc-go{display:block;text-align:center;background:' + accent + ';color:' + surface + ';text-decoration:none;',
      'padding:14px;border-radius:10px;font-weight:700;margin-top:8px;transition:transform .12s ease,filter .2s ease;}',
      '.uc-go:hover{filter:brightness(1.08);} .uc-go:active{transform:scale(.97);}',
      '@media(max-width:640px){.uc-fab{left:14px;bottom:14px;width:50px;height:50px;}.uc-panel{padding:20px;}}',
      '@media (prefers-reduced-motion:reduce){.uc-panel{animation:none}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'uc-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- estado ---------- */
  var cart = [];

  function render() {
    var linesEl = document.getElementById('uc-lines');
    var totalEl = document.getElementById('uc-total');
    var noteEl = document.getElementById('uc-note');
    var countEl = document.getElementById('uc-count');
    var fab = document.getElementById('uc-fab');
    if (!linesEl) return;

    var qty = cart.reduce(function (s, c) { return s + c.qty; }, 0);
    countEl.textContent = qty;
    fab.classList.toggle('show', qty > 0);

    if (!cart.length) {
      linesEl.innerHTML = '';
      var p = document.createElement('p');
      p.className = 'uc-empty';
      p.textContent = 'Todavía no agregaste nada.';
      linesEl.appendChild(p);
      totalEl.textContent = '$0';
      noteEl.textContent = '';
      return;
    }

    linesEl.innerHTML = '';
    var total = 0, faltantes = 0;

    cart.forEach(function (line) {
      if (line.price) { total += line.price * line.qty; } else { faltantes++; }

      var row = document.createElement('div');
      row.className = 'uc-line';

      var left = document.createElement('div');
      var nm = document.createElement('div');
      nm.className = 'uc-line-name';
      nm.textContent = line.name;
      left.appendChild(nm);

      var q = document.createElement('div');
      q.className = 'uc-qty';
      var minus = document.createElement('button');
      minus.type = 'button'; minus.textContent = '−';
      minus.setAttribute('aria-label', 'Quitar uno de ' + line.name);
      minus.addEventListener('click', function () { changeQty(line.name, -1); });
      var num = document.createElement('span');
      num.textContent = line.qty;
      var plus = document.createElement('button');
      plus.type = 'button'; plus.textContent = '+';
      plus.setAttribute('aria-label', 'Agregar uno de ' + line.name);
      plus.addEventListener('click', function () { changeQty(line.name, 1); });
      q.appendChild(minus); q.appendChild(num); q.appendChild(plus);
      left.appendChild(q);

      // Con cantidad > 1 se muestra el subtotal de la línea, no el precio
      // unitario: si no, dos brunchs de $14.900 se leían como "$14.900" al
      // lado del "2" y el total de abajo no cuadraba con lo que se veía.
      var pr = document.createElement('div');
      pr.className = 'uc-line-price';
      if (!line.price) {
        pr.textContent = 'Consultar';
      } else if (line.qty > 1) {
        pr.textContent = money(line.price * line.qty);
        pr.title = money(line.price) + ' c/u';
      } else {
        pr.textContent = money(line.price);
      }

      row.appendChild(left);
      row.appendChild(pr);
      linesEl.appendChild(row);
    });

    if (faltantes && total) {
      totalEl.textContent = money(total) + ' + consultar';
      noteEl.textContent = 'Hay ' + faltantes + ' producto(s) sin precio publicado — el total final se confirma en el local.';
    } else if (faltantes) {
      totalEl.textContent = 'A consultar';
      noteEl.textContent = 'Los precios de estos productos no están publicados — se confirman en el local.';
    } else {
      totalEl.textContent = money(total);
      noteEl.textContent = 'Total referencial según los precios publicados.';
    }
  }

  function addItem(name, price) {
    var found = cart.filter(function (c) { return c.name === name; })[0];
    if (found) { found.qty++; } else { cart.push({ name: name, price: price, qty: 1 }); }
    render();
  }

  function changeQty(name, delta) {
    var line = cart.filter(function (c) { return c.name === name; })[0];
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) cart = cart.filter(function (c) { return c.name !== name; });
    render();
  }

  function toggle(open) {
    document.getElementById('uc-overlay').classList.toggle('open', open);
  }

  /* ---------- construcción de UI ---------- */
  function buildUI(accent, surface) {
    var checkout = findCheckoutLink();

    var fab = document.createElement('button');
    fab.id = 'uc-fab';
    fab.className = 'uc-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'Ver mi pedido');
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
      '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>' +
      '<span class="uc-count" id="uc-count">0</span>';
    fab.addEventListener('click', function () { toggle(true); });
    document.body.appendChild(fab);

    var ov = document.createElement('div');
    ov.id = 'uc-overlay';
    ov.className = 'uc-overlay';
    ov.innerHTML =
      '<div class="uc-panel" role="dialog" aria-label="Tu pedido">' +
      '<div class="uc-head"><h3>Tu pedido</h3>' +
      '<button class="uc-x" id="uc-close" type="button" aria-label="Cerrar">&times;</button></div>' +
      '<div id="uc-lines"></div>' +
      '<div class="uc-total"><span>Total</span><span id="uc-total">$0</span></div>' +
      '<p class="uc-note" id="uc-note"></p>' +
      '<a class="uc-go" id="uc-go" target="_blank" rel="noopener">' + checkout.label + '</a>' +
      '</div>';
    document.body.appendChild(ov);

    document.getElementById('uc-go').setAttribute('href', checkout.href);
    document.getElementById('uc-close').addEventListener('click', function () { toggle(false); });
    ov.addEventListener('click', function (e) { if (e.target === ov) toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  /* ---------- enganche a los productos del sitio ---------- */
  function hookItems() {
    var items = document.querySelectorAll(ITEM_SELECTOR);
    var n = 0;
    Array.prototype.forEach.call(items, function (el) {
      if (el.dataset.ucHooked) return;

      var priceEl = el.querySelector('.price, .menu-item-price, .item-price, .precio, .product-price');

      // Caso ideal: el propio sitio ya expone los datos en data-attributes
      // (ej. Filtra2 usa data-name / data-price) — se usan tal cual.
      var dataName = el.getAttribute('data-name');
      var dataPrice = el.getAttribute('data-price');

      // Nombre: 1) elemento con clase típica  2) primer hijo que no sea el
      // precio ni la descripción  3) el texto del ítem menos el del precio.
      var nameEl = el.querySelector('.name, .menu-item-name, .item-name, .producto-nombre, strong, h3, h4, b');
      var name = dataName ? dataName.trim() : textoLimpio(nameEl);

      if (!name) {
        var kids = Array.prototype.filter.call(el.children, function (c) {
          return c !== priceEl &&
            !/price|precio|desc|thumb|img|foto/i.test(c.className || '') &&
            c.textContent.trim();
        });
        if (kids.length) name = textoLimpio(kids[0]);
      }

      if (!name) {
        var full = (el.textContent || '').trim();
        if (priceEl) full = full.replace(priceEl.textContent.trim(), '');
        name = full.split('\n')[0].trim();
      }

      if (!name) return;
      name = name.replace(/\s+/g, ' ').slice(0, 80);

      var price = parsePrice(dataPrice);
      if (price === null) price = parsePrice(priceEl ? priceEl.textContent : '');
      if (price === null) price = parsePrice(el.textContent);

      // Se usa <span role="button"> y no <button>: varios sitios del
      // portafolio ya envuelven el producto entero en un <button>
      // (Filtra2, Dulces Momentos) y anidar botones es HTML inválido.
      var btn = document.createElement('span');
      btn.className = 'uc-add';
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      btn.textContent = '+';
      btn.title = 'Agregar al pedido';
      btn.setAttribute('aria-label', 'Agregar ' + name + ' al pedido');

      function doAdd(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        addItem(name, price);
        btn.classList.add('uc-done');
        setTimeout(function () { btn.classList.remove('uc-done'); }, 450);
      }
      btn.addEventListener('click', doAdd);
      btn.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') doAdd(ev);
      });

      // Dos layouts distintos según el tipo de producto:
      // - Tarjeta con foto (.product-card / .menu-card): el "+" va flotando
      //   en la esquina superior derecha, sin tocar el layout interno.
      // - Fila simple (.menu-item): el "+" se suma al final de la fila.
      var esTarjeta = /product-card|menu-card/.test(el.className) ||
        !!el.querySelector('.product-photo, .menu-card-photo, img');

      if (esTarjeta) {
        var csCard = getComputedStyle(el);
        if (csCard.position === 'static') el.style.position = 'relative';
        btn.classList.add('uc-add-card');
      } else {
        var cs = getComputedStyle(el);
        if (cs.display.indexOf('flex') === -1 && cs.display.indexOf('grid') === -1) {
          el.style.display = 'flex';
          el.style.alignItems = 'flex-start';
          el.style.justifyContent = 'space-between';
        }
      }
      el.appendChild(btn);
      el.dataset.ucHooked = '1';
      n++;
    });
    return n;
  }

  /* ---------- arranque ---------- */
  function start() {
    if (document.getElementById('uc-styles')) return;
    var accent = pickAccent();
    var surface = pickSurface();
    var dark = isDark(surface);
    var onSurface = dark ? '#f4f4f5' : '#1c1917';
    var border = dark ? 'rgba(255,255,255,.16)' : 'rgba(0,0,0,.12)';

    injectStyles(accent, surface, onSurface, border);
    buildUI(accent, surface);
    hookItems();
    render();

    // Los sitios con carta por pestañas renderizan/ocultan ítems al vuelo:
    // se re-engancha cuando cambia el DOM de la carta.
    var mo = new MutationObserver(function () { hookItems(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 60); });
  } else {
    setTimeout(start, 60);
  }
})();
