(function () {
  const FEED_ENDPOINTS = ['/api/journal', 'data/journal.json'];
  const SECTION_LABELS = {
    'weekly-brief': 'The Weekly Brief',
    'field-notes': 'Field Notes',
    'under-the-hood': 'Under the Hood',
    toolkit: 'Toolkit',
    perspective: 'Perspective',
    general: 'Journal',
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function coverUrl(cover, width) {
    if (!cover) return '';
    if (cover.includes('substackcdn.com/image/fetch')) {
      return cover.replace(/([?&,]w_)\d+/g, `$1${width}`).replace(/w_\d+/, `w_${width}`);
    }
    return cover;
  }

  function thumbHtml(post, width, eager) {
    if (post.cover) {
      const src = escapeHtml(coverUrl(post.cover, width));
      return `<div class="journal-story-thumb"><img src="${src}" alt="" width="${width}" height="${Math.round(width * 0.625)}" loading="${eager ? 'eager' : 'lazy'}"></div>`;
    }
    return `<div class="journal-story-thumb journal-story-thumb--text" aria-hidden="true"><span>${escapeHtml(SECTION_LABELS[post.section] || 'MAED')}</span></div>`;
  }

  function storyCard(post, opts) {
    opts = opts || {};
    const metaBits = [];
    if (opts.showSection !== false) metaBits.push(SECTION_LABELS[post.section] || 'Journal');
    const date = formatDate(post.date);
    if (date) metaBits.push(date);
    const meta = metaBits.join(' · ');
    const classes = ['journal-story'];
    if (opts.feature) classes.push('journal-story--feature');
    return `<a class="${classes.join(' ')}" href="${escapeHtml(post.url)}" target="_blank" rel="noopener">
      ${thumbHtml(post, opts.width || 800, !!opts.eager)}
      <div class="article-meta">${escapeHtml(meta)}</div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${escapeHtml(post.subtitle || '')}</p>
    </a>`;
  }

  function soonCard(sectionLabel, copy, cta) {
    const href = cta ? 'https://maedjournal.substack.com/subscribe' : 'https://maedjournal.substack.com';
    const label = cta ? 'Subscribe' : 'Coming soon';
    const title = cta ? 'Get new writing in your inbox' : 'Coming soon';
    const body = copy || 'New pieces will appear here automatically from Substack.';
    return `<a class="journal-story journal-story--soon" href="${href}" target="_blank" rel="noopener">
      <div class="journal-story-thumb journal-story-thumb--soon" aria-hidden="true"><span>${label}</span></div>
      <div class="article-meta">${escapeHtml(sectionLabel)}</div>
      <h3>${title}</h3>
      <p>${escapeHtml(body)}</p>
    </a>`;
  }

  function renderLead(el, post) {
    if (!el || !post) return;
    const meta = `${SECTION_LABELS[post.section] || 'Journal'} · ${formatDate(post.date)}`;
    el.innerHTML = `
      <a class="journal-lead-media" href="${escapeHtml(post.url)}" target="_blank" rel="noopener">
        ${post.cover
          ? `<img src="${escapeHtml(coverUrl(post.cover, 1600))}" alt="" width="1600" height="1000" loading="eager">`
          : `<div class="journal-story-thumb journal-story-thumb--text" style="aspect-ratio:16/10;width:100%;height:100%;"><span>${escapeHtml(SECTION_LABELS[post.section] || 'MAED')}</span></div>`}
      </a>
      <div class="journal-lead-copy">
        <div class="article-meta">${escapeHtml(meta)}</div>
        <h2 class="journal-lead-title">
          <a href="${escapeHtml(post.url)}" target="_blank" rel="noopener">${escapeHtml(post.title)}</a>
        </h2>
        <p class="journal-lead-dek">${escapeHtml(post.subtitle || '')}</p>
        <a class="article-link" href="${escapeHtml(post.url)}" target="_blank" rel="noopener">Read on Substack <span aria-hidden="true">→</span><span class="sr-only"> (opens in a new tab)</span></a>
      </div>`;
  }

  function fillGrid(el, posts, opts) {
    if (!el) return;
    opts = opts || {};
    if (!posts.length) {
      el.innerHTML = soonCard(opts.emptyLabel || 'Journal', opts.emptyCopy) + (opts.includeSubscribe ? soonCard(opts.emptyLabel || 'Journal', 'New writing from the Journal, delivered on Substack.', true) : '');
      return;
    }
    el.innerHTML = posts.map((p) => storyCard(p, opts)).join('');
  }

  function renderHome(posts) {
    const feature = document.querySelector('[data-journal-home-feature]');
    const list = document.querySelector('[data-journal-home-list]');
    if (!feature && !list) return;
    const lead = posts[0];
    const rest = posts.slice(1, 4);

    if (feature && lead) {
      const meta = `${SECTION_LABELS[lead.section] || 'Journal'} · ${formatDate(lead.date)}`;
      feature.innerHTML = `
        <a class="article-cover" href="${escapeHtml(lead.url)}" target="_blank" rel="noopener">
          ${lead.cover
            ? `<img src="${escapeHtml(coverUrl(lead.cover, 1200))}" alt="" width="1200" height="800" loading="lazy">`
            : ''}
        </a>
        <div>
          <div class="article-meta">${escapeHtml(meta)}</div>
          <h3 class="article-title"><a href="${escapeHtml(lead.url)}" target="_blank" rel="noopener">${escapeHtml(lead.title)}</a></h3>
          <p class="article-desc">${escapeHtml(lead.subtitle || '')}</p>
          <a class="article-link" href="${escapeHtml(lead.url)}" target="_blank" rel="noopener">Read on Substack <span aria-hidden="true">→</span><span class="sr-only"> (opens in a new tab)</span></a>
        </div>`;
    }

    if (list) {
      list.innerHTML = rest
        .map((p) => {
          const meta = `${SECTION_LABELS[p.section] || 'Journal'} · ${formatDate(p.date)}`;
          const thumb = p.cover
            ? `<img class="article-list-thumb" src="${escapeHtml(coverUrl(p.cover, 200))}" alt="" width="72" height="72" loading="lazy">`
            : `<span class="article-list-thumb article-list-thumb--empty" aria-hidden="true"></span>`;
          return `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener">
            ${thumb}
            <div class="article-list-body">
              <div class="article-meta">${escapeHtml(meta)}</div>
              <div class="article-list-title">${escapeHtml(p.title)}</div>
              <p class="article-list-desc">${escapeHtml(p.subtitle || '')}</p>
            </div>
          </a>`;
        })
        .join('');
    }
  }

  function renderJournalPage(posts) {
    const leadEl = document.querySelector('[data-journal-lead]');
    const latestEl = document.querySelector('[data-journal-latest]');
    if (!leadEl && !latestEl && !document.querySelector('[data-journal-section]')) return;

    const lead = posts[0];
    renderLead(leadEl, lead);
    fillGrid(latestEl, posts.slice(0, 6), { showSection: true, width: 800 });

    const sectionIds = ['field-notes', 'under-the-hood', 'perspective', 'toolkit', 'weekly-brief'];
    sectionIds.forEach((id) => {
      const el = document.querySelector(`[data-journal-section="${id}"]`);
      if (!el) return;
      const matched = posts.filter((p) => p.section === id);
      const opts = {
        showSection: false,
        width: id === 'field-notes' ? 1200 : 800,
        feature: id === 'field-notes' && matched.length === 1,
        emptyLabel: SECTION_LABELS[id],
        emptyCopy:
          id === 'weekly-brief'
            ? 'New Briefs will appear here automatically when they publish on Substack.'
            : 'New pieces in this section will appear here automatically from Substack.',
        includeSubscribe: matched.length === 0,
      };
      fillGrid(el, matched, opts);
      if (id === 'field-notes' && matched.length === 1) {
        el.classList.add('journal-story-grid--wide');
      }
    });
  }

  async function loadPosts() {
    let lastError = null;
    for (const endpoint of FEED_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`${endpoint} → ${res.status}`);
        const data = await res.json();
        if (!data || !Array.isArray(data.posts)) throw new Error('Invalid feed payload');
        return data.posts;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error('No journal feed available');
  }

  async function init() {
    const needsHome = document.querySelector('[data-journal-home-feature], [data-journal-home-list]');
    const needsPage = document.querySelector('[data-journal-lead], [data-journal-latest], [data-journal-section]');
    if (!needsHome && !needsPage) return;

    try {
      const posts = await loadPosts();
      renderHome(posts);
      renderJournalPage(posts);
      if (window.maedObserveReveals) window.maedObserveReveals();
    } catch (err) {
      console.warn('Journal feed unavailable', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
