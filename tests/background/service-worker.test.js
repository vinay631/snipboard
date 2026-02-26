'use strict';

// Drains the microtask queue by scheduling after all pending microtasks
const flushPromises = () => new Promise(r => setTimeout(r, 0));

const sw = require('../../background/service-worker');

beforeEach(() => {
  jest.clearAllMocks();
  chrome.storage.local.get.mockResolvedValue({ snippets: [] });
  chrome.storage.local.set.mockResolvedValue(undefined);
});

// ─── buildSnippet ─────────────────────────────────────────────────────────────

describe('buildSnippet', () => {
  test('returns all required schema fields', () => {
    const snippet = sw.buildSnippet({
      text: 'hello',
      context: 'ctx',
      url: 'http://example.com',
      pageTitle: 'Example',
    });
    expect(snippet).toMatchObject({
      id: 'test-uuid-1234',
      text: 'hello',
      url: 'http://example.com',
      pageTitle: 'Example',
      context: 'ctx',
      tags: [],
      notes: '',
      isFavorite: false,
    });
    expect(snippet.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snippet.createdDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('uses crypto.randomUUID for id', () => {
    const snippet = sw.buildSnippet({ text: 't', context: '', url: '', pageTitle: '' });
    expect(snippet.id).toBe('test-uuid-1234');
    expect(global.crypto.randomUUID).toHaveBeenCalled();
  });
});

// ─── saveSnippet ──────────────────────────────────────────────────────────────

describe('saveSnippet', () => {
  test('prepends new snippet to existing list', async () => {
    const existing = [{ id: 'old', text: 'old' }];
    chrome.storage.local.get.mockResolvedValue({ snippets: existing });
    const snippet = { id: 'new', text: 'new' };
    await sw.saveSnippet(snippet);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      snippets: [snippet, ...existing],
    });
  });

  test('creates snippets array when storage is empty', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    const snippet = { id: 'new', text: 'new' };
    await sw.saveSnippet(snippet);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ snippets: [snippet] });
  });
});

// ─── deleteSnippet ────────────────────────────────────────────────────────────

describe('deleteSnippet', () => {
  test('removes snippet with matching id', async () => {
    chrome.storage.local.get.mockResolvedValue({
      snippets: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    });
    await sw.deleteSnippet('b');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      snippets: [{ id: 'a' }, { id: 'c' }],
    });
  });

  test('handles empty storage gracefully', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    await sw.deleteSnippet('any-id');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ snippets: [] });
  });
});

// ─── onMessage ────────────────────────────────────────────────────────────────

describe('onMessage - CAPTURE_SNIPPET', () => {
  test('saves snippet and responds with success and id', async () => {
    const sendResponse = jest.fn();
    const sender = { tab: { url: 'http://example.com', title: 'Example' } };
    const message = { type: 'CAPTURE_SNIPPET', payload: { text: 'test text', context: 'ctx' } };

    sw.onMessage(message, sender, sendResponse);
    await flushPromises();

    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true, id: 'test-uuid-1234' });
  });

  test('includes tab url and title in saved snippet', async () => {
    const sendResponse = jest.fn();
    const sender = { tab: { url: 'http://site.com', title: 'My Page' } };
    const message = { type: 'CAPTURE_SNIPPET', payload: { text: 'hi', context: '' } };

    sw.onMessage(message, sender, sendResponse);
    await flushPromises();

    const [{ snippets }] = chrome.storage.local.set.mock.calls[0];
    expect(snippets[0].url).toBe('http://site.com');
    expect(snippets[0].pageTitle).toBe('My Page');
  });
});

describe('onMessage - DELETE_SNIPPET', () => {
  test('deletes snippet and responds with success', async () => {
    chrome.storage.local.get.mockResolvedValue({ snippets: [{ id: 'test-uuid-1234' }] });
    const sendResponse = jest.fn();

    sw.onMessage({ type: 'DELETE_SNIPPET', id: 'test-uuid-1234' }, {}, sendResponse);
    await flushPromises();

    expect(chrome.storage.local.set).toHaveBeenCalledWith({ snippets: [] });
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
});

describe('onMessage - unknown type', () => {
  test('returns undefined for unrecognised message types', () => {
    const result = sw.onMessage({ type: 'UNKNOWN' }, {}, jest.fn());
    expect(result).toBeUndefined();
  });
});
