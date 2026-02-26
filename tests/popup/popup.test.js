'use strict';

const flushPromises = () => new Promise(r => setTimeout(r, 0));
const popup = require('../../popup/popup');

// Stub navigator.clipboard once for this file
beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

// Helper: build a minimal valid snippet
function makeSnippet(overrides) {
  return Object.assign({
    id: 'id-1',
    text: 'test snippet text',
    url: 'http://example.com/page',
    pageTitle: 'Example Page',
    context: 'before text [[SNIPPET]] after text',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdDate: '2026-02-23',
    tags: ['research'],
    notes: '',
    color: null,
    isFavorite: false,
    folderId: null,
  }, overrides);
}

function setupDom() {
  document.body.innerHTML =
    '<input type="search" id="search" value="">' +
    '<div id="list"></div>' +
    '<div id="detail" class="sh-detail hidden"></div>';
}

beforeEach(() => {
  jest.clearAllMocks();
  popup._reset();
  setupDom();
  SnipStorage.getAll.mockResolvedValue([]);
  SnipStorage.remove.mockResolvedValue(undefined);
  SnipStorage.update.mockResolvedValue(undefined);
});

// ── relativeTime ──────────────────────────────────────────────────────────────

describe('relativeTime', () => {
  test('returns "just now" for < 1 minute', () => {
    expect(popup.relativeTime(new Date(Date.now() - 30000).toISOString())).toBe('just now');
  });
  test('returns minutes ago', () => {
    expect(popup.relativeTime(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5 min ago');
  });
  test('returns hours ago', () => {
    expect(popup.relativeTime(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('3 hr ago');
  });
  test('returns days ago', () => {
    expect(popup.relativeTime(new Date(Date.now() - 2 * 86400000).toISOString())).toBe('2 days ago');
  });
  test('returns singular day', () => {
    expect(popup.relativeTime(new Date(Date.now() - 1 * 86400000).toISOString())).toBe('1 day ago');
  });
  test('returns months ago', () => {
    expect(popup.relativeTime(new Date(Date.now() - 60 * 86400000).toISOString())).toBe('2 months ago');
  });
});

// ── truncate ──────────────────────────────────────────────────────────────────

describe('truncate', () => {
  test('returns string unchanged when under max', () => {
    expect(popup.truncate('hello', 10)).toBe('hello');
  });
  test('truncates and appends ellipsis when over max', () => {
    expect(popup.truncate('hello world', 5)).toBe('hello\u2026');
  });
  test('returns empty string for falsy input', () => {
    expect(popup.truncate(null, 10)).toBe('');
    expect(popup.truncate('', 10)).toBe('');
  });
});

// ── faviconUrl ────────────────────────────────────────────────────────────────

describe('faviconUrl', () => {
  test('returns origin + /favicon.ico for valid URL', () => {
    expect(popup.faviconUrl('http://example.com/some/path')).toBe('http://example.com/favicon.ico');
  });
  test('returns empty string for invalid URL', () => {
    expect(popup.faviconUrl('not-a-url')).toBe('');
    expect(popup.faviconUrl('')).toBe('');
  });
});

// ── escapeHtml ────────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  test('escapes & < > "', () => {
    expect(popup.escapeHtml('<b>"hello"&world</b>'))
      .toBe('&lt;b&gt;&quot;hello&quot;&amp;world&lt;/b&gt;');
  });
  test('returns empty string for falsy input', () => {
    expect(popup.escapeHtml(null)).toBe('');
  });
});

// ── highlight ─────────────────────────────────────────────────────────────────

describe('highlight', () => {
  test('wraps match in <mark>', () => {
    expect(popup.highlight('hello world', 'world')).toBe('hello <mark>world</mark>');
  });
  test('is case-insensitive', () => {
    expect(popup.highlight('Hello World', 'hello')).toBe('<mark>Hello</mark> World');
  });
  test('returns text unchanged when query is empty', () => {
    expect(popup.highlight('hello', '')).toBe('hello');
  });
  test('escapes special regex chars in query', () => {
    expect(popup.highlight('price $5.00', '$5.00')).toBe('price <mark>$5.00</mark>');
  });
});

// ── paginate ──────────────────────────────────────────────────────────────────

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  test('returns first page slice', () => {
    const r = popup.paginate(items, 1, 20);
    expect(r.items).toHaveLength(20);
    expect(r.items[0]).toBe(0);
    expect(r.totalPages).toBe(2);
  });
  test('returns last page slice', () => {
    const r = popup.paginate(items, 2, 20);
    expect(r.items).toHaveLength(5);
    expect(r.items[0]).toBe(20);
  });
  test('reports correct total', () => {
    expect(popup.paginate(items, 1, 20).total).toBe(25);
  });
  test('clamps page to valid range', () => {
    expect(popup.paginate(items, 99, 20).page).toBe(2);
  });
});

// ── filterSnippets ────────────────────────────────────────────────────────────

describe('filterSnippets', () => {
  const snippets = [
    makeSnippet({ id: '1', text: 'hello world', pageTitle: 'Page A', url: 'http://a.com', tags: ['alpha'] }),
    makeSnippet({ id: '2', text: 'foo bar',     pageTitle: 'Page B', url: 'http://b.com', tags: ['beta'] }),
  ];

  test('returns all when query is empty', () => {
    expect(popup.filterSnippets(snippets, '')).toHaveLength(2);
  });
  test('filters by snippet text', () => {
    expect(popup.filterSnippets(snippets, 'hello')).toHaveLength(1);
  });
  test('filters by pageTitle', () => {
    expect(popup.filterSnippets(snippets, 'Page B')).toHaveLength(1);
  });
  test('filters by url', () => {
    expect(popup.filterSnippets(snippets, 'b.com')).toHaveLength(1);
  });
  test('filters by tag', () => {
    expect(popup.filterSnippets(snippets, 'alpha')).toHaveLength(1);
  });
  test('returns empty array when no match', () => {
    expect(popup.filterSnippets(snippets, 'xyz')).toHaveLength(0);
  });
});

// ── FR-3.1: renderList ────────────────────────────────────────────────────────

describe('FR-3.1 renderList', () => {
  test('shows generic empty state when no snippets and no query', () => {
    popup.renderList([], 1);
    expect(document.querySelector('.sh-empty')).not.toBeNull();
    expect(document.querySelector('.sh-empty').textContent).not.toContain('\u201c');
  });

  test('shows "no results" message containing query when filtered is empty', () => {
    popup._state.query = 'missing';
    popup.renderList([], 1);
    expect(document.querySelector('.sh-empty').innerHTML).toContain('missing');
  });

  test('renders correct number of cards', () => {
    popup.renderList([makeSnippet(), makeSnippet({ id: 'id-2' })], 1);
    expect(document.querySelectorAll('.sh-card')).toHaveLength(2);
  });

  test('renders only first 20 cards per page', () => {
    const many = Array.from({ length: 25 }, (_, i) => makeSnippet({ id: String(i) }));
    popup.renderList(many, 1);
    expect(document.querySelectorAll('.sh-card')).toHaveLength(20);
  });

  test('shows pager when total exceeds page size', () => {
    const many = Array.from({ length: 25 }, (_, i) => makeSnippet({ id: String(i) }));
    popup.renderList(many, 1);
    expect(document.querySelector('.sh-pager')).not.toBeNull();
  });

  test('does not show pager when total fits on one page', () => {
    popup.renderList([makeSnippet()], 1);
    expect(document.querySelector('.sh-pager')).toBeNull();
  });
});

// ── FR-3.1: renderCard ────────────────────────────────────────────────────────

describe('FR-3.1 renderCard', () => {
  test('shows snippet preview text', () => {
    const card = popup.renderCard(makeSnippet());
    expect(card.querySelector('.sh-card-preview').textContent).toContain('test snippet text');
  });

  test('shows truncated page title', () => {
    const card = popup.renderCard(makeSnippet());
    expect(card.querySelector('.sh-card-title').textContent).toContain('Example Page');
  });

  test('shows relative date', () => {
    const card = popup.renderCard(makeSnippet());
    expect(card.querySelector('.sh-card-date').textContent).toMatch(/day/);
  });

  test('clicking the card opens detail view', () => {
    document.getElementById('list').appendChild(popup.renderCard(makeSnippet()));
    document.querySelector('.sh-card').click();
    expect(document.getElementById('detail').className).not.toContain('hidden');
  });

  test('truncates preview at 150 characters', () => {
    const long = makeSnippet({ text: 'a'.repeat(200) });
    const card = popup.renderCard(long);
    expect(card.querySelector('.sh-card-preview').textContent).toContain('\u2026');
  });
});

// ── FR-3.1: init ─────────────────────────────────────────────────────────────

describe('FR-3.1 init', () => {
  test('loads snippets from storage and renders cards', async () => {
    SnipStorage.getAll.mockResolvedValue([makeSnippet()]);
    await popup.init();
    expect(document.querySelectorAll('.sh-card')).toHaveLength(1);
  });

  test('shows empty state when storage is empty', async () => {
    SnipStorage.getAll.mockResolvedValue([]);
    await popup.init();
    expect(document.querySelector('.sh-empty')).not.toBeNull();
  });
});

// ── FR-3.3: search ────────────────────────────────────────────────────────────

describe('FR-3.3 search', () => {
  async function loadAndSearch(snippets, query) {
    SnipStorage.getAll.mockResolvedValue(snippets);
    await popup.init();
    document.getElementById('search').value = query;
    document.getElementById('search').dispatchEvent(new Event('input'));
  }

  test('filters cards in real time as user types', async () => {
    const snippets = [makeSnippet({ text: 'hello world' }), makeSnippet({ id: 'id-2', text: 'foo bar' })];
    await loadAndSearch(snippets, 'hello');
    expect(document.querySelectorAll('.sh-card')).toHaveLength(1);
  });

  test('highlights matching terms in card previews', async () => {
    await loadAndSearch([makeSnippet({ text: 'hello world' })], 'hello');
    expect(document.querySelector('.sh-card-preview mark')).not.toBeNull();
  });

  test('shows no-results message when nothing matches', async () => {
    await loadAndSearch([makeSnippet()], 'xyzzy');
    expect(document.querySelector('.sh-empty')).not.toBeNull();
  });

  test('resets to page 1 on new search', async () => {
    popup._state.page = 3;
    await loadAndSearch([makeSnippet()], 'test');
    expect(popup._state.page).toBe(1);
  });
});

// ── FR-3.2: openDetail ────────────────────────────────────────────────────────

describe('FR-3.2 openDetail', () => {
  test('shows full snippet text', () => {
    popup.openDetail(makeSnippet());
    expect(document.querySelector('.sh-detail-text').textContent).toBe('test snippet text');
  });

  test('shows clickable link to original URL', () => {
    popup.openDetail(makeSnippet());
    const link = document.querySelector('.sh-detail-url');
    expect(link.getAttribute('href')).toBe('http://example.com/page');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  test('shows page title as link text', () => {
    popup.openDetail(makeSnippet());
    expect(document.querySelector('.sh-detail-url').textContent).toBe('Example Page');
  });

  test('shows context section when context is present', () => {
    popup.openDetail(makeSnippet());
    expect(document.querySelector('.sh-context')).not.toBeNull();
  });

  test('highlights snippet within context', () => {
    popup.openDetail(makeSnippet());
    expect(document.querySelector('.sh-context mark')).not.toBeNull();
  });

  test('hides context section when context is absent', () => {
    popup.openDetail(makeSnippet({ context: '' }));
    expect(document.querySelector('.sh-context')).toBeNull();
  });

  test('shows Copy, Edit, and Delete buttons', () => {
    popup.openDetail(makeSnippet());
    expect(document.getElementById('sh-copy')).not.toBeNull();
    expect(document.getElementById('sh-edit')).not.toBeNull();
    expect(document.getElementById('sh-delete')).not.toBeNull();
  });

  test('shows close button', () => {
    popup.openDetail(makeSnippet());
    expect(document.getElementById('sh-close')).not.toBeNull();
  });

  test('closes detail on close button click', () => {
    popup.openDetail(makeSnippet());
    document.getElementById('sh-close').click();
    expect(document.getElementById('detail').className).toContain('hidden');
  });

  test('closes detail on ESC key', () => {
    popup.openDetail(makeSnippet());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.getElementById('detail').className).toContain('hidden');
  });
});

// ── FR-3.4: deleteSnippet ─────────────────────────────────────────────────────

describe('FR-3.4 deleteSnippet', () => {
  test('calls SnipStorage.remove and closes detail when confirmed', async () => {
    window.confirm = jest.fn(() => true);
    popup._state.snippets = [makeSnippet()];
    popup.openDetail(makeSnippet());
    document.getElementById('sh-delete').click();
    await flushPromises();
    expect(SnipStorage.remove).toHaveBeenCalledWith('id-1');
    expect(document.getElementById('detail').className).toContain('hidden');
  });

  test('does nothing when user cancels confirmation', () => {
    window.confirm = jest.fn(() => false);
    popup._state.snippets = [makeSnippet()];
    popup.openDetail(makeSnippet());
    document.getElementById('sh-delete').click();
    expect(SnipStorage.remove).not.toHaveBeenCalled();
  });

  test('removes snippet from state after deletion', async () => {
    window.confirm = jest.fn(() => true);
    popup._state.snippets = [makeSnippet(), makeSnippet({ id: 'id-2' })];
    popup.openDetail(makeSnippet());
    document.getElementById('sh-delete').click();
    await flushPromises();
    expect(popup._state.snippets).toHaveLength(1);
    expect(popup._state.snippets[0].id).toBe('id-2');
  });
});

// ── FR-3.4: startEdit ─────────────────────────────────────────────────────────

describe('FR-3.4 startEdit', () => {
  test('replaces text div with textarea containing current text', () => {
    popup.openDetail(makeSnippet());
    document.getElementById('sh-edit').click();
    const ta = document.getElementById('sh-edit-area');
    expect(ta).not.toBeNull();
    expect(ta.value).toBe('test snippet text');
  });

  test('save calls SnipStorage.update with new text and originalText', async () => {
    popup.openDetail(makeSnippet());
    document.getElementById('sh-edit').click();
    document.getElementById('sh-edit-area').value = 'updated text';
    document.getElementById('sh-save-edit').click();
    await flushPromises();
    expect(SnipStorage.update).toHaveBeenCalledWith('id-1', {
      text: 'updated text',
      originalText: 'test snippet text',
    });
  });

  test('does not overwrite originalText when it already exists', async () => {
    popup.openDetail(makeSnippet({ originalText: 'very original' }));
    document.getElementById('sh-edit').click();
    document.getElementById('sh-edit-area').value = 'second edit';
    document.getElementById('sh-save-edit').click();
    await flushPromises();
    expect(SnipStorage.update).toHaveBeenCalledWith('id-1', { text: 'second edit' });
  });

  test('cancel restores the detail view', () => {
    popup.openDetail(makeSnippet());
    document.getElementById('sh-edit').click();
    document.getElementById('sh-cancel-edit').click();
    expect(document.querySelector('.sh-detail-text')).not.toBeNull();
    expect(document.getElementById('sh-edit-area')).toBeNull();
  });

  test('save does nothing when textarea is empty', async () => {
    popup.openDetail(makeSnippet());
    document.getElementById('sh-edit').click();
    document.getElementById('sh-edit-area').value = '   ';
    document.getElementById('sh-save-edit').click();
    await flushPromises();
    expect(SnipStorage.update).not.toHaveBeenCalled();
  });
});

// ── FR-3.4: copySnippet ───────────────────────────────────────────────────────

describe('FR-3.4 copySnippet', () => {
  test('calls navigator.clipboard.writeText with snippet text', () => {
    popup.openDetail(makeSnippet());
    document.getElementById('sh-copy').click();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test snippet text');
  });
});

// ── Pagination controls ───────────────────────────────────────────────────────

describe('Pagination controls', () => {
  function loadMany() {
    const snippets = Array.from({ length: 25 }, (_, i) => makeSnippet({ id: String(i) }));
    popup._state.snippets = snippets;
    popup.renderList(snippets, 1);
    return snippets;
  }

  test('Next button advances to page 2 and shows remaining cards', () => {
    loadMany();
    document.getElementById('sh-next').click();
    expect(popup._state.page).toBe(2);
    expect(document.querySelectorAll('.sh-card')).toHaveLength(5);
  });

  test('Prev button is disabled on page 1', () => {
    loadMany();
    expect(document.getElementById('sh-prev').disabled).toBe(true);
  });

  test('Next button is disabled on last page', () => {
    const snippets = Array.from({ length: 25 }, (_, i) => makeSnippet({ id: String(i) }));
    popup._state.snippets = snippets;
    popup.renderList(snippets, 2);
    expect(document.getElementById('sh-next').disabled).toBe(true);
  });
});
