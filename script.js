// Reveal on scroll for soft entrance animations
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

const observeReveal = (el) => {
  if (!el) return;
  observer.observe(el);
};

document.querySelectorAll('.reveal').forEach(observeReveal);

// Simple type swap to keep hero dynamic
const subtitle = document.querySelector('.hero__subtitle');
const phrases = [
  'Combino diseño centrado en el usuario, arquitectura limpia y despliegues confiables.',
  'Orquesto experiencias coherentes en mobile, web y escritorio con enfoque en negocio.',
  'Entrego software que se puede medir, mantener y escalar sin drama.'
];
let idx = 0;
setInterval(() => {
  idx = (idx + 1) % phrases.length;
  subtitle.textContent = phrases[idx];
}, 4200);

// Avatar hover/click: subtle scale (handled in CSS) and click sound
const avatar = document.querySelector('.img__github');
if (avatar) {
  // Reemplaza la ruta con tu mp3 (por ejemplo: 'sonidos/click-avatar.mp3')
  const avatarSound = new Audio('imagenes/maullido.mp3');

  avatar.addEventListener('click', () => {
    // Reinicia para poder reproducir en clics seguidos
    avatarSound.currentTime = 0;
    avatarSound.play().catch(() => {});
  });
}

// Cargar proyectos desde GitHub (con caché para evitar límites de API)
const GH_USER = 'JUCUVIK'; // <- cambia esto por tu usuario real
const GH_CACHE_KEY = `gh_projects_${GH_USER}_cache_v1`;
const projectsGrid = document.querySelector('#projects-grid');
const projectsStatus = document.querySelector('#projects-status');
const projectsRefresh = document.querySelector('#projects-refresh');

const setStatus = (text) => {
  if (projectsStatus) projectsStatus.textContent = text;
};

const formatDate = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(date);
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(GH_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const saveCache = (repos) => {
  try {
    localStorage.setItem(GH_CACHE_KEY, JSON.stringify({ repos, timestamp: Date.now() }));
  } catch (e) {
    // Si el almacenamiento está lleno o bloqueado, seguimos sin caché
  }
};

const renderProjects = (repos) => {
  if (!projectsGrid) return;
  projectsGrid.innerHTML = '';

  if (!repos.length) {
    projectsGrid.innerHTML = '<p class="muted">No hay repositorios públicos aún.</p>';
    return;
  }

  repos.forEach(repo => {
    const card = document.createElement('article');
    card.className = 'card reveal';
    card.innerHTML = `
      <div class="project__header">
        <h3 class="m-0">${repo.name}</h3>
        ${repo.language ? `<span class="pill">${repo.language}</span>` : ''}
      </div>
      <p class="skill__desc">${repo.description || 'Repositorio sin descripción'}</p>
      <div class="project__meta">
        <span>★ ${repo.stargazers_count}</span>
        <a class="link-accent" href="${repo.html_url}" target="_blank" rel="noreferrer">Ver en GitHub</a>
      </div>
      <p class="muted m-0" style="margin-top: 0.4rem;">Actualizado: ${formatDate(repo.pushed_at)}</p>
    `;
    projectsGrid.appendChild(card);
    observeReveal(card);
  });
};

const renderFromCache = () => {
  const cached = loadCache();
  if (!cached || !cached.repos) return false;
  renderProjects(cached.repos);
  setStatus(cached.timestamp ? `Mostrando datos guardados. Última actualización: ${formatDate(cached.timestamp)}.` : 'Mostrando datos guardados.');
  return true;
};

const loadGithubProjects = async ({ forceRefresh = false } = {}) => {
  if (!projectsGrid) return;
  if (!forceRefresh && renderFromCache()) return;

  setStatus('Solicitando proyectos a GitHub…');

  try {
    const resp = await fetch(`https://api.github.com/users/${GH_USER}/repos?sort=updated&per_page=9`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'portfolio-gh-fetch'
      }
    });

    if (resp.status === 403) {
      throw new Error('rate-limit');
    }

    if (!resp.ok) throw new Error('Error al cargar GitHub');
    const data = await resp.json();
    const filtered = data.filter(r => !r.fork).slice(0, 6);
    renderProjects(filtered);
    saveCache(filtered);
    setStatus(filtered.length ? `Actualizado: ${formatDate(Date.now())}.` : 'Sin repos públicos para mostrar.');
  } catch (err) {
    const showedCache = renderFromCache();
    if (err?.message === 'rate-limit') {
      setStatus(showedCache ? 'GitHub limit alcanzado. Mostrando caché; vuelve a intentar en unos minutos.' : 'GitHub limit alcanzado. Intenta de nuevo en unos minutos.');
    } else {
      if (!showedCache) setStatus('No se pudieron cargar los proyectos (revisa usuario o límite de API).');
      else setStatus('No se pudo actualizar. Mostrando la última versión guardada.');
    }
  }
};

if (projectsRefresh) {
  projectsRefresh.addEventListener('click', () => loadGithubProjects({ forceRefresh: true }));
}

loadGithubProjects();

// Fondo interactivo: cuadrado que se desplaza con ratón y scroll
const initFloatingSquare = () => {
  const square = document.createElement('div');
  square.className = 'floating-square';
  document.body.appendChild(square);

  let x = window.innerWidth * 0.7;
  let y = window.innerHeight * 0.35;
  let vx = 0;
  let vy = 0;
  const gravity = 0.12;
  const bounce = 0.55;
  let mouseX = null;
  let mouseY = null;
  let lastScrollY = window.scrollY;
  let scrollVel = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    scrollVel = currentY - lastScrollY;
    lastScrollY = currentY;
  }, { passive: true });

  const tick = () => {
    // Pequeño drift para que no se quede quieto
    const driftX = Math.sin(Date.now() * 0.0015) * 0.4;
    const driftY = Math.cos(Date.now() * 0.0012) * 0.3;

    if (mouseX !== null && mouseY !== null) {
      const dx = x - mouseX;
      const dy = y - mouseY;
      const dist = Math.hypot(dx, dy) || 1;
      const influence = 220;
      if (dist < influence) {
        const force = (1 - dist / influence) * 0.9;
        vx += (dx / dist) * force;
        vy += (dy / dist) * force;
      }
    }

    // Empuje por scroll (ligero)
    vy -= scrollVel * 0.015;
    scrollVel *= 0.9;

    vx *= 0.94;
    vy *= 0.94;

    // Gravedad constante
    vy += gravity;

    x += vx + driftX;
    y += vy + driftY;

    // Mantener dentro de viewport con margen y rebote suave
    const margin = 60;
    if (x < margin) {
      x = margin;
      vx *= -bounce;
    } else if (x > window.innerWidth - margin) {
      x = window.innerWidth - margin;
      vx *= -bounce;
    }

    if (y < margin) {
      y = margin;
      vy *= -bounce;
    } else if (y > window.innerHeight - margin) {
      y = window.innerHeight - margin;
      vy *= -bounce;
    }

    square.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(tick);
  };

  tick();
};

initFloatingSquare();
