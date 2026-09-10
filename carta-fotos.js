/* ============================================================
   CARTA CON IMAGEN — módulo reusable del portafolio de cafeterías
   ============================================================
   Le da una miniatura a CADA producto de la carta, sin tocar la
   lógica de render de cada sitio.

   Regla de honestidad del proyecto: NUNCA se pone la foto real de
   otro local ni una foto inventada. Entonces:

     1) Si el producto ya trae una <img> real (foto del propio local),
        no se toca: se respeta.
     2) Si no la trae, se dibuja una ILUSTRACIÓN vectorial genérica,
        elegida por palabra clave del nombre del producto y pintada
        con la paleta del propio sitio. Es claramente un dibujo, no
        una foto — así la carta se ve completa sin mentir.

   Cuando se consigan fotos reales de ESE local, basta con agregarlas
   al dato del producto (img:) y este módulo se aparta solo.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.CARTA_FOTOS_CONFIG || {};
  var ITEM_SELECTOR = CFG.selector ||
    '.menu-item, .carta-item, .producto-item, .product-card, .menu-card';

  /* ---------- paleta heredada del sitio ---------- */
  function pickColor(probes, prop, fallback) {
    for (var i = 0; i < probes.length; i++) {
      var el = document.querySelector(probes[i]);
      if (!el) continue;
      var v = getComputedStyle(el)[prop];
      if (v && v !== 'transparent' && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(v)) return v;
    }
    return fallback;
  }

  function isDark(rgb) {
    var m = String(rgb).match(/\d+/g);
    if (!m) return false;
    return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) / 255 < 0.5;
  }

  /* ---------- catálogo de ilustraciones ----------
     Cada entrada: [regex sobre el nombre, dibujo SVG].
     El orden importa: gana la primera que calce. */
  var TRAZO = 'fill="none" stroke="currentColor" stroke-width="2.6" ' +
    'stroke-linecap="round" stroke-linejoin="round"';

  var ICONOS = [
    // --- bebidas frías antes que "café", para que "café helado" caiga acá ---
    [/helad|frapp|frozen|granizad|smoothie|milkshake|malteada/i,
      '<path ' + TRAZO + ' d="M18 20h28l-4 26a4 4 0 0 1-4 3.6h-12A4 4 0 0 1 22 46z"/>' +
      '<path ' + TRAZO + ' d="M18 20c0-5 6-9 14-9s14 4 14 9"/>' +
      '<path ' + TRAZO + ' d="M32 11V4"/><circle ' + TRAZO + ' cx="32" cy="4" r="2.6"/>'],
    [/jugo|limonad|naranjad|bebida|refresco|soda|gaseosa|n[eé]ctar|agua|t[eé] helado|iced|ice tea|bubble|cerveza|vino|espumante|michelad|schop|batido|frapu|sprite|coca|fanta|pepsi|zero|mineral|energ[eé]tica/i,
      '<path ' + TRAZO + ' d="M20 16h24l-3.5 34a4 4 0 0 1-4 3.6h-9A4 4 0 0 1 23.5 50z"/>' +
      '<path ' + TRAZO + ' d="M21.4 30h21.2"/><path ' + TRAZO + ' d="M40 16 46 6"/>'],
    // --- calientes ---
    [/(?:^|[\s(])t[eé]s?(?:$|[\s).,·-])|infusi[oó]n|hierba|matcha|chai|rooibos|manzanill|menta|tetera|teteras/i,
      '<path ' + TRAZO + ' d="M14 26h30v14a12 12 0 0 1-12 12h-6a12 12 0 0 1-12-12z"/>' +
      '<path ' + TRAZO + ' d="M44 30h4a6 6 0 0 1 0 12h-4"/>' +
      '<path ' + TRAZO + ' d="M24 18c0-4 4-4 4-8M34 18c0-4 4-4 4-8"/>'],
    [/chocolate|submarino|leche|snickers|bombon|bomb[oó]n|nutella/i,
      '<path ' + TRAZO + ' d="M14 24h32v16a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12z"/>' +
      '<path ' + TRAZO + ' d="M46 28h4a6 6 0 0 1 0 12h-4"/>' +
      '<path ' + TRAZO + ' d="M22 32c4 3 8-3 12 0s8-3 10 0"/>'],
    [/caf[eé]|espresso|expreso|doppio|latte|capuc|cappuc|moc[ah]|moka|americ|cortado|mac?chiat|flat white|ristretto|lungo|filtrad|v60|chemex|aeropress|prensa|cold brew|affogato|carajillo|vainilla|caramel|descafein|gibraltar|new orleans|irland[eé]s|irish|cortadito|coffee|\bcapu\b|barista/i,
      '<path ' + TRAZO + ' d="M14 24h32v16a12 12 0 0 1-12 12h-8a12 12 0 0 1-12-12z"/>' +
      '<path ' + TRAZO + ' d="M46 28h4a6 6 0 0 1 0 12h-4"/>' +
      '<path ' + TRAZO + ' d="M24 16c0-4 4-4 4-8M34 16c0-4 4-4 4-8"/>'],
    // --- salados ---
    [/complet|hot ?dog|vienesa|italiano|dinamico|din[aá]mico/i,
      '<path ' + TRAZO + ' d="M8 36c0-7 5-11 24-11s24 4 24 11-5 11-24 11S8 43 8 36z"/>' +
      '<path ' + TRAZO + ' d="M16 33c6-4 26-4 32 0"/>' +
      '<path ' + TRAZO + ' d="M18 39c5 3 23 3 28 0"/>'],
    [/hamburgues|burger/i,
      '<path ' + TRAZO + ' d="M10 28c0-8 10-13 22-13s22 5 22 13z"/>' +
      '<path ' + TRAZO + ' d="M10 34h44"/><path ' + TRAZO + ' d="M10 40c0 6 10 9 22 9s22-3 22-9z"/>'],
    // Cocina japonesa (Natsuko y similares): fideos, gyozas, arroz, sashimi
    [/ramen|udon|fideo|noodle|yakisoba/i,
      '<path ' + TRAZO + ' d="M10 30h44v6a16 16 0 0 1-16 16h-12A16 16 0 0 1 10 36z"/>' +
      '<path ' + TRAZO + ' d="M4 30h56"/>' +
      '<path ' + TRAZO + ' d="M40 8 26 26M48 12 34 28"/>'],
    [/gyoza|sushi|sashimi|maki|nigiri|roll\b|handroll/i,
      '<path ' + TRAZO + ' d="M14 26h36v22a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z"/>' +
      '<circle ' + TRAZO + ' cx="32" cy="37" r="7"/>' +
      '<path ' + TRAZO + ' d="M14 26c0-6 8-10 18-10s18 4 18 10"/>'],
    [/gohan|yakimeshi|arroz frito|donburi|poke/i,
      '<path ' + TRAZO + ' d="M12 30h40c0 12-9 21-20 21S12 42 12 30z"/>' +
      '<path ' + TRAZO + ' d="M20 30c2-6 6-9 12-9s10 3 12 9"/>' +
      '<path ' + TRAZO + ' d="M42 14 52 8"/>'],
    // Tabla / picoteo: promos y tablas para compartir, muy comunes en catering
    [/tabla|picoteo|tapadit|pincho|brocheta|bruschett|hummus|queso de cabra|ceviche|promo|para compartir|degustaci/i,
      '<path ' + TRAZO + ' d="M6 34h52a8 8 0 0 1-8 8H14a8 8 0 0 1-8-8z"/>' +
      '<path ' + TRAZO + ' d="M6 34c0-9 12-16 26-16s26 7 26 16"/>' +
      '<circle ' + TRAZO + ' cx="22" cy="27" r="3"/><circle ' + TRAZO + ' cx="34" cy="25" r="3"/>' +
      '<circle ' + TRAZO + ' cx="45" cy="28" r="3"/><path ' + TRAZO + ' d="M32 42v10"/>'],
    // Sopas y cremas
    [/sopa|crema de|caldo|consom[eé]|chupe/i,
      '<path ' + TRAZO + ' d="M10 30h44v6a16 16 0 0 1-16 16h-12A16 16 0 0 1 10 36z"/>' +
      '<path ' + TRAZO + ' d="M4 30h56"/>' +
      '<path ' + TRAZO + ' d="M24 22c0-4 4-4 4-8M36 22c0-4 4-4 4-8"/>'],
    [/quich|tarta salada/i,
      '<path ' + TRAZO + ' d="M8 34h48a24 24 0 0 1-48 0z"/>' +
      '<path ' + TRAZO + ' d="M8 34c0-8 11-14 24-14s24 6 24 14"/>' +
      '<path ' + TRAZO + ' d="M20 34l6-10M32 34V20M44 34l-6-10"/>'],
    [/sandwich|s[aá]ndwich|ciabatta|churrasc|barros|chacarero|lomito|molde|marraqueta|frica|tost|toast|club|wrap|panini|bagel|cachito|mechada|pastrami|salm[oó]n|palta/i,
      '<path ' + TRAZO + ' d="M8 40 32 18l24 22z"/>' +
      '<path ' + TRAZO + ' d="M8 40h48v6H8z"/><path ' + TRAZO + ' d="M18 33c6 3 22 3 28 0"/>'],
    [/pizza/i,
      '<path ' + TRAZO + ' d="M32 8 56 52a70 70 0 0 1-48 0z"/>' +
      '<circle ' + TRAZO + ' cx="27" cy="34" r="2.4"/><circle ' + TRAZO + ' cx="38" cy="38" r="2.4"/>' +
      '<circle ' + TRAZO + ' cx="32" cy="46" r="2.4"/>'],
    [/empanad/i,
      '<path ' + TRAZO + ' d="M10 38c0-12 10-20 22-20s22 8 22 20z"/>' +
      '<path ' + TRAZO + ' d="M10 38h44l-3 8H13z"/>' +
      '<path ' + TRAZO + ' d="M18 30c4 3 24 3 28 0"/>'],
    [/ensalad|bowl|vegetari|vegan/i,
      '<path ' + TRAZO + ' d="M8 30h48c0 13-11 22-24 22S8 43 8 30z"/>' +
      '<path ' + TRAZO + ' d="M22 30c0-8 4-12 10-12s10 4 10 12"/>'],
    [/papas|fritas|nugget|aro de cebolla/i,
      '<path ' + TRAZO + ' d="M20 26h24l-3 26H23z"/>' +
      '<path ' + TRAZO + ' d="M24 26 22 8M32 26V6M40 26l2-18"/>'],
    [/huevo|revuelt|omelet|tortilla|scrambl|eggs?\b|benedict|pochad/i,
      '<path ' + TRAZO + ' d="M14 38c0-14 8-24 18-24s18 10 18 24a16 16 0 0 1-36 0z"/>' +
      '<circle ' + TRAZO + ' cx="32" cy="36" r="7"/>'],
    [/almuerzo|men[uú] del d[ií]a|cazuela|casero|plato|guiso|pastel de|porotos|charquic|costillar|carne|pollo|chicken|pescado|arroz|lomo|lasa[nñ]a|gnocchi|pasta|legumbre|risotto|desayuno|once|brunch/i,
      '<circle ' + TRAZO + ' cx="32" cy="34" r="20"/><circle ' + TRAZO + ' cx="32" cy="34" r="11"/>'],
    // --- dulces ---
    [/cheesecake|torta|tarta|pastel|kuchen|pie\b|bizcoch|selva|tres leches|cake|fondue|panacota|panna cotta/i,
      '<path ' + TRAZO + ' d="M12 32h40v18a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z"/>' +
      '<path ' + TRAZO + ' d="M12 32c0-6 9-9 20-9s20 3 20 9"/>' +
      '<path ' + TRAZO + ' d="M32 23v-7"/><circle ' + TRAZO + ' cx="32" cy="14" r="2.6"/>'],
    [/brownie|cuadrad|barra|budin|bud[ií]n/i,
      '<path ' + TRAZO + ' d="M12 24h40v26a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z"/>' +
      '<path ' + TRAZO + ' d="M12 36h40M32 24v30"/>'],
    [/galleta|galletones?|gallet[oó]n|cookie|alfajor|macar[oó]n|macaron|canel[eé]|financier|palmerita/i,
      '<circle ' + TRAZO + ' cx="32" cy="32" r="22"/>' +
      '<circle ' + TRAZO + ' cx="25" cy="27" r="2.4"/><circle ' + TRAZO + ' cx="38" cy="30" r="2.4"/>' +
      '<circle ' + TRAZO + ' cx="30" cy="40" r="2.4"/>'],
    [/donut|dona|rosquilla/i,
      '<circle ' + TRAZO + ' cx="32" cy="32" r="22"/><circle ' + TRAZO + ' cx="32" cy="32" r="8"/>'],
    // Café en grano / bolsas para llevar (se vende por peso, no es una taza)
    [/\bgrano|en grano|\d+\s?g\b|\d+\s?gr\b|tostado|origen|blend|molido|c[aá]psul/i,
      '<path ' + TRAZO + ' d="M18 14h28l4 34a6 6 0 0 1-6 6.4H20A6 6 0 0 1 14 48z"/>' +
      '<path ' + TRAZO + ' d="M18 14c0-4 6-6 14-6s14 2 14 6"/>' +
      '<ellipse ' + TRAZO + ' cx="32" cy="34" rx="7" ry="9"/>' +
      '<path ' + TRAZO + ' d="M32 25v18"/>'],
    [/croissant|medialuna|berlin|ber?l[ií]n|pan|hallull|amasad|masa|bollo|muffin|queque|scone|waffle|panqueque|pancake|churro|milhoja|mil hoja|pasteler|reposter|marmolead|rellena|dona|keki|kukei|baclawa|baklava|ceregli|fatayer|kunefe|[aá]rabe|strudel|empolvad/i,
      '<path ' + TRAZO + ' d="M10 42c0-14 10-24 22-24s22 10 22 24z"/>' +
      '<path ' + TRAZO + ' d="M10 42h44"/><path ' + TRAZO + ' d="M22 42V26M32 42V22M42 42V26"/>'],
    [/postre|dulce|mousse|flan|leche asada|helado de|profiterol|cupcake|cakepop|brazo de reina|merengue|pie de/i,
      '<path ' + TRAZO + ' d="M16 28h32l-5 22a4 4 0 0 1-4 3.4H25A4 4 0 0 1 21 50z"/>' +
      '<path ' + TRAZO + ' d="M16 28c0-7 7-12 16-12s16 5 16 12"/>']
  ];

  // Fallback neutro: plato con cubiertos. Sirve para cualquier producto que
  // no calce con ninguna categoría, sin sugerir un plato concreto.
  var GENERICO =
    '<circle ' + TRAZO + ' cx="32" cy="32" r="17"/>' +
    '<circle ' + TRAZO + ' cx="32" cy="32" r="9"/>' +
    '<path ' + TRAZO + ' d="M8 12v12a4 4 0 0 0 4 4 4 4 0 0 0 4-4V12M12 12v16"/>' +
    '<path ' + TRAZO + ' d="M52 12c3 0 4 3 4 7s-1 6-3 6v27"/>';

  // El nombre del local aparece dentro de muchos productos ("Brunch Cafea",
  // "Mechada Me Gusta") y contamina la clasificación: "Cafea" hace que un
  // brunch reciba ícono de taza. Se quita la marca antes de clasificar.
  var MARCA = null;
  function tokensDeMarca() {
    if (MARCA) return MARCA;
    var crudo = [];
    var brand = document.querySelector('.brand-name, .brand, .logo-text, header h1');
    if (brand) crudo.push(brand.textContent);
    crudo.push((document.title || '').split(/[—–|·-]/)[0]);
    MARCA = [];
    crudo.join(' ').toLowerCase()
      .replace(/[^\wáéíóúñü\s]/g, ' ')
      .split(/\s+/)
      .forEach(function (t) { if (t.length > 2 && MARCA.indexOf(t) === -1) MARCA.push(t); });
    return MARCA;
  }

  function sinMarca(txt) {
    var out = ' ' + String(txt).toLowerCase() + ' ';
    tokensDeMarca().forEach(function (t) {
      out = out.split(t).join(' ');
    });
    return out;
  }

  function calce(txt) {
    for (var i = 0; i < ICONOS.length; i++) {
      if (ICONOS[i][0].test(txt)) return ICONOS[i][1];
    }
    return null;
  }

  // Muchas cartas nombran variantes que solo se entienden por su sección
  // ("BLT", "Caprese" bajo Sandwiches; "Gibraltar" bajo Café). Por eso, si
  // el nombre no calza con ninguna categoría, se prueba con el título de
  // la sección y con la pestaña activa antes de caer al ícono genérico.
  function contextoDe(el) {
    var partes = [];
    // Señal más limpia cuando existe: la categoría en un data-attribute
    // (Cafea usa data-cat, otros usan data-category / data-categoria).
    ['data-cat', 'data-category', 'data-categoria', 'data-group'].forEach(function (a) {
      var v = el.getAttribute(a);
      if (v) partes.push(v);
    });
    var panel = el.closest('.menu-panel, .tab-panel, section, div');
    var nodo = el.parentElement;
    while (nodo && partes.length < 2) {
      var prev = nodo.previousElementSibling;
      while (prev) {
        if (/group-title|menu-group|categoria|category|section-title|subtitul/i
            .test(prev.className || '') || /^H[2-5]$/.test(prev.tagName)) {
          partes.push(prev.textContent);
          break;
        }
        prev = prev.previousElementSibling;
      }
      nodo = nodo.parentElement;
      if (panel && nodo === panel.parentElement) break;
    }
    var tab = document.querySelector('.menu-tab.active, .cat-tab.active, .filtro.active, .tab.active');
    if (tab) partes.push(tab.textContent);
    return partes.join(' ');
  }

  function svgDe(nombre, el) {
    // 1) nombre sin la marca  2) nombre tal cual  3) sección/categoría
    var d = calce(sinMarca(nombre)) || calce(nombre) || calce(contextoDe(el));
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      (d || GENERICO) + '</svg>';
  }

  /* ---------- estilos ---------- */
  function injectStyles(accent) {
    // El tinte del recuadro se resuelve por ítem (currentColor + alpha), así
    // funciona igual sobre secciones claras y oscuras del mismo sitio.
    var css = [
      '.cf-thumb{flex:0 0 auto;width:58px;height:58px;border-radius:12px;overflow:hidden;',
      'display:flex;align-items:center;justify-content:center;',
      'background:color-mix(in srgb, ' + accent + ' 13%, transparent);',
      'color:' + accent + ';margin-right:14px;align-self:center;}',
      '.cf-thumb svg{width:34px;height:34px;opacity:.9;}',
      // Variante para tarjetas: ocupa el hueco de foto de la tarjeta
      '.cf-thumb.cf-full{width:100%;height:150px;border-radius:0;margin:0 0 12px;}',
      '.cf-thumb.cf-full svg{width:64px;height:64px;}',
      '@media(max-width:640px){.cf-thumb{width:50px;height:50px;margin-right:11px;}',
      '.cf-thumb svg{width:29px;height:29px;}.cf-thumb.cf-full{height:130px;}}'
    ].join('');
    var s = document.createElement('style');
    s.id = 'cf-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  /* ---------- utilidades ---------- */
  function textoLimpio(el) {
    if (!el) return '';
    var clon = el.cloneNode(true);
    Array.prototype.forEach.call(
      clon.querySelectorAll('.desc, .price, .descripcion, .precio, .veg-tag, .badge, .tag, .uc-add'),
      function (n) { n.parentNode.removeChild(n); }
    );
    return clon.textContent.replace(/\s+/g, ' ').trim();
  }

  function nombreDe(el) {
    var dn = el.getAttribute('data-name');
    if (dn) return dn.trim();
    var ne = el.querySelector('.name, .menu-item-name, .item-name, .producto-nombre, strong, h3, h4, b');
    var n = textoLimpio(ne);
    if (n) return n;
    return textoLimpio(el).slice(0, 80);
  }

  function yaTieneVisual(el) {
    if (el.querySelector('img, picture, video')) return true;
    // <svg> propio del sitio (no el nuestro, que va dentro de .cf-thumb)
    var svgs = el.querySelectorAll('svg');
    for (var i = 0; i < svgs.length; i++) {
      if (!svgs[i].closest('.cf-thumb') && !svgs[i].closest('.uc-add')) return true;
    }
    // background-image puesto por CSS en el propio ítem o en un hijo
    var nodos = [el].concat(Array.prototype.slice.call(el.querySelectorAll('*')));
    for (var j = 0; j < nodos.length; j++) {
      if (nodos[j].classList.contains('cf-thumb') || nodos[j].classList.contains('uc-add')) continue;
      var bi = getComputedStyle(nodos[j]).backgroundImage;
      if (bi && bi !== 'none') return true;
    }
    return false;
  }

  /* ---------- aplicación ---------- */
  function aplicar() {
    var items = document.querySelectorAll(ITEM_SELECTOR);
    var puestas = 0;
    Array.prototype.forEach.call(items, function (el) {
      if (el.dataset.cfDone) return;
      el.dataset.cfDone = '1';

      // 1) Si el producto YA tiene un visual propio, se respeta y no se toca.
      //    Puede venir de tres formas distintas según el proyecto:
      //    <img>/<picture> (foto real), <svg> inline (ilustración propia,
      //    ej. Filtra2) o un div con background-image por CSS.
      if (yaTieneVisual(el)) return;

      var nombre = nombreDe(el);
      if (!nombre) return;

      var thumb = document.createElement('div');
      thumb.className = 'cf-thumb';
      thumb.innerHTML = svgDe(nombre, el);

      // Tarjeta (producto en bloque) vs fila simple: cambia dónde va la miniatura.
      var esTarjeta = /product-card|menu-card/.test(el.className);
      if (esTarjeta) {
        thumb.classList.add('cf-full');
        el.insertBefore(thumb, el.firstChild);
      } else {
        var cs = getComputedStyle(el);
        if (cs.display.indexOf('flex') === -1 && cs.display.indexOf('grid') === -1) {
          el.style.display = 'flex';
          el.style.alignItems = 'center';
        }
        el.insertBefore(thumb, el.firstChild);
      }
      puestas++;
    });
    return puestas;
  }

  function start() {
    if (document.getElementById('cf-styles')) return;
    // El acento sale del color de precio/botón del propio sitio; si no hay,
    // se cae a un tono legible según si el fondo general es claro u oscuro.
    var fondo = getComputedStyle(document.body).backgroundColor;
    var accent = pickColor(['.price', '.menu-item-price', '.item-price', '.btn-solid',
      '.menu-tab.active', '.btn', '.cta-primary'], 'color',
      isDark(fondo) ? '#e8e0d4' : '#8a6a43');

    injectStyles(accent);
    aplicar();

    // Las cartas por pestañas renderizan al vuelo: se reaplica al cambiar el DOM.
    var mo = new MutationObserver(function () { aplicar(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 80); });
  } else {
    setTimeout(start, 80);
  }
})();
