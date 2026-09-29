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
   - (29-09-2026) Si el cierre es un link de WhatsApp, el chat se abre con
     el pedido YA ESCRITO: productos, cantidades, total, nombre y
     comentario. Antes se abría vacío y el cliente tenía que escribir de
     memoria lo que acababa de armar.
   - Retiro / delivery, opcional, sólo si el sitio lo configura:
       window.CARRITO_CONFIG = {
         negocio: 'Churros and Waffles',
         entrega: {
           retiro: true, delivery: true,
           // Sin zonas: se pide la comuna o sector y el costo lo confirma
           // el local. Con zonas: el cliente elige y el costo se suma.
           // NUNCA inventar zonas ni costos: sólo los que dé el local.
           zonas: [ { nombre: 'Centro', costo: 1500 }, { nombre: 'Otra', costo: null } ]
         }
       }
   - Envío por distancia (en vez de zonas): el cliente escribe su dirección
     (con sugerencias) o usa su ubicación, y ve al tiro cuánto le sale.
       entrega: { retiro:true, delivery:true, porDistancia: {
         origen: [lat, lon],                       // el local
         tramos: [ { hasta: 1, costo: 500 }, { hasta: 3, costo: 1000 } ],
         factorRuta: 1.3 } }                       // si falla la ruta por calle
     Las direcciones se buscan en Photon (OpenStreetMap) y la distancia por
     calle en OSRM: gratis y sin clave. Si fallan, el pedido sale igual y
     el local confirma el costo. Más allá del último tramo no hay delivery.
   - Opciones por producto (salsa, topping…): al tocar «+» se abre un
     selector y el precio de cada opción se suma al producto.
       opciones: [ { para: ['Churros tradicionales'], titulo: 'Elige tu salsa',
         tipo: 'una' | 'varias', obligatoria: true, prefijo: 'salsa',
         items: [ { nombre: 'Manjar', precio: 600 }, { nombre: 'Sin salsa' } ] } ]
   - Si el sitio tiene window.HORARIO y el local está cerrado, el panel lo
     avisa antes de mandar.
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
      '.uc-form{display:flex;flex-direction:column;gap:12px;padding:16px 0 4px;}',
      '.uc-form-t{font-weight:700;font-size:.9rem;margin:0;}',
      '.uc-seg{display:flex;gap:8px;}',
      '.uc-seg button{flex:1;padding:10px 8px;border-radius:10px;border:1.5px solid ' + border + ';background:transparent;',
      'color:' + onSurface + ';font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;}',
      '.uc-seg button[aria-pressed="true"]{border-color:' + accent + ';background:' + accent + ';color:' + surface + ';}',
      '.uc-field{display:flex;flex-direction:column;gap:5px;}',
      '.uc-field label{font-size:.8rem;font-weight:600;opacity:.8;}',
      '.uc-field input,.uc-field select,.uc-field textarea{width:100%;box-sizing:border-box;padding:10px 12px;',
      'border-radius:9px;border:1px solid ' + border + ';background:transparent;color:' + onSurface + ';',
      'font:inherit;font-size:16px;}',
      '.uc-field select option{color:#1c1917;}',
      '.uc-field textarea{resize:vertical;min-height:58px;}',
      '.uc-field input:focus,.uc-field select:focus,.uc-field textarea:focus{outline:2px solid ' + accent + ';outline-offset:1px;}',
      '.uc-hint{font-size:.78rem;opacity:.7;margin:0;line-height:1.45;}',
      '.uc-err{font-size:.82rem;font-weight:600;color:#d64545;margin:0;}',
      '.uc-closed{font-size:.82rem;line-height:1.45;padding:10px 12px;border-radius:9px;margin:0 0 6px;',
      'border:1px dashed ' + accent + ';}',
      '.uc-dir-wrap{position:relative;}',
      '.uc-sug{list-style:none;margin:6px 0 0;padding:4px;border:1px solid ' + border + ';border-radius:10px;',
      'background:' + surface + ';max-height:230px;overflow:auto;}',
      '.uc-sug button{display:block;width:100%;text-align:left;padding:10px;border:0;background:transparent;',
      'color:' + onSurface + ';font:inherit;font-size:.9rem;border-radius:7px;cursor:pointer;line-height:1.35;}',
      '.uc-sug button:hover,.uc-sug button:focus{background:rgba(128,128,128,.2);outline:none;}',
      '.uc-sug-vacio{font-size:.82rem;opacity:.75;padding:8px 10px;line-height:1.4;}',
      '.uc-geo{align-self:flex-start;padding:8px 14px;border-radius:999px;border:1.5px solid ' + accent + ';',
      'background:transparent;color:' + onSurface + ';font:inherit;font-size:.86rem;font-weight:600;cursor:pointer;}',
      '.uc-geo:disabled{opacity:.6;cursor:wait;}',
      '.uc-calc{margin:0;font-size:.88rem;line-height:1.45;}',
      '.uc-calc:empty{display:none;}',
      '.uc-calc-ok{padding:10px 12px;border-radius:10px;border:1.5px solid ' + accent + ';}',
      '.uc-calc-ok b{display:block;font-size:1.02rem;color:' + accent + ';}',
      '.uc-calc-ok span{display:block;font-size:.78rem;opacity:.75;margin-top:2px;}',
      '.uc-calc-fuera{color:#d64545;font-weight:600;}',
      '.uc-tarifas{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;}',
      '.uc-tarifas li{font-size:.74rem;padding:4px 9px;border-radius:999px;border:1px solid ' + border + ';opacity:.85;}',
      '.uc-opt-ov{align-items:flex-end;justify-content:center;}',
      '.uc-opt{width:min(460px,100%);max-height:90vh;overflow-y:auto;background:' + surface + ';color:' + onSurface + ';',
      'border-radius:20px 20px 0 0;padding:22px 22px 24px;animation:ucUp .25s ease;box-sizing:border-box;}',
      '@keyframes ucUp{from{transform:translateY(24px);opacity:0}to{transform:none;opacity:1}}',
      '.uc-opt .uc-head{margin-bottom:4px;align-items:flex-start;gap:12px;}',
      '.uc-opt-base{margin:0 0 6px;font-weight:700;color:' + accent + ';}',
      '.uc-grp{border:0;margin:14px 0 0;padding:0;min-width:0;}',
      '.uc-grp legend{font-weight:700;font-size:.95rem;padding:0;display:flex;align-items:center;gap:8px;}',
      '.uc-grp-ob{font-size:.7rem;font-weight:700;padding:2px 8px;border-radius:999px;border:1px solid ' + accent + ';color:' + accent + ';}',
      '.uc-op{display:flex;align-items:center;gap:11px;padding:11px 12px;border:1.5px solid ' + border + ';border-radius:11px;',
      'margin-top:8px;cursor:pointer;transition:border-color .15s;}',
      '.uc-op:has(input:checked){border-color:' + accent + ';}',
      '.uc-op input{width:18px;height:18px;margin:0;accent-color:' + accent + ';flex:0 0 auto;}',
      '.uc-op-n{flex:1;font-size:.93rem;}',
      '.uc-op-p{font-weight:700;font-size:.88rem;color:' + accent + ';white-space:nowrap;}',
      '.uc-opt-qty{justify-content:center;margin:18px 0 6px;gap:16px;}',
      '.uc-opt-qty button{width:34px;height:34px;font-size:18px;}',
      '.uc-opt-qty span{font-size:1.05rem;}',
      'button.uc-go{width:100%;border:0;font:inherit;font-weight:700;cursor:pointer;}',
      '@keyframes ucBump{0%{transform:scale(1)}40%{transform:scale(1.18)}100%{transform:scale(1)}}',
      '.uc-fab.uc-bump{animation:ucBump .45s ease;}',
      '@media(min-width:641px){.uc-opt-ov{align-items:center;}.uc-opt{border-radius:20px;}}',
      '@media(max-width:640px){.uc-fab{left:14px;bottom:14px;width:50px;height:50px;}.uc-panel{padding:20px;}}',
      '@media (prefers-reduced-motion:reduce){.uc-panel,.uc-opt,.uc-fab.uc-bump{animation:none}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'uc-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- estado ---------- */
  var cart = [];
  var pedido = { entrega: null, zona: '', direccion: '', nombre: '', comentario: '' };
  var ENT = CFG.entrega || null;
  var ZONAS = (ENT && ENT.zonas) || [];
  // Envío por distancia: la dirección se ubica en el mapa y el costo sale
  // del tramo de kilómetros que configure el local (ver cabecera).
  var DIST = (ENT && ENT.porDistancia) || null;
  var OPCIONES = CFG.opciones || [];
  var envioCalc = nuevoCalc();

  function nuevoCalc() {
    return { km: null, costo: null, fuera: false, lat: null, lon: null, aprox: false, fallo: false, buscando: false, src: '' };
  }

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

    // El envío se suma sólo si su costo es conocido; si no, se avisa.
    var envio = costoEnvio();
    if (envio) total += envio;
    var envioPendiente = pedido.entrega === 'delivery' && !envio;

    if (faltantes && total) {
      totalEl.textContent = money(total) + ' + consultar';
      noteEl.textContent = 'Hay ' + faltantes + ' producto(s) sin precio publicado — el total final se confirma en el local.';
    } else if (faltantes) {
      totalEl.textContent = 'A consultar';
      noteEl.textContent = 'Los precios de estos productos no están publicados — se confirman en el local.';
    } else if (envio) {
      totalEl.textContent = money(total);
      noteEl.textContent = 'Incluye ' + money(envio) + ' de envío' +
        (DIST ? ', estimado según la distancia (unos ' + kmTxt(envioCalc.km) + ').' : '.');
    } else {
      totalEl.textContent = money(total) + (envioPendiente ? ' + envío' : '');
      noteEl.textContent = !envioPendiente ? 'Total referencial según los precios publicados.'
        : DIST ? 'Escribe tu dirección para ver cuánto sale el envío.'
        : 'El costo del delivery depende de tu zona: te lo confirman por WhatsApp.';
    }
  }

  /* ---------- envío ---------- */
  function costoEnvio() {
    if (pedido.entrega !== 'delivery') return 0;
    if (DIST) return envioCalc.costo && !envioCalc.fuera ? envioCalc.costo : 0;
    if (!ZONAS.length) return 0;
    var z = ZONAS.filter(function (x) { return x.nombre === pedido.zona; })[0];
    return z && z.costo ? z.costo : 0;
  }

  function kmTxt(km) {
    return (Math.round(km * 10) / 10).toLocaleString('es-CL') + ' km';
  }

  var PHOTON = 'https://photon.komoot.io';   // buscador de direcciones de OpenStreetMap, gratis y sin clave

  function pedirJSON(url, ms) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 6000);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function lugarDe(p) { return p.district || p.city || p.locality || ''; }

  function etiquetaDe(p) {
    var calle = p.street ? p.street + (p.housenumber ? ' ' + p.housenumber : '') : '';
    var partes = [calle || p.name || ''];
    var lugar = lugarDe(p);
    if (lugar && partes[0].indexOf(lugar) === -1) partes.push(lugar);
    return partes.filter(Boolean).join(', ');
  }

  function buscarDirecciones(q) {
    var o = DIST.origen;
    return pedirJSON(PHOTON + '/api/?limit=8&lat=' + o[0] + '&lon=' + o[1] + '&q=' + encodeURIComponent(q))
      .then(function (d) {
        var vistos = {};
        return (d.features || []).filter(function (f) {
          var p = f.properties || {};
          if (p.countrycode && p.countrycode !== 'CL') return false;
          var e = etiquetaDe(p);
          if (!e || vistos[e]) return false;
          vistos[e] = 1;
          return true;
        }).slice(0, 5).map(function (f) {
          var p = f.properties;
          return { label: etiquetaDe(p), num: p.housenumber || '', lugar: lugarDe(p),
            lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
        });
      });
  }

  function haversine(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // Distancia POR CALLE (OSRM, rutas de OpenStreetMap). Si no responde, línea
  // recta multiplicada por un factor, que se parece a lo que se maneja.
  function distanciaCalle(lat, lon) {
    var o = DIST.origen;
    var url = 'https://router.project-osrm.org/route/v1/driving/' + o[1] + ',' + o[0] + ';' + lon + ',' + lat + '?overview=false';
    return pedirJSON(url).then(function (d) {
      if (!d.routes || !d.routes[0]) throw new Error('sin ruta');
      return { km: d.routes[0].distance / 1000, aprox: false };
    }).catch(function () {
      return { km: haversine(o, [lat, lon]) * (DIST.factorRuta || 1.3), aprox: true };
    });
  }

  function tramoDe(km) {
    var T = DIST.tramos || [];
    for (var i = 0; i < T.length; i++) if (km <= T[i].hasta) return T[i];
    return null;
  }

  var calcSeq = 0;
  function calcularEnvio(lat, lon, src) {
    var seq = ++calcSeq;
    envioCalc = nuevoCalc();
    envioCalc.lat = lat; envioCalc.lon = lon; envioCalc.buscando = true; envioCalc.src = src || '';
    pintarCalc(); render();
    distanciaCalle(lat, lon).then(function (r) {
      if (seq !== calcSeq) return;
      var t = tramoDe(r.km);
      envioCalc.km = r.km; envioCalc.aprox = r.aprox; envioCalc.buscando = false;
      envioCalc.fuera = !t; envioCalc.costo = t ? t.costo : null;
      pintarCalc(); render();
    });
  }

  function pintarCalc() {
    var el = document.getElementById('uc-calc');
    if (!el) return;
    el.className = 'uc-calc';
    el.textContent = '';
    if (envioCalc.buscando) { el.textContent = 'Calculando el envío…'; return; }
    if (envioCalc.fallo) { el.textContent = 'No pudimos calcular el envío en este momento: el local te lo confirma por WhatsApp.'; return; }
    if (envioCalc.km == null) return;
    var T = DIST.tramos;
    if (envioCalc.fuera) {
      el.className = 'uc-calc uc-calc-fuera';
      el.textContent = 'Tu dirección queda a unos ' + kmTxt(envioCalc.km) + ' y el delivery llega hasta ' +
        T[T.length - 1].hasta + ' km. Puedes retirarlo en el local.';
      return;
    }
    el.className = 'uc-calc uc-calc-ok';
    var b = document.createElement('b');
    b.textContent = 'Envío a tu dirección: ' + money(envioCalc.costo);
    var s = document.createElement('span');
    s.textContent = 'Unos ' + kmTxt(envioCalc.km) + (envioCalc.aprox ? '' : ' por calle') + ' · valor estimado';
    el.appendChild(b); el.appendChild(s);
  }

  function tarifasHTML() {
    var T = DIST.tramos || [], desde = 0, h = '<ul class="uc-tarifas" aria-label="Tarifas de envío">';
    T.forEach(function (t) {
      var r = desde ? desde + ' a ' + t.hasta + ' km' : 'Hasta ' + t.hasta + ' km';
      h += '<li>' + esc(r) + ' · ' + money(t.costo) + '</li>';
      desde = t.hasta;
    });
    return h + '</ul>';
  }

  /* ---------- mensaje ---------- */
  function nombreNegocio() {
    if (CFG.negocio) return CFG.negocio;
    var og = document.querySelector('meta[property="og:site_name"]');
    if (og && og.content) return og.content.trim();
    return document.title.split(/\s[—|·-]\s/)[0].trim();
  }

  function esc(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function esWhatsApp(href) {
    return /wa\.me\/|api\.whatsapp\.com/.test(href || '');
  }

  function armarMensaje() {
    var L = ['¡Hola, ' + nombreNegocio() + '! Quiero hacer este pedido:', ''];
    var sub = 0, falta = 0;
    cart.forEach(function (c) {
      var p = c.price ? money(c.price * c.qty) : 'a consultar';
      if (c.price) sub += c.price * c.qty; else falta++;
      L.push('• ' + c.qty + ' × ' + c.name + ' — ' + p);
    });
    L.push('');
    L.push('*Subtotal:* ' + (sub ? money(sub) : '') + (falta ? (sub ? ' + ' : '') + 'por confirmar' : ''));
    var envio = costoEnvio();
    if (pedido.entrega === 'retiro') L.push('*Entrega:* retiro en el local');
    if (pedido.entrega === 'delivery') {
      L.push('*Entrega:* delivery');
      if (pedido.zona) L.push('*Zona:* ' + pedido.zona);
      if (pedido.direccion) L.push('*Dirección:* ' + pedido.direccion);
      if (DIST && envioCalc.lat != null) {
        L.push('*Ubicación:* https://maps.google.com/?q=' + envioCalc.lat.toFixed(6) + ',' + envioCalc.lon.toFixed(6));
      }
      if (envio) L.push('*Envío:* ' + money(envio) + (DIST ? ' (estimado, unos ' + kmTxt(envioCalc.km) + ')' : ''));
      else L.push('_¿Cuánto sale el envío a mi dirección?_');
    }
    if (sub && !falta) L.push('*Total:* ' + money(sub + envio) + (pedido.entrega === 'delivery' && !envio ? ' + envío' : ''));
    if (pedido.nombre || pedido.comentario) L.push('');
    if (pedido.nombre) L.push('*Nombre:* ' + pedido.nombre);
    if (pedido.comentario) L.push('*Comentario:* ' + pedido.comentario);
    L.push('');
    L.push('(Pedido armado en la página web)');
    return L.join('\n');
  }

  function hrefConPedido(base) {
    if (!esWhatsApp(base)) return base;
    var sep = base.indexOf('?') === -1 ? '?' : '&';
    return base.replace(/([?&])text=[^&]*/, '$1').replace(/[?&]$/, '') + sep + 'text=' + encodeURIComponent(armarMensaje());
  }

  // Estado del local ahora, según window.HORARIO (índice 0 = lunes).
  function avisoCerrado() {
    var H = window.HORARIO;
    if (!H || !H.dias || H.dias.length !== 7) return '';
    var ahora = new Date();
    var min = ahora.getHours() * 60 + ahora.getMinutes();
    var hoy = (ahora.getDay() + 6) % 7, ayer = (hoy + 6) % 7;
    function rango(s) {
      s = String(s || '');
      if (/24\s*h/i.test(s)) return [0, 1440];
      var m = s.match(/(\d{1,2}):(\d{2})\s*[-–a]+\s*(\d{1,2}):(\d{2})/);
      if (!m) return null;
      var a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4];
      return [a, b <= a ? b + 1440 : b];
    }
    var r = rango(H.dias[hoy]), ry = rango(H.dias[ayer]);
    if (ry && ry[1] > 1440 && min < ry[1] - 1440) return '';   // turno de anoche que pasa medianoche
    if (r && min >= r[0] && min < r[1]) return '';
    if (!r && !/cerrado/i.test(H.dias[hoy])) return '';          // formato desconocido: no opinar
    var abre = r && min < r[0] ? ' Hoy abre a las ' + String(H.dias[hoy]).match(/\d{1,2}:\d{2}/)[0] + '.' : '';
    return 'Ahora el local está cerrado.' + abre + ' Puedes mandar tu pedido igual: lo ven cuando abran.';
  }

  /* ---------- formulario de entrega ---------- */
  function buildForm(panel, before) {
    var f = document.createElement('div');
    f.className = 'uc-form';
    var html = '';
    if (ENT && (ENT.retiro || ENT.delivery)) {
      html += '<p class="uc-form-t" id="uc-ent-t">¿Cómo lo quieres?</p><div class="uc-seg" role="group" aria-labelledby="uc-ent-t">';
      if (ENT.retiro) html += '<button type="button" data-ent="retiro" aria-pressed="false">Retiro en el local</button>';
      if (ENT.delivery) html += '<button type="button" data-ent="delivery" aria-pressed="false">Delivery</button>';
      html += '</div>';
      html += '<div id="uc-deliv" style="display:none;flex-direction:column;gap:10px">';
      if (ZONAS.length && !DIST) {
        html += '<div class="uc-field"><label for="uc-zona">Tu zona</label><select id="uc-zona"><option value="">Elige tu zona</option>';
        ZONAS.forEach(function (z) {
          html += '<option value="' + esc(z.nombre) + '">' + esc(z.nombre) +
            (z.costo ? ' — ' + money(z.costo) : ' — a confirmar') + '</option>';
        });
        html += '</select></div>';
      }
      html += '<div class="uc-field uc-dir-wrap"><label for="uc-dir">Dirección de entrega</label>' +
        '<input id="uc-dir" type="text" placeholder="Ej: Eyzaguirre 500, San Bernardo"' +
        (DIST ? ' autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="uc-sug" aria-expanded="false"'
              : ' autocomplete="street-address"') + '>' +
        (DIST ? '<ul class="uc-sug" id="uc-sug" role="listbox" aria-label="Direcciones encontradas" hidden></ul>' : '') +
        '</div>';
      if (DIST) {
        html += '<button type="button" class="uc-geo" id="uc-geo">📍 Usar mi ubicación</button>';
        html += '<div class="uc-calc" id="uc-calc" aria-live="polite"></div>';
        html += tarifasHTML();
      }
      if (ENT.notaDelivery || (ZONAS.length && !DIST)) {
        html += '<p class="uc-hint">' + esc(ENT.notaDelivery || 'El costo del envío depende de la zona.') + '</p>';
      }
      html += '</div>';
    }
    html += '<div class="uc-field"><label for="uc-nom">Tu nombre</label><input id="uc-nom" type="text" autocomplete="given-name"></div>';
    html += '<div class="uc-field"><label for="uc-com">Comentario <span style="font-weight:400">(opcional)</span></label>' +
      '<textarea id="uc-com" rows="2" placeholder="Ej: sin azúcar, tocar el timbre dos veces"></textarea></div>';
    html += '<p class="uc-err" id="uc-err" role="alert" hidden></p>';
    f.innerHTML = html;
    panel.insertBefore(f, before);

    Array.prototype.forEach.call(f.querySelectorAll('[data-ent]'), function (b) {
      b.addEventListener('click', function () {
        pedido.entrega = b.getAttribute('data-ent');
        Array.prototype.forEach.call(f.querySelectorAll('[data-ent]'), function (o) {
          o.setAttribute('aria-pressed', String(o === b));
        });
        var d = document.getElementById('uc-deliv');
        if (d) d.style.display = pedido.entrega === 'delivery' ? 'flex' : 'none';
        document.getElementById('uc-err').hidden = true;
        render();
      });
    });
    function bind(id, key) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function () { pedido[key] = el.value.trim(); render(); });
      el.addEventListener('change', function () { pedido[key] = el.value.trim(); render(); });
    }
    bind('uc-zona', 'zona'); bind('uc-nom', 'nombre'); bind('uc-com', 'comentario');
    if (DIST) bindDireccion(); else bind('uc-dir', 'direccion');
  }

  // Dirección con sugerencias: al escribir se buscan direcciones cerca del
  // local; al elegir una, se calcula el envío al tiro.
  function bindDireccion() {
    var inp = document.getElementById('uc-dir');
    var lista = document.getElementById('uc-sug');
    var geo = document.getElementById('uc-geo');
    var timer = null, seq = 0, escrito = '';

    function cerrarLista() { lista.hidden = true; inp.setAttribute('aria-expanded', 'false'); }

    function mostrar(res) {
      lista.innerHTML = '';
      if (!res.length) {
        var li0 = document.createElement('li');
        li0.className = 'uc-sug-vacio';
        li0.textContent = 'No encontramos esa dirección. Prueba con calle, número y comuna, o usa tu ubicación.';
        lista.appendChild(li0);
      }
      res.forEach(function (r) {
        var li = document.createElement('li');
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('role', 'option');
        b.textContent = r.label;
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });   // que el blur no cierre antes del clic
        b.addEventListener('click', function () { elegir(r); });
        b.addEventListener('keydown', function (e) {
          var todos = lista.querySelectorAll('button'), i = Array.prototype.indexOf.call(todos, b);
          if (e.key === 'ArrowDown' && todos[i + 1]) { e.preventDefault(); todos[i + 1].focus(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); (todos[i - 1] || inp).focus(); }
          if (e.key === 'Escape') { cerrarLista(); inp.focus(); }
        });
        li.appendChild(b);
        lista.appendChild(li);
      });
      lista.hidden = false;
      inp.setAttribute('aria-expanded', 'true');
    }

    function elegir(r) {
      // Si el buscador no trae el número de casa pero la persona sí lo
      // escribió, se respeta lo que escribió: el repartidor necesita el número.
      var texto = r.num || !/\d/.test(escrito) ? r.label
        : escrito.trim() + (r.lugar && escrito.toLowerCase().indexOf(r.lugar.toLowerCase()) === -1 ? ', ' + r.lugar : '');
      inp.value = texto;
      pedido.direccion = texto;
      cerrarLista();
      inp.focus();
      calcularEnvio(r.lat, r.lon, 'lista');
    }

    inp.addEventListener('input', function () {
      escrito = inp.value;
      pedido.direccion = inp.value.trim();
      // Cambió la dirección: el envío calculado ya no vale. Salvo si vino de
      // la ubicación del teléfono y sólo se le está agregando el número o depto.
      if (envioCalc.src !== 'geo') { calcSeq++; envioCalc = nuevoCalc(); pintarCalc(); }
      render();
      clearTimeout(timer);
      if (inp.value.trim().length < 5) { cerrarLista(); return; }
      timer = setTimeout(function () {
        var mio = ++seq;
        buscarDirecciones(inp.value.trim()).then(function (res) {
          if (mio === seq) mostrar(res);
        }).catch(function () {
          if (mio !== seq) return;
          envioCalc.fallo = true; pintarCalc(); render();
        });
      }, 450);
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' && !lista.hidden) {
        var p = lista.querySelector('button');
        if (p) { e.preventDefault(); p.focus(); }
      }
      if (e.key === 'Escape') cerrarLista();
    });
    inp.addEventListener('blur', function () {
      setTimeout(function () { if (!lista.contains(document.activeElement)) cerrarLista(); }, 150);
    });

    geo.addEventListener('click', function () {
      var el = document.getElementById('uc-calc');
      if (!navigator.geolocation) { el.textContent = 'Tu navegador no comparte la ubicación. Escribe tu dirección.'; return; }
      geo.disabled = true;
      el.className = 'uc-calc';
      el.textContent = 'Buscando tu ubicación…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        geo.disabled = false;
        var lat = pos.coords.latitude, lon = pos.coords.longitude;
        calcularEnvio(lat, lon, 'geo');
        pedirJSON(PHOTON + '/reverse?lat=' + lat + '&lon=' + lon).then(function (d) {
          var f0 = d.features && d.features[0];
          var e = f0 ? etiquetaDe(f0.properties) : '';
          if (e && !inp.value.trim()) { inp.value = e; escrito = e; pedido.direccion = e; render(); }
          inp.focus();
        }).catch(function () { inp.focus(); });
      }, function () {
        geo.disabled = false;
        el.className = 'uc-calc';
        el.textContent = 'No pudimos usar tu ubicación. Escribe tu dirección y elígela de la lista.';
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  }

  function validar() {
    var err = document.getElementById('uc-err');
    var msg = '';
    var deliv = pedido.entrega === 'delivery';
    if (!cart.length) msg = 'Todavía no agregaste nada.';
    else if (ENT && (ENT.retiro || ENT.delivery) && !pedido.entrega) msg = 'Elige si lo retiras en el local o lo quieres por delivery.';
    else if (deliv && ZONAS.length && !DIST && !pedido.zona) msg = 'Elige tu zona para el delivery.';
    else if (deliv && !pedido.direccion) msg = 'Escribe la dirección para el delivery.';
    else if (deliv && DIST && envioCalc.buscando) msg = 'Espera un segundo: estamos calculando el envío.';
    else if (deliv && DIST && envioCalc.fuera) msg = 'Tu dirección queda fuera de la zona de delivery. Puedes elegir retiro en el local.';
    else if (deliv && DIST && envioCalc.km == null && !envioCalc.fallo) msg = 'Elige tu dirección de la lista, o usa tu ubicación, para calcular el envío.';
    if (err) { err.textContent = msg; err.hidden = !msg; }
    return !msg;
  }

  /* ---------- opciones por producto (salsa, topping…) ---------- */
  function gruposPara(nombre) {
    var n = nombre.toLowerCase();
    return OPCIONES.filter(function (g) {
      return [].concat(g.para || []).some(function (p) { return n.indexOf(String(p).toLowerCase()) !== -1; });
    });
  }

  function abrirOpciones(nombre, precio, grupos, origen) {
    var qty = 1;
    var ov = document.createElement('div');
    ov.className = 'uc-overlay uc-opt-ov open';
    var box = document.createElement('div');
    box.className = 'uc-opt';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'uc-opt-t');

    var head = document.createElement('div');
    head.className = 'uc-head';
    var h = document.createElement('h3');
    h.id = 'uc-opt-t';
    h.textContent = nombre;
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'uc-x'; x.setAttribute('aria-label', 'Cerrar'); x.textContent = '×';
    head.appendChild(h); head.appendChild(x);
    box.appendChild(head);

    if (precio) {
      var base = document.createElement('p');
      base.className = 'uc-opt-base';
      base.textContent = money(precio);
      box.appendChild(base);
    }

    grupos.forEach(function (g, gi) {
      var fs = document.createElement('fieldset');
      fs.className = 'uc-grp';
      var lg = document.createElement('legend');
      lg.textContent = g.titulo || 'Elige';
      if (g.obligatoria) {
        var ob = document.createElement('span');
        ob.className = 'uc-grp-ob';
        ob.textContent = g.tipo === 'varias' ? 'Elige al menos una' : 'Obligatorio';
        lg.appendChild(ob);
      }
      fs.appendChild(lg);
      g.items.forEach(function (it, ii) {
        var lab = document.createElement('label');
        lab.className = 'uc-op';
        var inp = document.createElement('input');
        inp.type = g.tipo === 'varias' ? 'checkbox' : 'radio';
        inp.name = 'uc-g' + gi;
        inp.value = ii;
        var nm = document.createElement('span');
        nm.className = 'uc-op-n';
        nm.textContent = it.nombre;
        var pr = document.createElement('span');
        pr.className = 'uc-op-p';
        pr.textContent = it.precio ? '+' + money(it.precio) : (g.gratisTxt || '');
        lab.appendChild(inp); lab.appendChild(nm); lab.appendChild(pr);
        fs.appendChild(lab);
      });
      box.appendChild(fs);
    });

    var qrow = document.createElement('div');
    qrow.className = 'uc-qty uc-opt-qty';
    var menos = document.createElement('button'); menos.type = 'button'; menos.textContent = '−';
    menos.setAttribute('aria-label', 'Una menos');
    var qn = document.createElement('span'); qn.textContent = '1';
    var mas = document.createElement('button'); mas.type = 'button'; mas.textContent = '+';
    mas.setAttribute('aria-label', 'Una más');
    qrow.appendChild(menos); qrow.appendChild(qn); qrow.appendChild(mas);
    box.appendChild(qrow);

    var err = document.createElement('p');
    err.className = 'uc-err'; err.setAttribute('role', 'alert'); err.hidden = true;
    box.appendChild(err);

    var add = document.createElement('button');
    add.type = 'button';
    add.className = 'uc-go';
    box.appendChild(add);

    ov.appendChild(box);
    document.body.appendChild(ov);

    function elegidos() {
      return grupos.map(function (g, gi) {
        return Array.prototype.filter.call(box.querySelectorAll('input[name="uc-g' + gi + '"]'), function (i) { return i.checked; })
          .map(function (i) { return g.items[+i.value]; });
      });
    }
    function unitario() {
      if (!precio) return null;
      return elegidos().reduce(function (s, sel) {
        return s + sel.reduce(function (a, it) { return a + (it.precio || 0); }, 0);
      }, precio);
    }
    function pintar() {
      qn.textContent = qty;
      var u = unitario();
      add.textContent = 'Agregar al pedido' + (u ? ' · ' + money(u * qty) : '');
    }
    function cerrar() {
      document.removeEventListener('keydown', teclas);
      ov.parentNode && ov.parentNode.removeChild(ov);
      if (origen && origen.focus) origen.focus();
    }
    function teclas(e) { if (e.key === 'Escape') cerrar(); }

    box.addEventListener('change', function () { err.hidden = true; pintar(); });
    menos.addEventListener('click', function () { if (qty > 1) { qty--; pintar(); } });
    mas.addEventListener('click', function () { qty++; pintar(); });
    x.addEventListener('click', cerrar);
    ov.addEventListener('click', function (e) { if (e.target === ov) cerrar(); });
    document.addEventListener('keydown', teclas);
    add.addEventListener('click', function () {
      var sel = elegidos();
      for (var i = 0; i < grupos.length; i++) {
        if (grupos[i].obligatoria && !sel[i].length) {
          err.textContent = (grupos[i].titulo || 'Elige una opción') + ': falta elegir.';
          err.hidden = false;
          return;
        }
      }
      var partes = [];
      sel.forEach(function (s, i) {
        if (!s.length) return;
        var nombres = s.map(function (it) { return it.nombre; }).join(', ');
        partes.push(grupos[i].prefijo ? grupos[i].prefijo + ' ' + nombres : nombres);
      });
      addItem(nombre + (partes.length ? ' (' + partes.join('; ') + ')' : ''), unitario(), qty);
      var fab = document.getElementById('uc-fab');
      if (fab) { fab.classList.remove('uc-bump'); void fab.offsetWidth; fab.classList.add('uc-bump'); }
      cerrar();
    });

    pintar();
    var primero = box.querySelector('input');
    if (primero) primero.focus();
  }

  function addItem(name, price, qty) {
    qty = qty || 1;
    var found = cart.filter(function (c) { return c.name === name; })[0];
    if (found) { found.qty += qty; } else { cart.push({ name: name, price: price, qty: qty }); }
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
      '<p class="uc-closed" id="uc-closed" hidden></p>' +
      '<a class="uc-go" id="uc-go" target="_blank" rel="noopener">' + checkout.label + '</a>' +
      '</div>';
    document.body.appendChild(ov);

    var panel = ov.querySelector('.uc-panel');
    // Los datos de entrega sólo tienen sentido si el pedido viaja escrito.
    if (esWhatsApp(checkout.href)) buildForm(panel, panel.querySelector('.uc-total'));

    var go = document.getElementById('uc-go');
    go.setAttribute('href', checkout.href);
    go.addEventListener('click', function (e) {
      if (!esWhatsApp(checkout.href)) return;
      if (!validar()) { e.preventDefault(); return; }
      go.setAttribute('href', hrefConPedido(checkout.href));
    });
    fab.addEventListener('click', function () {
      var c = document.getElementById('uc-closed');
      var t = avisoCerrado();
      c.textContent = t; c.hidden = !t;
    });
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
        var grupos = gruposPara(name);
        if (grupos.length) { abrirOpciones(name, price, grupos, btn); return; }
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
