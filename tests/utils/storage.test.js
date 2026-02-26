'use strict';

const flushPromises = () => new Promise(r => setTimeout(r, 0));
const storage = require('../../utils/storage');

beforeEach(() => {
  jest.clearAllMocks();
  chrome.storage.local.get.mockResolvedValue({ snippets: [] });
  chrome.storage.local.set.mockResolvedValue(undefined);
});

// ─── FR-2.2: buildSnippet schema ─────────────────────────────────────────────

describe('buildSnippet - required fields', () => {
  const base = { text: 'hello', url: 'http://example.com', pageTitle: 'Example', context: 'ctx' };

  test('sets all required fields', () => {
    const s = storage.buildSnippet(base);
    expect(s.id).toBe('test-uuid-1234');
    expect(s.text).toBe('hello');
    expect(s.url).toBe('http://example.com');
    expect(s.pageTitle).toBe('Example');
    expect(s.context).toBe('ctx');
    expect(s.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(s.createdDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('createdDate is the date portion of timestamp', () => {
    const s = storage.buildSnippet(base);
    expect(s.timestamp.startsWith(s.createdDate)).toBe(true);
  });
});

describe('buildSnippet - optional fields', () => {
  const base = { text: 't', url: '', pageTitle: '', context: '' };

  test('defaults tags to empty array', () => {
    expect(storage.buildSnippet(base).tags).toEqual([]);
  });

  test('defaults notes to empty string', () => {
    expect(storage.buildSnippet(base).notes).toBe('');
  });

  test('defaults color to null', () => {
    expect(storage.buildSnippet(base).color).toBeNull();
  });

  test('defaults isFavorite to false', () => {
    expect(storage.buildSnippet(base).isFavorite).toBe(false);
  });

  test('defaults folderId to null', () => {
    expect(storage.buildSnippet(base).folderId).toBeNull();
  });

  test('accepts custom values for optional fields', () => {
    const s = storage.buildSnippet(
      Object.assign({}, base, { tags: ['a'], notes: 'n', color: '#ff0000', isFavorite: true, folderId: 'f1' })
    );
    expect(s.tags).toEqual(['a']);
    expect(s.notes).toBe('n');
    expect(s.color).toBe('#ff0000');
    expect(s.isFavorite).toBe(true);
    expect(s.folderId).toBe('f1');
  });
});

// ─── FR-2.1: getAll ───────────────────────────────────────────────────────────

describe('getAll', () => {
  test('returns snippets array from storage', async () => {
    const snippets = [{ id: 'a' }, { id: 'b' }];
    chrome.storage.local.get.mockResolvedValue({ snippets });
    await expect(storage.getAll()).resolves.toEqual(snippets);
  });

  test('returns empty array when storage has no snippets key', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    await expect(storage.getAll()).resolves.toEqual([]);
  });

  test('queries storage with the correct key', async () => {
    await storage.getAll();
    expect(chrome.storage.local.get).toHaveBeenCalledWith('snippets');
  });
});

// ─── FR-2.1 / FR-2.3: save ───────────────────────────────────────────────────

describe('save', () => {
  test('prepends snippet to existing list', async () => {
    const existing = [{ id: 'old' }];
    chrome.storage.local.get.mockResolvedValue({ snippets: existing });
    const snippet = { id: 'new' };
    await storage.save(snippet);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      snippets: [{ id: 'new' }, { id: 'old' }],
    });
  });

  test('creates list when storage is empty', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    await storage.save({ id: 'first' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ snippets: [{ id: 'first' }] });
  });

  test('rejects with LIMIT_EXCEEDED when at 10,000 snippets', async () => {
    const full = Array.from({ length: 10000 }, function (_, i) { return { id: String(i) }; });
    chrome.storage.local.get.mockResolvedValue({ snippets: full });
    await expect(storage.save({ id: 'new' })).rejects.toThrow('LIMIT_EXCEEDED');
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  test('still saves at 9,999 snippets (one below limit)', async () => {
    const nearly = Array.from({ length: 9999 }, function (_, i) { return { id: String(i) }; });
    chrome.storage.local.get.mockResolvedValue({ snippets: nearly });
    await expect(storage.save({ id: 'new' })).resolves.not.toThrow();
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  test('rejects with QUOTA_EXCEEDED when chrome throws quota error', async () => {
    chrome.storage.local.set.mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'));
    await expect(storage.save({ id: 'new' })).rejects.toThrow('QUOTA_EXCEEDED');
  });

  test('re-throws unrelated storage errors unchanged', async () => {
    chrome.storage.local.set.mockRejectedValue(new Error('Unknown error'));
    await expect(storage.save({ id: 'new' })).rejects.toThrow('Unknown error');
  });
});

// ─── remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  test('removes snippet with matching id', async () => {
    chrome.storage.local.get.mockResolvedValue({
      snippets: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    });
    await storage.remove('b');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      snippets: [{ id: 'a' }, { id: 'c' }],
    });
  });

  test('handles empty storage gracefully', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    await storage.remove('any');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ snippets: [] });
  });

  test('no-ops when id is not found', async () => {
    const snippets = [{ id: 'a' }, { id: 'b' }];
    chrome.storage.local.get.mockResolvedValue({ snippets });
    await storage.remove('missing');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ snippets });
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe('update', () => {
  test('merges changes into the matching snippet', async () => {
    chrome.storage.local.get.mockResolvedValue({
      snippets: [{ id: 'a', text: 'old', isFavorite: false }],
    });
    await storage.update('a', { isFavorite: true });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      snippets: [{ id: 'a', text: 'old', isFavorite: true }],
    });
  });

  test('does not mutate other snippets', async () => {
    chrome.storage.local.get.mockResolvedValue({
      snippets: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    });
    await storage.update('a', { text: 'A updated' });
    const [{ snippets }] = chrome.storage.local.set.mock.calls[0];
    expect(snippets[1]).toEqual({ id: 'b', text: 'B' });
  });

  test('no-ops when id is not found', async () => {
    const snippets = [{ id: 'a', text: 'A' }];
    chrome.storage.local.get.mockResolvedValue({ snippets });
    await storage.update('missing', { text: 'new' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ snippets });
  });
});
