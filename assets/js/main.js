/* ════════════════════════════════════════════════
   main.js  —  Theme toggle + Search (Lunr.js)
   ════════════════════════════════════════════════ */

/* ────────────────────────────────────────────────
   1.  DARK / LIGHT MODE TOGGLE
   ────────────────────────────────────────────────
   Theme is pre-applied in <head> via inline script
   to prevent FOUC. This just wires up the button.  */

(function initTheme() {
  const btn   = document.getElementById('theme-toggle');
  const root  = document.documentElement;
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
})();

/* ────────────────────────────────────────────────
   2.  MOBILE MENU
   ──────────────────────────────────────────────── */

(function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('mobile-nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', () => {
    nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', nav.classList.contains('open'));
  });
})();

/* ────────────────────────────────────────────────
   3.  SEARCH (Lunr.js)
   ────────────────────────────────────────────────
   Fetches /search.json, builds a Lunr index, then
   opens a modal on "/" keypress or button click.   */

(function initSearch() {
  const trigger   = document.getElementById('search-trigger');
  const modal     = document.getElementById('search-modal');
  const backdrop  = document.getElementById('search-backdrop');
  const closeBtn  = document.getElementById('search-close');
  const input     = document.getElementById('search-input');
  const results   = document.getElementById('search-results');
  if (!modal || !input || !results) return;

  let idx    = null;   // lunr index
  let docs   = [];     // raw post data
  let loaded = false;

  /* ── Load data & build index ── */
  async function loadIndex() {
    if (loaded) return;
    try {
      // Resolve base URL from <base> or current origin
      const base = document.querySelector('base')?.href || location.origin;
      const url  = new URL('search.json', base).href;
      const res  = await fetch(url);
      docs = await res.json();

      idx = lunr(function () {
        this.ref('id');
        this.field('title',   { boost: 10 });
        this.field('tags',    { boost: 5 });
        this.field('series',  { boost: 3 });
        this.field('excerpt', { boost: 2 });
        this.field('content');
        docs.forEach((d, i) => this.add({ ...d, id: i }));
      });
      loaded = true;
    } catch (e) {
      console.warn('[search] could not load search.json', e);
    }
  }

  /* ── Open / close ── */
  function openSearch() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    input.value = '';
    results.innerHTML = '<p class="search-prompt">Start typing to search…</p>';
    // Pre-load index
    loadIndex();
    requestAnimationFrame(() => input.focus());
  }

  function closeSearch() {
    modal.hidden = true;
    document.body.style.overflow = '';
    input.value = '';
    results.innerHTML = '';
  }

  trigger?.addEventListener('click', openSearch);
  closeBtn?.addEventListener('click', closeSearch);
  backdrop?.addEventListener('click', closeSearch);

  /* "/" to open, "Escape" to close */
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape' && !modal.hidden) closeSearch();
  });

  /* ── Search as you type ── */
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) {
      results.innerHTML = '<p class="search-prompt">Start typing to search…</p>';
      return;
    }
    if (!loaded || !idx) {
      results.innerHTML = '<p class="search-prompt">Loading index…</p>';
      loadIndex().then(() => doSearch(q));
      return;
    }
    doSearch(q);
  });

  function doSearch(q) {
    let hits = [];
    try {
      // fuzzy: append * for prefix match
      hits = idx.search(q + '*');
      if (!hits.length) hits = idx.search(q);
    } catch (_) {
      try { hits = idx.search(q); } catch (__) { /* ignore parse errors */ }
    }

    if (!hits.length) {
      results.innerHTML = '<p class="search-empty">No results for <strong>' + escHtml(q) + '</strong></p>';
      return;
    }

    const html = hits.slice(0, 12).map(h => {
      const d = docs[h.ref];
      const tagHtml = (d.tags || [])
        .map(t => `<span class="tag-chip small">${escHtml(t)}</span>`)
        .join(' ');
      return `
        <a class="search-result-item" href="${escHtml(d.url)}">
          <div class="search-result-title">${escHtml(d.title)}</div>
          <div class="search-result-meta">
            ${escHtml(d.date)}
            ${d.series ? ` &middot; 📚 ${escHtml(d.series)}` : ''}
            ${tagHtml ? ` &middot; ${tagHtml}` : ''}
          </div>
        </a>`;
    }).join('');

    results.innerHTML = html;
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
})();

/* ────────────────────────────────────────────────
   4.  TAG FILTER  (home page)
   ────────────────────────────────────────────────
   Sidebar tag chips trigger home-page filtering.
   Works by hiding post cards that don't match.     */

(function initTagFilter() {
  const filterBar   = document.getElementById('active-filter-bar');
  const filterLabel = document.getElementById('active-filter-label');
  const clearBtn    = document.getElementById('clear-filter');
  const postList    = document.getElementById('post-list');
  if (!postList) return;

  /* Any tag chip anywhere on the page */
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    // Only filter on home page (where #post-list exists)
    if (!postList) return;

    const href = chip.getAttribute('href') || '';
    if (!href.includes('#')) return; // not a tag link
    const tag = decodeURIComponent(href.split('#')[1]);
    if (!tag) return;

    e.preventDefault();
    filterByTag(tag, chip.textContent.trim().replace(/\d+$/, '').trim());
  });

  clearBtn?.addEventListener('click', clearFilter);

  function filterByTag(slug, label) {
    const cards = postList.querySelectorAll('.post-card');
    cards.forEach(card => {
      const cardTags = [...card.querySelectorAll('.tag-chip')].map(c =>
        c.getAttribute('href')?.split('#')[1]
      );
      card.style.display = cardTags.includes(slug) ? '' : 'none';
    });
    if (filterBar) {
      filterBar.hidden = false;
      filterLabel.textContent = label || slug;
    }
  }

  function clearFilter() {
    postList.querySelectorAll('.post-card').forEach(c => c.style.display = '');
    if (filterBar) filterBar.hidden = true;
  }
})();
