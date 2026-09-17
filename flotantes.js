/* ════════════════════════════════════════════════════════════════
   FLOTANTES — que no tapen el contenido en el teléfono
   Módulo universal · 15-09-2026

   ── EL PROBLEMA, medido y no supuesto ──────────────────────────
   Se auditaron los 75 sitios a 390×844 abriendo la pestaña Visítanos:

   · NINGUNO tiene desbordamiento horizontal. El responsive está bien.
   · Pero los botones flotantes, anclados abajo a la derecha, se comen
     justo lo que la gente va a leer en esa pestaña:

       Mol Plaza          → tapa viernes, sábado y domingo del horario
       Carbel Coffee      → tapa sábado y domingo
       My Favorite Place  → tapa "Consumo en el local" y EL WHATSAPP
       Cafea              → tapa Instagram, WhatsApp y Google Maps
       Coffee Syria       → tapa cuatro días del horario y la nota del sábado
       Petiit Coffee      → tapa "Servicios"

     En escritorio no se nota porque sobran márgenes laterales. En un
     teléfono la columna ocupa todo el ancho y los botones caen encima
     del texto: se ve roto.

   ── LA SOLUCIÓN ────────────────────────────────────────────────
   En pantallas de teléfono los flotantes dejan de flotar sueltos y se
   apoyan en una franja opaca pegada al borde inferior, y el <body>
   recibe abajo exactamente el alto de esa franja. Así el contenido
   nunca queda debajo de un botón: la franja ocupa su propio espacio,
   igual que la cabecera pegajosa ocupa el suyo arriba.

   Por qué así y no escondiéndolos al hacer scroll: esto es CSS puro y
   determinista. No depende de eventos, no hay estado que se
   desincronice, y el botón está siempre donde el pulgar lo alcanza.

   El color de la franja se toma del propio <body> del sitio, así que
   cada cafetería la ve con su paleta sin tener que tocar sus estilos.

   Es defensivo a propósito: si algo falla, los botones se quedan
   exactamente como están hoy.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var MOVIL = 760;
  var ALTO = 74;          // alto de la franja, en px

  /* ⚠️ window.innerWidth devuelve 0 en algunos contenedores embebidos.
     clientWidth es el que siempre responde bien. */
  function ancho() {
    return document.documentElement.clientWidth || window.innerWidth || 0;
  }

  /* El carrito y la pestaña de redes se inyectan después, así que la
     lista se recalcula en vez de guardarse una sola vez. */
  function flotantes() {
    var out = [];
    var todos = document.querySelectorAll('body *');
    for (var i = 0; i < todos.length; i++) {
      var e = todos[i], cs;
      try { cs = getComputedStyle(e); } catch (err) { continue; }
      if (cs.position !== 'fixed') continue;
      if (e.classList.contains('flot-franja')) continue;

      var r = e.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;

      /* Ancho completo = cabecera, menú desplegado o cajón del carrito. */
      if (r.width > 300) continue;

      /* 280 y no 180: hay sitios que anclan algún botón bastante más
         arriba del borde (Café Crema 21 tiene su botón de teléfono a
         212px del fondo) y con el umbral corto se quedaba suelto en
         mitad del horario. */
      var alto = document.documentElement.clientHeight || 800;
      if (alto - r.bottom > 280) continue;

      /* Y tiene que estar pegado a un costado. Con el umbral más alto,
         sin esto se podría agarrar cualquier cosa fija del medio. */
      var W = ancho() || 380;
      if (r.left > 90 && r.right < W - 90) continue;

      var cls = (e.className || '').toString();
      if (/loader|burger|nav|head|drawer|panel|backdrop|overlay/i.test(cls)) continue;

      /* Si el padre ya entró, se mueve el padre: el grupo viaja junto. */
      if (out.indexOf(e.parentElement) !== -1) continue;

      out.push(e);
    }
    return out;
  }

  function fondo() {
    try {
      var c = getComputedStyle(document.body).backgroundColor;
      if (c && c !== 'transparent' && !/rgba\(0, 0, 0, 0\)/.test(c)) return c;
    } catch (e) { /* da igual */ }
    return '#ffffff';
  }


  /* ──────────────────────────────────────────────────────────────
     COLOR DE MARCA DE CADA RED
     ──────────────────────────────────────────────────────────────
     Antes cada sitio pintaba sus flotantes con su propia paleta, asi
     que el de TikTok salia cafe en un sitio y morado en otro, y no se
     reconocia de un vistazo. Un icono de red se reconoce por su color
     antes que por su forma: si el de Instagram no es el degradado
     rosa-naranjo, la gente duda antes de tocarlo.

     Se detecta por el HREF, no por el nombre de la clase: en el
     portafolio conviven cuatro convenciones distintas de nombres.
     Y se respeta lo que el sitio ya haya definido a mano con !important. */
  var COLORES = [
    [/instagram\.com/i,  'linear-gradient(45deg,#F9CE34,#EE2A7B 50%,#6228D7)', '#fff'],
    [/tiktok\.com/i,     '#010101', '#fff'],
    [/wa\.me|whatsapp/i, '#25D366', '#fff'],
    [/facebook\.com|fb\.com/i, '#1877F2', '#fff'],
    [/threads\.net/i,    '#000000', '#fff'],
    [/pedidosya/i,       '#FA0050', '#fff'],
    [/ubereats|uber\.com/i, '#06C167', '#fff']
  ];

  function pintarRedes() {
    var enlaces = document.querySelectorAll(
      '.flot-auto[href], .flot-auto a[href], [class*="float"][href], [class*="flot"] a[href]');
    for (var i = 0; i < enlaces.length; i++) {
      var a = enlaces[i];
      if (a.getAttribute('data-flot-color')) continue;
      var href = a.getAttribute('href') || '';
      for (var j = 0; j < COLORES.length; j++) {
        if (!COLORES[j][0].test(href)) continue;
        /* Solo si el boton es un circulo/pastilla de icono: no se le toca
           el fondo a una barra ancha ni a un boton con texto largo. */
        var r = a.getBoundingClientRect();
        if (r.width > 220) break;
        a.style.setProperty('background', COLORES[j][1], 'important');
        a.style.setProperty('color', COLORES[j][2], 'important');
        a.setAttribute('data-flot-color', '1');
        break;
      }
    }
  }

  function marcar() {
    var f = flotantes(), i;

    /* ⚠️ Hay sitios donde los botones NO están agrupados en un contenedor:
       son varios elementos fixed sueltos (Café Crema 21 tiene cuatro). Si a
       todos se les da el mismo `right`, se apilan uno encima de otro. Por eso
       cada uno lleva su propio índice y se corre hacia el centro.
       Va como variable CSS y no como estilo en línea a propósito: así el
       desplazamiento sólo existe dentro de la media query del teléfono. */
    var yaDer = document.querySelectorAll('.flot-der').length;
    var yaIzq = document.querySelectorAll('.flot-izq').length;

    for (i = 0; i < f.length; i++) {
      var e = f[i];
      if (e.classList.contains('flot-auto')) continue;

      /* ¿va pegado a la izquierda o a la derecha? Se mira dónde está
         puesto de verdad, no cómo se llama la clase. */
      var r = e.getBoundingClientRect();
      var izq = r.left < ancho() / 2;

      e.classList.add('flot-auto');
      e.classList.add(izq ? 'flot-izq' : 'flot-der');
      e.style.setProperty('--flot-i', izq ? yaIzq++ : yaDer++);
    }

    pintarRedes();
    return f.length;
  }

  /* En 375px no caben botones con texto: "Pedir por Rappi" mide 175px y
     choca con los de la otra esquina. En el teléfono se dejan como icono.
     ⚠️ Sólo los que TIENEN icono propio (svg o img): si un botón es puro
     texto, colapsarlo lo dejaría vacío. El aria-label no se toca, así que
     un lector de pantalla lo sigue leyendo completo. */
  function compactar() {
    var b = document.querySelectorAll(
      '.flot-auto a, .flot-auto button, a.flot-auto, button.flot-auto');
    for (var i = 0; i < b.length; i++) {
      if (b[i].classList.contains('flot-icono')) continue;
      if (!b[i].querySelector('svg, img')) continue;
      b[i].classList.add('flot-icono');
    }
  }

  function pintar() {
    /* El SEPARADOR va primero y es lo que de verdad reserva el hueco.
       Se probó con `body{padding-bottom}` y no sirve: hay sitios donde el
       scroll no lo lleva el body sino un contenedor interno, y ahí el
       padding no hace nada. Un div normal en el flujo ocupa su alto
       siempre, no importa quién scrollee. */
    if (!document.querySelector('.flot-hueco')) {
      var h = document.createElement('div');
      h.className = 'flot-hueco';
      h.setAttribute('aria-hidden', 'true');
      document.body.appendChild(h);
    }
    if (!document.querySelector('.flot-franja')) {
      var f = document.createElement('div');
      f.className = 'flot-franja';
      f.setAttribute('aria-hidden', 'true');
      document.body.appendChild(f);
    }
  }

  var estilo = document.createElement('style');
  estilo.setAttribute('data-flotantes', '');
  estilo.textContent =
    ':root{--flot-alto:' + ALTO + 'px;--flot-fondo:' + fondo() + '}' +
    '.flot-franja,.flot-hueco{display:none}' +
    '@media (max-width:' + MOVIL + 'px){' +
      '.flot-franja{' +
        'display:block;position:fixed;left:0;right:0;bottom:0;z-index:799;' +
        'height:calc(var(--flot-alto) + env(safe-area-inset-bottom,0px));' +
        'background:var(--flot-fondo);' +
        'border-top:1px solid rgba(128,128,128,.22);' +
        'box-shadow:0 -6px 20px -12px rgba(0,0,0,.35);' +
      '}' +
      /* Los botones se apoyan en la franja, centrados en su alto, y en
         fila en vez de en columna. */
      '.flot-auto{' +
        'bottom:calc(env(safe-area-inset-bottom,0px) + (var(--flot-alto) - 48px)/2) !important;' +
        'top:auto !important;z-index:801 !important;' +
        'flex-direction:row !important;align-items:center !important;' +
      '}' +
      '.flot-auto.flot-der{right:calc(14px + var(--flot-i,0) * 58px) !important;left:auto !important}' +
      '.flot-auto.flot-izq{left:calc(14px + var(--flot-i,0) * 58px) !important;right:auto !important}' +
      /* El hueco de abajo: la franja deja de taparle nada al contenido. */
      '.flot-hueco{display:block;width:100%;flex:none;' +
        'height:calc(var(--flot-alto) + env(safe-area-inset-bottom,0px))}' +
      /* Refuerzo por si el separador cae dentro de algo con overflow. */
      'body{padding-bottom:calc(var(--flot-alto) + env(safe-area-inset-bottom,0px)) !important}' +
      /* Los pies que ya reservaban sitio a mano dejan de necesitarlo. */
      '.foot{padding-bottom:clamp(30px,4.5vw,50px) !important}' +
      /* Todos los flotantes con icono pasan a círculo en el teléfono. */
      '.flot-icono{width:48px !important;min-width:48px !important;height:48px !important;' +
        'padding:0 !important;border-radius:50% !important;gap:0 !important;' +
        'display:inline-flex !important;align-items:center !important;' +
        'justify-content:center !important;font-size:0 !important;' +
        'overflow:hidden !important;white-space:nowrap !important}' +
      '.flot-icono svg,.flot-icono img{width:22px !important;height:22px !important;flex:none !important}' +
      '.fab-delivery span{display:none !important}' +
      /* "Volver arriba" sobra en el teléfono: para eso está el gesto. */
      '.fab-top{display:none !important}' +
      /* Separación pareja entre los botones ya que van en fila. */
      '.flot-auto{gap:10px !important}' +
    '}';

  function arrancar() {
    if (!document.head.contains(estilo)) document.head.appendChild(estilo);
    pintar();
    marcar();
    compactar();
    /* El carrito y la pestaña de redes llegan tarde: dos pasadas más. */
    setTimeout(function () { marcar(); compactar(); }, 900);
    setTimeout(function () { marcar(); compactar(); }, 2200);
    window.addEventListener('resize', function () { marcar(); compactar(); },
                            { passive: true });
  }

  function seguro() {
    try { arrancar(); } catch (e) { /* nunca romper la página */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', seguro);
  } else {
    seguro();
  }
})();
