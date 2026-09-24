  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  let theme = localStorage.getItem('maed-theme') || 'dark';
  function syncThemeToggle(){
    if (!toggle) return;
    const isDark = theme === 'dark';
    toggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    toggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  root.setAttribute('data-theme', theme);
  syncThemeToggle();
  if (toggle) {
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', theme);
      localStorage.setItem('maed-theme', theme);
      syncThemeToggle();
    });
  }

  const headerEl = document.querySelector('header');
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  function getNavFocusables(){
    return [...siteNav.querySelectorAll('a, button')].filter(el => !el.hasAttribute('disabled'));
  }
  function setNavOpen(open){
    headerEl.classList.toggle('nav-open', open);
    document.body.classList.toggle('nav-locked', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if(open){
      const first = getNavFocusables()[0];
      if(first) setTimeout(() => first.focus(), 50);
    } else {
      navToggle.focus();
    }
  }
  navToggle.addEventListener('click', () => setNavOpen(!headerEl.classList.contains('nav-open')));
  siteNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setNavOpen(false));
  });
  siteNav.addEventListener('keydown', (e) => {
    if(!headerEl.classList.contains('nav-open')) return;
    if(e.key !== 'Tab') return;
    const items = getNavFocusables();
    if(!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  });
  window.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && headerEl.classList.contains('nav-open')){
      setNavOpen(false);
    }
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* monochrome dot field: ambient drift + cursor follow */
  const canvas = document.getElementById('dotField');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, cols, rows, spacing = 26, dots = [];
  let mouse = { x: 0, y: 0, tx: 0, ty: 0, lastMove: 0, following: false };
  const IDLE_AFTER_MS = 1400;

  function buildGrid(){
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
    canvas.style.width = canvas.offsetWidth + 'px';
    cols = Math.ceil(w / (spacing * devicePixelRatio)) + 1;
    rows = Math.ceil(h / (spacing * devicePixelRatio)) + 1;
    dots = [];
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        dots.push({
          x: i * spacing * devicePixelRatio,
          y: j * spacing * devicePixelRatio,
          base: 0.55 + Math.random()*0.4,
          phase: Math.random()*Math.PI*2
        });
      }
    }
    if(!mouse.following){
      mouse.x = mouse.tx = w * 0.5;
      mouse.y = mouse.ty = h * 0.42;
    }
  }

  function ambientTarget(t){
    return {
      x: w * (0.5 + 0.44 * Math.sin(t * 0.00012) + 0.1 * Math.sin(t * 0.00031)),
      y: h * (0.5 + 0.4 * Math.sin(t * 0.00015 + 1.1) + 0.08 * Math.cos(t * 0.00022))
    };
  }

  function draw(t){
    ctx.clearRect(0,0,w,h);
    const now = performance.now();
    const following = mouse.following && (now - mouse.lastMove) < IDLE_AFTER_MS;
    if(!following){
      mouse.following = false;
      const ambient = ambientTarget(t);
      mouse.tx = ambient.x;
      mouse.ty = ambient.y;
    }
    const ease = following ? 0.14 : 0.018;
    mouse.x += (mouse.tx - mouse.x) * ease;
    mouse.y += (mouse.ty - mouse.y) * ease;
    const isLight = root.getAttribute('data-theme') === 'light';
    const radius = 360 * devicePixelRatio;
    for(const d of dots){
      const dx = d.x - mouse.x, dy = d.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const proximity = Math.max(0, 1 - dist / radius);
      const idle = 0.5 + 0.5 * Math.sin(t * 0.0009 + d.phase);
      const brightness = Math.min(1, d.base * 0.32 + idle * 0.28 + proximity * 0.8);
      const size = (1 + proximity * 2.2 + idle * 0.35) * devicePixelRatio;
      const alpha = isLight ? brightness * 0.55 : brightness * 0.5;
      ctx.fillStyle = isLight ? `rgba(23,22,26,${alpha})` : `rgba(245,244,242,${alpha})`;
      ctx.beginPath();
      ctx.roundRect(d.x - size/2, d.y - size/2, size, size, size*0.3);
      ctx.fill();
    }
    if(!reduceMotion) requestAnimationFrame(draw);
  }

  function setPointer(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    mouse.tx = (clientX - rect.left) * devicePixelRatio;
    mouse.ty = (clientY - rect.top) * devicePixelRatio;
    mouse.lastMove = performance.now();
    mouse.following = true;
  }

  window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if(!e.touches[0]) return;
    setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('resize', buildGrid);

  buildGrid();
  requestAnimationFrame(draw);
  if(reduceMotion) draw(0);

  /* ticket pull (guarded: only runs on pages with a ticket) */
  const ticketNoEl = document.getElementById('ticketNo');
  if (ticketNoEl) {
    ticketNoEl.textContent = String(Math.floor(1000 + Math.random()*9000));
    const ticketFront = document.getElementById('ticketFront');
    const ticketFace = document.getElementById('ticketFace');
    const ticketOverlay = document.getElementById('ticketOverlay');
    let ticketPulled = false;
    const openTicket = () => {
      if (ticketPulled) return;
      ticketPulled = true;
      ticketFront.classList.add('pulled');
      ticketOverlay.classList.add('show');
      ticketOverlay.hidden = false;
      ticketFace.setAttribute('aria-expanded', 'true');
      ticketFace.setAttribute('tabindex', '-1');
      setTimeout(() => {
        ticketFront.classList.add('flipped');
        const firstField = document.getElementById('ticketName');
        if (firstField) firstField.focus();
      }, 480);
    };
    ticketFace.addEventListener('click', openTicket);
    ticketFace.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openTicket();
      }
    });
    const closeTicket = () => {
      ticketPulled = false;
      ticketFront.classList.remove('flipped');
      ticketFront.classList.remove('pulled');
      ticketOverlay.classList.remove('show');
      ticketOverlay.hidden = true;
      ticketFace.setAttribute('aria-expanded', 'false');
      ticketFace.setAttribute('tabindex', '0');
      ticketFace.focus();
    };
    ticketOverlay.addEventListener('click', closeTicket);
    const ticketClose = document.getElementById('ticketClose');
    if (ticketClose) {
      ticketClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTicket();
      });
    }
    document.querySelectorAll('.ticket-chip').forEach(c => {
      c.addEventListener('click', () => {
        document.querySelectorAll('.ticket-chip').forEach(x => {
          x.classList.remove('active');
          x.setAttribute('aria-pressed', 'false');
        });
        c.classList.add('active');
        c.setAttribute('aria-pressed', 'true');
      });
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && ticketPulled) closeTicket();
    });
  }

  const tlUsesTree = () =>
    !!document.querySelector('.timeline-vertical') ||
    window.matchMedia('(max-width:700px)').matches;
  const tlClickMode = () =>
    window.matchMedia('(max-width:700px), (hover: none)').matches;
  const tlAccent = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#41899b';

  function clearTlTrees() {
    document.querySelectorAll('svg.tl-tree').forEach(s => s.remove());
  }

  function drawTlTree(node) {
    if (!tlUsesTree() || !node) return;
    const label = node.querySelector('.tl-label');
    const pills = [...node.querySelectorAll('.tl-subnode')];
    if (!label || !pills.length) return;

    let svg = node.querySelector('svg.tl-tree');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('tl-tree');
      svg.setAttribute('aria-hidden', 'true');
      node.appendChild(svg);
    }

    const nr = node.getBoundingClientRect();
    const lr = label.getBoundingClientRect();
    const w = Math.ceil(nr.width);
    const h = Math.ceil(nr.height);
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const startX = lr.right - nr.left + 6;
    const startY = lr.top + lr.height / 2 - nr.top;
    const trunkX = startX + 16;
    const bend = 12;

    const centers = pills.map(p => {
      const r = p.getBoundingClientRect();
      return {
        x: r.left - nr.left,
        y: r.top + r.height / 2 - nr.top
      };
    });
    const last = centers[centers.length - 1];
    if (!last) return;
    const peel = 12;

    // One continuous stroke: from label → down the trunk → curves into the last pill
    const spine = [
      `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
      `L ${(trunkX - bend).toFixed(1)} ${startY.toFixed(1)}`,
      `Q ${trunkX.toFixed(1)} ${startY.toFixed(1)} ${trunkX.toFixed(1)} ${(startY + bend).toFixed(1)}`,
      `L ${trunkX.toFixed(1)} ${(last.y - peel).toFixed(1)}`,
      `C ${trunkX.toFixed(1)} ${(last.y - peel).toFixed(1)} ${trunkX.toFixed(1)} ${last.y.toFixed(1)} ${(trunkX + peel).toFixed(1)} ${last.y.toFixed(1)}`,
      `L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`
    ].join(' ');

    // Intermediate branches peel off the same trunk (same path stroke)
    const forks = centers.slice(0, -1).map(({ x, y }) => [
      `M ${trunkX.toFixed(1)} ${(y - peel).toFixed(1)}`,
      `C ${trunkX.toFixed(1)} ${(y - peel).toFixed(1)} ${trunkX.toFixed(1)} ${y.toFixed(1)} ${(trunkX + peel).toFixed(1)} ${y.toFixed(1)}`,
      `L ${x.toFixed(1)} ${y.toFixed(1)}`
    ].join(' ')).join(' ');

    const stroke = tlAccent();
    svg.innerHTML = `<path d="${spine} ${forks}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  function scheduleTlTree(node) {
    requestAnimationFrame(() => requestAnimationFrame(() => drawTlTree(node)));
  }

  function refreshTlTrees() {
    clearTlTrees();
    const active =
      document.querySelector('.tl-node.open') ||
      document.querySelector('.timeline-vertical .tl-node:hover') ||
      document.querySelector('.timeline-vertical .tl-node:focus-within');
    if (active && tlUsesTree()) scheduleTlTree(active);
  }

  function setTlOpen(n, open) {
    document.querySelectorAll('.tl-node').forEach(x => {
      x.classList.remove('open');
      x.setAttribute('aria-expanded', 'false');
    });
    clearTlTrees();
    if (open) {
      n.classList.add('open');
      n.setAttribute('aria-expanded', 'true');
      scheduleTlTree(n);
    }
  }

  function clearDesktopOpen() {
    if (tlClickMode()) return;
    document.querySelectorAll('.tl-node.open').forEach(x => {
      x.classList.remove('open');
      x.setAttribute('aria-expanded', 'false');
    });
  }

  document.querySelectorAll('.tl-node').forEach(n => {
    const label = n.querySelector('.tl-label');
    if (label) n.setAttribute('aria-label', label.textContent.trim() + ' services');

    n.addEventListener('click', () => {
      if (!tlClickMode()) return;
      setTlOpen(n, !n.classList.contains('open'));
    });

    n.addEventListener('mouseenter', () => {
      if (tlClickMode()) return;
      clearDesktopOpen();
      n.setAttribute('aria-expanded', 'true');
      clearTlTrees();
      scheduleTlTree(n);
    });
    n.addEventListener('mouseleave', () => {
      if (tlClickMode()) return;
      if (document.activeElement === n || n.contains(document.activeElement)) return;
      n.setAttribute('aria-expanded', 'false');
      clearTlTrees();
    });

    n.addEventListener('focusin', () => {
      if (tlClickMode()) return;
      clearDesktopOpen();
      n.setAttribute('aria-expanded', 'true');
      clearTlTrees();
      scheduleTlTree(n);
    });
    n.addEventListener('focusout', () => {
      if (tlClickMode()) return;
      requestAnimationFrame(() => {
        if (n.contains(document.activeElement)) return;
        n.setAttribute('aria-expanded', 'false');
        clearTlTrees();
      });
    });

    n.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (!tlClickMode()) return;
        e.preventDefault();
        setTlOpen(n, !n.classList.contains('open'));
      }
      if (e.key === 'Escape' && n.classList.contains('open')) {
        setTlOpen(n, false);
      }
    });
  });
  window.addEventListener('resize', () => {
    clearDesktopOpen();
    refreshTlTrees();
  });

