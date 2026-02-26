/* global SnipStorage */

(function (exports) {
  'use strict';

  var PAGE_SIZE = 20;
  var state = { snippets: [], query: '', page: 1 };

  // ── FR-3.1 + FR-3.3: Init ─────────────────────────────────────────────────

  function init() {
    document.getElementById('search').addEventListener('input', function (e) {
      state.query = e.target.value.trim();
      state.page = 1;
      render();
    });
    return SnipStorage.getAll().then(function (snippets) {
      state.snippets = snippets;
      render();
    });
  }

  function render() {
    renderList(filterSnippets(state.snippets, state.query), state.page);
  }

  // ── FR-3.3: Filter by text, pageTitle, url, tags ──────────────────────────

  function filterSnippets(snippets, query) {
    if (!query) return snippets;
    var q = query.toLowerCase();
    return snippets.filter(function (s) {
      return (
        s.text.toLowerCase().indexOf(q) !== -1 ||
        (s.pageTitle && s.pageTitle.toLowerCase().indexOf(q) !== -1) ||
        (s.url && s.url.toLowerCase().indexOf(q) !== -1) ||
        (s.tags && s.tags.some(function (t) { return t.toLowerCase().indexOf(q) !== -1; }))
      );
    });
  }

  // ── FR-3.1: Snippet list with pagination and empty states ─────────────────

  function renderList(snippets, page) {
    var listEl = document.getElementById('list');
    listEl.innerHTML = '';

    if (snippets.length === 0) {
      var msg = state.query
        ? 'No results for \u201c' + escapeHtml(state.query) + '\u201d'
        : 'No snippets yet. Highlight text on any page to save your first snippet.';
      var p = document.createElement('p');
      p.className = 'sh-empty';
      p.innerHTML = msg;
      listEl.appendChild(p);
      return;
    }

    var paged = paginate(snippets, page, PAGE_SIZE);
    paged.items.forEach(function (s) { listEl.appendChild(renderCard(s)); });

    if (paged.totalPages > 1) {
      listEl.appendChild(renderPager(paged));
    }
  }

  function renderCard(snippet) {
    var card = document.createElement('article');
    card.className = 'sh-card';
    card.dataset.id = snippet.id;

    card.innerHTML =
      '<p class="sh-card-preview">' +
        highlight(escapeHtml(truncate(snippet.text, 150)), state.query) +
      '</p>' +
      '<footer class="sh-card-meta">' +
        '<img class="sh-favicon" src="' + faviconUrl(snippet.url) + '" width="16" height="16" alt="" onerror="this.style.display=\'none\'">' +
        '<span class="sh-card-title">' + escapeHtml(truncate(snippet.pageTitle || snippet.url || '', 40)) + '</span>' +
        '<span class="sh-card-date">' + relativeTime(snippet.timestamp) + '</span>' +
      '</footer>';

    card.addEventListener('click', function () { openDetail(snippet); });
    return card;
  }

  function renderPager(paged) {
    var nav = document.createElement('nav');
    nav.className = 'sh-pager';
    nav.innerHTML =
      '<button id="sh-prev"' + (paged.page <= 1 ? ' disabled' : '') + '>\u00ab Prev</button>' +
      '<span>' + paged.page + '\u00a0/\u00a0' + paged.totalPages + '</span>' +
      '<button id="sh-next"' + (paged.page >= paged.totalPages ? ' disabled' : '') + '>Next \u00bb</button>';
    nav.querySelector('#sh-prev').addEventListener('click', function () { state.page--; render(); });
    nav.querySelector('#sh-next').addEventListener('click', function () { state.page++; render(); });
    return nav;
  }

  // ── FR-3.2: Detail overlay ────────────────────────────────────────────────

  function openDetail(snippet) {
    var detailEl = document.getElementById('detail');
    detailEl.className = 'sh-detail';

    var contextHtml = '';
    if (snippet.context) {
      var marker = '\x00';
      var escaped = escapeHtml(snippet.context.replace('[[SNIPPET]]', marker));
      contextHtml =
        '<details class="sh-context"><summary>Context</summary><p>' +
        escaped.replace(marker, '<mark>' + escapeHtml(snippet.text) + '</mark>') +
        '</p></details>';
    }

    detailEl.innerHTML =
      '<button class="sh-close" id="sh-close">\u00d7</button>' +
      '<div class="sh-detail-text">' + escapeHtml(snippet.text) + '</div>' +
      contextHtml +
      '<div class="sh-detail-meta">' +
        '<a class="sh-detail-url" href="' + escapeHtml(snippet.url) + '" target="_blank">' +
          escapeHtml(snippet.pageTitle || snippet.url) +
        '</a>' +
        '<time class="sh-detail-ts">' + new Date(snippet.timestamp).toLocaleString() + '</time>' +
      '</div>' +
      '<div class="sh-detail-actions">' +
        '<button class="sh-btn" id="sh-copy">Copy</button>' +
        '<button class="sh-btn" id="sh-edit">Edit</button>' +
        '<button class="sh-btn sh-btn-danger" id="sh-delete">Delete</button>' +
      '</div>';

    document.getElementById('sh-close').addEventListener('click', closeDetail);
    document.getElementById('sh-copy').addEventListener('click', function () { copySnippet(snippet.text); });
    document.getElementById('sh-edit').addEventListener('click', function () { startEdit(snippet); });
    document.getElementById('sh-delete').addEventListener('click', function () { deleteSnippet(snippet.id); });

    // Close on backdrop click or ESC key
    detailEl.addEventListener('click', function (e) { if (e.target === detailEl) closeDetail(); });
    document.addEventListener('keydown', onEscKey);
  }

  function onEscKey(e) {
    if (e.key === 'Escape') closeDetail();
  }

  function closeDetail() {
    document.removeEventListener('keydown', onEscKey);
    var detailEl = document.getElementById('detail');
    detailEl.className = 'sh-detail hidden';
    detailEl.innerHTML = '';
  }

  // ── FR-3.4: Delete with confirmation ─────────────────────────────────────

  function deleteSnippet(id) {
    if (!window.confirm('Delete this snippet?')) return;
    SnipStorage.remove(id).then(function () {
      state.snippets = state.snippets.filter(function (s) { return s.id !== id; });
      closeDetail();
      render();
    });
  }

  // ── FR-3.4: Edit, preserving original text ────────────────────────────────

  function startEdit(snippet) {
    var detailEl = document.getElementById('detail');
    var textarea = document.createElement('textarea');
    textarea.className = 'sh-edit-area';
    textarea.id = 'sh-edit-area';
    textarea.value = snippet.text;
    detailEl.querySelector('.sh-detail-text').replaceWith(textarea);
    textarea.focus();

    var actionsEl = detailEl.querySelector('.sh-detail-actions');
    actionsEl.innerHTML =
      '<button class="sh-btn" id="sh-save-edit">Save</button>' +
      '<button class="sh-btn" id="sh-cancel-edit">Cancel</button>';

    document.getElementById('sh-save-edit').addEventListener('click', function () {
      var newText = textarea.value.trim();
      if (!newText) return;
      var changes = { text: newText };
      if (!snippet.originalText) changes.originalText = snippet.text;
      SnipStorage.update(snippet.id, changes).then(function () {
        var updated = Object.assign({}, snippet, changes);
        state.snippets = state.snippets.map(function (s) { return s.id === snippet.id ? updated : s; });
        openDetail(updated);
      });
    });

    document.getElementById('sh-cancel-edit').addEventListener('click', function () {
      openDetail(snippet);
    });
  }

  // ── FR-3.4: Copy to clipboard ─────────────────────────────────────────────

  function copySnippet(text) {
    return navigator.clipboard.writeText(text).then(function () {
      var btn = document.getElementById('sh-copy');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(function () { if (document.getElementById('sh-copy')) btn.textContent = 'Copy'; }, 1500);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  // FR-3.3: Wrap query matches in <mark> (receives already-escaped HTML text)
  function highlight(escapedText, query) {
    if (!query) return escapedText;
    var safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escapedText.replace(new RegExp('(' + safe + ')', 'gi'), '<mark>$1</mark>');
  }

  function paginate(items, page, perPage) {
    var totalPages = Math.max(1, Math.ceil(items.length / perPage));
    var p = Math.min(Math.max(1, page), totalPages);
    return { items: items.slice((p - 1) * perPage, p * perPage), page: p, totalPages: totalPages, total: items.length };
  }

  function relativeTime(ts) {
    var diff = Date.now() - new Date(ts).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24)  return hrs + ' hr ago';
    var days = Math.floor(hrs / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    var months = Math.floor(days / 30);
    return months + (months === 1 ? ' month ago' : ' months ago');
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '\u2026' : str;
  }

  function faviconUrl(url) {
    try { return new URL(url).origin + '/favicon.ico'; }
    catch (e) { return ''; }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _reset() {
    state.snippets = [];
    state.query = '';
    state.page = 1;
    document.removeEventListener('keydown', onEscKey);
  }

  Object.assign(exports, {
    init: init, render: render,
    filterSnippets: filterSnippets,
    renderList: renderList, renderCard: renderCard,
    openDetail: openDetail, closeDetail: closeDetail,
    deleteSnippet: deleteSnippet, startEdit: startEdit, copySnippet: copySnippet,
    highlight: highlight, paginate: paginate,
    relativeTime: relativeTime, truncate: truncate, faviconUrl: faviconUrl, escapeHtml: escapeHtml,
    _state: state, _reset: _reset,
  });

  if (typeof module === 'undefined') init(); // auto-init in browser

})(typeof module !== 'undefined' ? module.exports : {});
