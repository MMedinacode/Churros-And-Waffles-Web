/* ============================================================
   HORARIO — módulo universal del portafolio de cafeterías
   ============================================================
   Cada sitio mostraba el horario a su manera: unos una línea
   ("Todos los días 9:30-20:30"), otros solo la hora de cierre, y
   varios no decían si el local estaba abierto en ese momento dentro
   de Visítanos. Este módulo unifica las dos cosas SIN tocar el HTML
   de cada proyecto:

     1. Pinta la semana COMPLETA, de lunes a domingo, marcando el día
        de hoy. Los días cerrados también se listan — que el local
        cierre el domingo es información útil, no un hueco.
     2. Muestra "Abierto ahora" / "Cerrado ahora" en vivo dentro de
        Visítanos, calculado con el horario real de ese día.

   Uso: antes de cargar este archivo, el sitio define su horario real:

     window.HORARIO = {
       dias: ["09:30 - 19:00", ..., "Cerrado"],   // lunes .. domingo
       fuente: "Google Maps, 11-09-2026"          // opcional
     };

   Si `dias` no existe, el módulo no hace nada: nunca inventa un
   horario. Los locales sin horario publicado se quedan como están.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.HORARIO;
  if (!CFG || !Array.isArray(CFG.dias) || CFG.dias.length !== 7) return;

  var NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  /* getDay() devuelve 0 para domingo; acá la semana parte en lunes. */
  function indiceHoy() {
    var d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }

  /* "09:30 - 19:00"  ->  [[570, 1140]]
     "08:00 - 13:00 y 16:00 - 21:30" -> [[480,780],[960,1290]]
     "Cerrado" -> []   ·   "Abierto 24 h" -> [[0,1440]] */
  function tramos(txt) {
    if (!txt || /cerrado/i.test(txt)) return [];
    if (/24\s*h/i.test(txt)) return [[0, 1440]];
    var out = [];
    txt.split(/\s+y\s+/i).forEach(function (parte) {
      var m = parte.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
      if (!m) return;
      var ini = (+m[1]) * 60 + (+m[2]);
      var fin = (+m[3]) * 60 + (+m[4]);
      if (fin <= ini) fin += 1440;          // cruza la medianoche
      out.push([ini, fin]);
    });
    return out;
  }

  function abiertoAhora() {
    var ahora = new Date();
    var min = ahora.getHours() * 60 + ahora.getMinutes();
    var hoy = indiceHoy();
    var ayer = (hoy + 6) % 7;
    var dentro = function (t, m) { return m >= t[0] && m < t[1]; };
    // el día de hoy, y lo que quedó abierto desde ayer pasada la medianoche
    return tramos(CFG.dias[hoy]).some(function (t) { return dentro(t, min); }) ||
           tramos(CFG.dias[ayer]).some(function (t) { return dentro(t, min + 1440); });
  }

  /* ---------- dónde va la semana ----------
     Se reutiliza la lista que el sitio ya tenga; si no hay ninguna, se
     crea una y se cuelga del bloque "Horario" de Visítanos. */
  /* Una línea en prosa del tipo "Lun a Vie 7:00–19:00 · Sábado 10:00–14:00":
     varios sitios resumen así el horario y no tienen lista ninguna. */
  var RE_DIAS = /(lunes|lun\b|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo|todos los d[íi]as)/i;
  var RE_HORA = /\d{1,2}[:.]\d{2}|\d{1,2}\s*[-–—a]\s*\d{1,2}\s*h|24\s*h|cerrado/i;
  function lineaProsa() {
    /* Se busca primero dentro de Visítanos: la misma frase suele repetirse
       en el hero o el pie, y la semana tiene que quedar donde el visitante
       va a buscarla, no en la portada. */
    var ambitos = Array.from(document.querySelectorAll(
      '#tab-visitanos, [data-tab-panel="visitanos"], #visitanos, .visitanos, section[id*="visit"]'
    ));
    ambitos.push(document);
    for (var i = 0; i < ambitos.length; i++) {
      var hit = Array.from(ambitos[i].querySelectorAll('p, span, li, div'))
        .filter(function (el) {
          if (el.querySelector('p, span, li, ul, div')) return false;   // solo hojas
          var t = (el.textContent || '').trim();
          return t.length > 8 && t.length < 180 && RE_DIAS.test(t) && RE_HORA.test(t);
        })[0];
      if (hit) return hit;
    }
    return null;
  }

  function contenedorSemana() {
    var ya = document.querySelector(
      '.horario-semana, .hours-list, #hours-list, #horario-lista, ' +
      '#hoursTable, #horas-tabla, [data-horario-semana], [data-hours]'
    );
    if (ya) return ya;

    /* Si no hay lista, se busca el rótulo "Horario" de Visítanos. Cada
       sitio lo marca distinto (h3, h4, dt, un span con clase .label…),
       así que se busca por texto y no por selector. */
    var titulo = Array.from(document.querySelectorAll('h2, h3, h4, dt, .info-titulo, .visit-label, .label'))
      .filter(function (h) {
        return /^horarios?\b/i.test((h.textContent || '').trim()) && h.children.length === 0;
      })[0];

    var ul = document.createElement('ul');
    ul.className = 'horario-semana';
    ul.setAttribute('data-horario-semana', '');

    if (titulo) {
      /* En una lista de definiciones el horario va en el <dd>, no al lado del <dt>. */
      var destino = (titulo.tagName === 'DT' && titulo.nextElementSibling &&
                     titulo.nextElementSibling.tagName === 'DD')
        ? titulo.nextElementSibling
        : null;
      if (destino) { destino.textContent = ''; destino.appendChild(ul); }
      else { titulo.parentNode.insertBefore(ul, titulo.nextSibling); }
      return ul;
    }

    /* Último recurso: ni lista ni rótulo. La semana va donde estaba la
       frase que resumía el horario, que es justo donde el visitante la
       busca; la frase misma la esconde después ocultarLineaVieja(). */
    var prosa = lineaProsa();
    if (!prosa || !prosa.parentNode) return null;
    prosa.parentNode.insertBefore(ul, prosa.nextSibling);
    return ul;
  }

  function pintarSemana() {
    var cont = contenedorSemana();
    if (!cont) return;

    cont.classList.remove('horario-parcial');
    cont.textContent = '';
    var hoy = indiceHoy();
    /* Cada sitio maqueta el horario a su manera: <ul>, <div> sueltos o
       una <table>. Se emite la etiqueta que corresponda para no romperle
       la maquetación a ninguno. */
    var esTabla = cont.tagName === 'TBODY' || cont.tagName === 'TABLE';
    var esLista = cont.tagName === 'UL' || cont.tagName === 'OL';
    var fila = esTabla ? 'tr' : (esLista ? 'li' : 'div');
    var celda = esTabla ? 'td' : 'span';

    CFG.dias.forEach(function (txt, i) {
      var li = document.createElement(fila);
      li.setAttribute('data-dia', i === 6 ? 0 : i + 1);   // compat con el JS que ya marcaba el día
      if (i === hoy) li.className = 'hs-hoy';

      var dia = document.createElement(celda);
      dia.className = 'hs-dia';
      dia.textContent = NOMBRES[i];

      var hora = document.createElement(celda);
      hora.className = 'hs-hora' + (/cerrado/i.test(txt) ? ' hs-cerrado' : '');
      hora.textContent = txt;

      li.appendChild(dia);
      li.appendChild(hora);
      cont.appendChild(li);
    });

    /* Estilos mínimos por si el sitio no traía una lista de horario:
       se inyectan una sola vez y sin pisar lo que el proyecto ya define. */
    if (!document.getElementById('horario-css')) {
      var st = document.createElement('style');
      st.id = 'horario-css';
      st.textContent =
        '[data-horario-semana]{list-style:none;margin:10px 0 0;padding:0;}' +
        '[data-horario-semana] li,[data-horario-semana] div{display:flex;justify-content:space-between;gap:18px;' +
        'padding:7px 0;border-bottom:1px solid rgba(128,128,128,.22);font-size:.93rem;}' +
        '[data-horario-semana] li:last-child,[data-horario-semana] div:last-child{border-bottom:0;}' +
        '[data-horario-semana] .hs-hora{white-space:nowrap;font-variant-numeric:tabular-nums;}' +
        /* Estas tres valen también cuando se reutiliza la lista o la tabla
           que el sitio ya traía, que no lleva el atributo de arriba. */
        '.hs-cerrado{opacity:.65;font-style:italic;}' +
        '.hs-hoy,.hs-hoy td{font-weight:700;}' +
        'td.hs-dia{padding:4px 24px 4px 0;}td.hs-hora{padding:4px 0;white-space:nowrap;}';
      document.head.appendChild(st);
    }
  }

  function minutosAhora() {
    var a = new Date();
    return a.getHours() * 60 + a.getMinutes();
  }
  function hhmm(min) {
    min = ((min % 1440) + 1440) % 1440;
    return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
  }
  /* A qué hora cierra el tramo en curso, para poder decir "cierra 21:30".
     Un local abierto 24 h no cierra: ahí no se dice nada. */
  function cierreEnCurso() {
    var m = minutosAhora(), t = tramos(CFG.dias[indiceHoy()]);
    for (var i = 0; i < t.length; i++) {
      if (m >= t[i][0] && m < t[i][1]) return (t[i][1] - t[i][0] >= 1440) ? null : t[i][1];
    }
    return null;
  }
  /* La próxima apertura, mirando hoy y los días siguientes. */
  function proximaApertura() {
    var m = minutosAhora(), hoy = indiceHoy();
    var t = tramos(CFG.dias[hoy]);
    for (var i = 0; i < t.length; i++) if (t[i][0] > m) return { min: t[i][0], dia: null };
    for (var d = 1; d <= 7; d++) {
      var idx = (hoy + d) % 7, td = tramos(CFG.dias[idx]);
      if (td.length) return { min: td[0][0], dia: NOMBRES[idx] };
    }
    return null;
  }

  /* ---------- indicador abierto / cerrado ----------
     Se actualizan TODOS los indicadores del sitio (hero, Visítanos,
     footer) con el mismo horario real: varios los calculaban con datos
     propios más viejos y terminaban contradiciendo la tabla de abajo. */
  function pintarEstado() {
    var abierto = abiertoAhora();
    var texto;
    if (abierto) {
      var c = cierreEnCurso();
      texto = 'Abierto ahora' + (c !== null ? ' · cierra ' + hhmm(c) : '');
    } else {
      var p = proximaApertura();
      texto = 'Cerrado ahora' + (p ? ' · abre ' + (p.dia ? p.dia.toLowerCase() + ' ' : '') + hhmm(p.min) : '');
    }

    /* Los ids varían por sitio (statusText2, status-text, openStatusText,
       visit-status-text…), así que se aceptan las tres convenciones. */
    var propios = Array.from(document.querySelectorAll(
      '[id*="statustext" i], [id*="status-text" i], [id*="statustexto" i], .status-text, ' +
      '.info-estado span:last-child, .visit-pill span:last-child'
    ));
    var encontrado = false;
    propios.forEach(function (el) {
      if (!el || el.children.length) return;
      el.textContent = texto;
      /* Queda marcado para que ocultarLineaVieja() no lo confunda con la
         frase vieja: "Cerrado ahora · abre sábado 10:00" también nombra
         un día y una hora. */
      el.setAttribute('data-horario-estado', '');
      encontrado = true;
      var caja = el.closest('.pill, .status-line, .visit-pill, .info-estado, p, div') || el.parentNode;
      /* Varios sitios escondían la píldora entera porque Google no
         publicaba el horario completo (4 Ases lo dice en su script.js).
         Ahora que el dato existe y es real, se vuelve a mostrar. */
      el.hidden = false;
      if (caja) caja.hidden = false;
      var punto = caja && caja.querySelector ? caja.querySelector('.status-dot, [id*="status-dot"], [id*="statusDot"]') : null;
      if (punto) {
        punto.classList.toggle('closed', !abierto);
        /* Varios sitios pintan el punto con estilo inline desde su propio
           JS, y los de Tailwind con una clase bg-*; sin esto el color se
           queda con el cálculo viejo y contradice al texto. */
        if (punto.style.background) punto.style.background = abierto ? '#7C9A6B' : '#D97757';
        var tw = /\bbg-(green|emerald|red|rose|orange)-\d{3}\b/;
        if (tw.test(punto.className)) {
          punto.className = punto.className.replace(tw, abierto ? 'bg-green-400' : 'bg-red-400');
        }
      }
    });
    /* Actualizar los indicadores que el sitio ya tenía no basta: en varios
       están solo en el hero o en el pie, y lo que pidió el cliente es verlo
       en Visítanos, junto al horario. Si en esa zona no quedó ninguno, se
       crea uno ahí. */
    var cont = document.querySelector(
      '[data-horario-semana], .horario-semana, .hours-list, #hours-list, #horario-lista, #hoursTable'
    );
    if (!cont) return;
    var zona = cont.closest('section, .section, [data-tab-panel], #visitanos, #tab-visitanos') || cont.parentNode;
    if (encontrado && zona && zona.querySelector('[data-horario-estado]')) return;
    /* En una tabla el párrafo no puede ir dentro: se cuelga del bloque. */
    if (cont.tagName === 'TBODY' || cont.tagName === 'TR') cont = cont.closest('table') || cont;

    var p = document.getElementById('horario-estado');
    var nuevo = !p;
    if (nuevo) {
      p = document.createElement('p');
      p.id = 'horario-estado';
      p.setAttribute('data-horario-estado', '');
      p.style.cssText = 'display:flex;align-items:center;gap:8px;margin:0 0 10px;font-weight:700;font-size:.95rem;';
      p.appendChild(document.createElement('span'));   // punto
      p.appendChild(document.createElement('span'));   // texto
    }
    var punto = p.firstChild;
    punto.className = 'status-dot' + (abierto ? '' : ' closed');
    punto.style.cssText = 'width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:' +
      (abierto ? '#6FD08C' : '#E8A6A6') + ';';
    p.lastChild.textContent = texto;
    if (nuevo) cont.parentNode.insertBefore(p, cont);
  }

  /* Resumen de una línea, agrupando días seguidos con el mismo horario:
     "Lun a Vie 09:30 - 18:30 · Sáb 10:00 - 14:00 · Dom cerrado". Sirve
     para el pie y el hero, donde una tabla de siete filas no cabe. */
  var CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  function resumen() {
    var grupos = [], i = 0;
    while (i < 7) {
      var j = i;
      while (j + 1 < 7 && CFG.dias[j + 1] === CFG.dias[i]) j++;
      grupos.push([i, j, CFG.dias[i]]);
      i = j + 1;
    }
    if (grupos.length === 1 && !/cerrado/i.test(grupos[0][2])) {
      return 'Todos los días ' + grupos[0][2];
    }
    return grupos.map(function (g) {
      var etiqueta = g[0] === g[1] ? CORTOS[g[0]] : CORTOS[g[0]] + ' a ' + CORTOS[g[1]];
      /* "Lun a Vie abierto 24 h" se lee mejor que "... Abierto 24 h". */
      return etiqueta + ' ' + (/cerrado/i.test(g[2]) ? 'cerrado' : g[2].replace(/^Abierto/, 'abierto'));
    }).join(' · ');
  }

  /* ---------- la línea vieja en prosa ----------
     Casi todos los sitios traían el horario resumido en una frase
     ("Lunes a viernes 9:00-20:00 · Sábado..."). Con la tabla completa
     arriba queda duplicada, y peor: si la frase venía de otra fuente,
     las dos versiones se contradicen a la vista. Se oculta, no se
     borra, para no perder el dato del HTML original. */
  function ocultarLineaVieja() {
    var cont = document.querySelector(
      '[data-horario-semana], .horario-semana, .hours-list, #hours-list, #horario-lista, #hoursTable'
    );
    if (!cont) return;
    var bloque = cont.closest('section, .section, [data-tab-panel], #visitanos, #tab-visitanos') || cont.parentNode;
    if (!bloque) return;
    /* Las notas del tipo "horario por confirmar" o "es una estimación"
       dejan de ser ciertas en cuanto la tabla trae el horario real. */
    var dudas = /(por confirmar|sin confirmar|estimaci[óo]n|estimado|aproximad|a confirmar)/i;
    var linea = resumen();

    function repasar(raiz, dentroDeVisitanos) {
      Array.from(raiz.querySelectorAll('p, span, li, dd')).forEach(function (el) {
        if (cont.contains(el) || el.id === 'horario-estado' || el.closest('#horario-estado')) return;
        if (el.hasAttribute('data-horario-estado') || el.closest('[data-horario-estado]')) return;
        if (el.hasAttribute('data-horario-resumen')) return;
        if (el.querySelector('p, span, li, ul')) return;      // solo hojas
        var t = (el.textContent || '').trim();
        if (t.length > 180) return;
        var esProsa = RE_DIAS.test(t) && RE_HORA.test(t);
        var esDuda  = dudas.test(t) && /horario|abre|cierra|semana|s[áa]bado|domingo/i.test(t);
        if (!esProsa && !esDuda) return;
        /* Junto a la tabla la frase sobra; lejos de ella (pie, hero) dejar
           un hueco sería peor, así que se reescribe con el dato real. */
        if (dentroDeVisitanos || !esProsa) { el.hidden = true; return; }
        if (raiz.querySelector('[data-horario-resumen]')) { el.hidden = true; return; }
        el.textContent = linea;
        el.setAttribute('data-horario-resumen', '');
      });
    }

    repasar(bloque, true);
    Array.from(document.querySelectorAll('footer, .site-footer, .hero')).forEach(function (z) {
      if (z === bloque || bloque.contains(z) || z.contains(bloque)) return;
      repasar(z, false);
    });
  }

  function arrancar() {
    try { pintarSemana(); pintarEstado(); ocultarLineaVieja(); }
    catch (e) { /* nunca romper la página */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arrancar);
  } else {
    arrancar();
  }
  /* Los sitios son SPA por pestañas: al abrir Visítanos puede que el
     bloque recién exista. Se reintenta un par de veces, barato. */
  setTimeout(arrancar, 600);
  setTimeout(arrancar, 1800);
})();
