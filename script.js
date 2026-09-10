/* ============================================================
   CHURROS AND WAFFLES — datos y lógica
   ============================================================
   PRECIOS DE CHURROS: REALES. Están transcritos de sus propias gráficas
   publicadas en @churrosandwaffles_ (leídas el 10-09-2026): churros
   tradicionales, rellenos y con topping.
   ⚠️ EL RESTO SIN PRECIO. Waffles, helados, milkshakes y café no tienen
   precio publicado en ningún canal: van como "Consultar". Los productos
   listados salen de sus reseñas reales, del cartel de su propia fachada y
   de los destacados de su ficha de Google. Ninguno inventado.
   ============================================================ */

const MENU = {
  "churros": {
    "label": "Churros",
    "items": [
      {
        "n": "Churros tradicionales · 8 unidades",
        "p": 3990,
        "d": "Agrega tu salsa: nutella, manjar, frambuesa, chocolate o leche condensada",
        "img": "churros-tradicionales.jpg"
      },
      {
        "n": "Churros tradicionales · 12 unidades",
        "p": 5490,
        "d": "Agrega tu salsa: nutella, manjar, frambuesa, chocolate o leche condensada"
      },
      {
        "n": "Churros tradicionales · 16 unidades",
        "p": 6990,
        "d": "Agrega tu salsa: nutella, manjar, frambuesa, chocolate o leche condensada"
      },
      {
        "n": "Churro relleno de frambuesa",
        "p": 1190,
        "img": "churros-rellenos.jpg"
      },
      {
        "n": "Churro relleno de manjar",
        "p": 2190
      },
      {
        "n": "Churro relleno de nutella",
        "p": 2490
      },
      {
        "n": "Churros con topping · 9 unidades",
        "p": 6200,
        "d": "Galleta oreo, manjar nuez, manjar maní, chocolate crema chantilly o chocolateada",
        "img": "churros-topping.jpg"
      }
    ]
  },
  "waffles": {
    "label": "Waffles",
    "items": [
      {
        "n": "Oreo Fruit Cream",
        "d": "Waffle con frutillas, galleta oreo, chocolate y crema",
        "img": "oreo-fruit-cream.jpg"
      },
      {
        "n": "Waffles",
        "d": "\"Exquisitos los wafles, muy buenos y económicos\" — reseña real"
      }
    ]
  },
  "helados": {
    "label": "Helados y milkshakes",
    "items": [
      {
        "n": "Helados",
        "d": "Nombrados en el cartel de su propia fachada"
      },
      {
        "n": "Milkshake",
        "d": "Nombrado en el cartel de su propia fachada"
      },
      {
        "n": "Granizados",
        "d": "Nombrados en una de sus reseñas reales"
      },
      {
        "n": "Frutillas con crema",
        "d": "Nombradas en una de sus reseñas reales"
      },
      {
        "n": "Ice Rolls Cream",
        "d": "Es el destacado del menú en su propia ficha de Google"
      }
    ]
  },
  "cafeteria": {
    "label": "Café y bebidas",
    "items": [
      {
        "n": "Café",
        "d": "Nombrado en el cartel de su propia fachada"
      },
      {
        "n": "Jugos naturales",
        "d": "Nombrados en una de sus reseñas reales"
      },
      {
        "n": "Bebidas",
        "d": "Nombradas en el cartel de su propia fachada"
      },
      {
        "n": "Chocolatinas",
        "d": "Nombradas en el cartel de su propia fachada"
      }
    ]
  }
};

const money = n => '$' + n.toLocaleString('es-CL');

const tabsEl   = document.getElementById('menuTabs');
const panelsEl = document.getElementById('menuPanels');

Object.keys(MENU).forEach((key, i) => {
  const tab = document.createElement('button');
  tab.className = 'menu-tab' + (i === 0 ? ' active' : '');
  tab.type = 'button';
  tab.textContent = MENU[key].label;
  tab.dataset.key = key;
  tab.setAttribute('role', 'tab');
  tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
  tab.addEventListener('click', () => showTab(key));
  tabsEl.appendChild(tab);

  const panel = document.createElement('div');
  panel.className = 'menu-panel' + (i === 0 ? ' active' : '');
  panel.id = 'panel-' + key;

  const grid = document.createElement('div');
  grid.className = 'menu-grid';

  MENU[key].items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'menu-item reveal';

    if (item.img) {
      // La clase cf-thumb la necesita el grid de .menu-item para ubicarla en
      // su columna; sin ella la miniatura caia fuera de las areas y abria
      // una fila extra.
      const cont = document.createElement('div');
      cont.className = 'cf-thumb';
      const im = document.createElement('img');
      im.src = 'fotos/' + item.img; im.alt = item.n; im.loading = 'lazy';
      im.style.cssText = 'width:58px;height:58px;object-fit:cover;border-radius:12px;';
      cont.appendChild(im);
      row.appendChild(cont);
    }

    const texto = document.createElement('div');
    texto.className = 'menu-item-text';
    const nombre = document.createElement('span');
    nombre.className = 'name';
    nombre.textContent = item.n;
    texto.appendChild(nombre);

    if (item.d) {
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = item.d;
      texto.appendChild(desc);
    }

    // Sin precio publicado: "Consultar", nunca un monto inventado.
    const precio = document.createElement('div');
    precio.className = 'price';
    precio.textContent = item.p ? money(item.p) : 'Consultar';

    row.appendChild(texto);
    row.appendChild(precio);
    grid.appendChild(row);
  });

  panel.appendChild(grid);
  panelsEl.appendChild(panel);
});

function showTab(key) {
  document.querySelectorAll('.menu-tab').forEach(t => {
    const activo = t.dataset.key === key;
    t.classList.toggle('active', activo);
    t.setAttribute('aria-selected', activo ? 'true' : 'false');
  });
  document.querySelectorAll('.menu-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + key);
  });
  initScrollReveal();
}

/* ---------- NAVEGACIÓN POR PESTAÑAS ---------- */
const navLinks = document.getElementById('navLinks');

function goToTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.dataset.tabPanel === tabId);
  });
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.tab === tabId);
  });
  navLinks.classList.remove('open');
  document.getElementById('navToggle').setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  initScrollReveal();
}

document.querySelectorAll('[data-tab]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); goToTab(el.dataset.tab); });
});

document.getElementById('navToggle').addEventListener('click', function () {
  const abierto = navLinks.classList.toggle('open');
  this.setAttribute('aria-expanded', abierto ? 'true' : 'false');
});

/* ---------- INDICADOR ABIERTO / CERRADO ----------
   Su Instagram dice 'LUNES a DOMINGO 4:30 a 21:30'. Como el cierre viene en formato de 24 h, se interpreta la apertura como las 16:30 (una churrería no abre a las 4:30 de la madrugada). CONFIRMAR con el local. Google no publica horario porque la ficha ni siquiera está reclamada. */
function horarioDeHoy() {
  return [16 * 60 + 30, 21 * 60 + 30];
}

function actualizarEstado(dotId, textId) {
  const dot  = document.getElementById(dotId);
  const text = document.getElementById(textId);
  if (!dot || !text) return;
  const ahora   = new Date();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const h       = horarioDeHoy();
  if (!h) {
    // Sin horario publicado: se esconde la pildora entera en vez de
    // afirmar que esta cerrado, cosa que no nos consta.
    const caja = text.closest('.pill, .status-line') || text.parentElement;
    if (caja) caja.hidden = true;
    return;
  }
  const abierto = minutos >= h[0] && minutos < h[1];
  text.textContent = abierto ? 'Abierto ahora' : 'Cerrado ahora';
  dot.classList.toggle('closed', !abierto);
}

actualizarEstado('statusDot', 'statusText');
actualizarEstado('statusDot2', 'statusText2');

/* ---------- SCROLL REVEAL (con red de seguridad) ---------- */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach((el, i) => {
    el.style.transitionDelay = (Math.min(i % 6, 6) * 55) + 'ms';
    io.observe(el);
  });

  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.in)').forEach(el => el.classList.add('in'));
  }, 1200);
}
initScrollReveal();

window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader').classList.add('done'), 320);
});
