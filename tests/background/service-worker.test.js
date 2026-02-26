'use strict';

const flushPromises = () => new Promise(r => setTimeout(r, 0));

const sw = require('../../background/service-worker');

const FAKE_SNIPPET = { id: 'test-uuid-1234', text: 'hello' };

beforeEach(() => {
  jest.clearAllMocks();
  SnipStorage.buildSnippet.mockReturnValue(FAKE_SNIPPET);
  SnipStorage.save.mockResolvedValue(undefined);
  SnipStorage.remove.mockResolvedValue(undefined);
});

// ─── CAPTURE_SNIPPET ──────────────────────────────────────────────────────────

describe('onMessage - CAPTURE_SNIPPET', () => {
  const sender = { tab: { url: 'http://example.com', title: 'Example' } };
  const message = { type: 'CAPTURE_SNIPPET', payload: { text: 'hello', context: 'ctx' } };

  test('builds snippet from payload and sender tab', async () => {
    const sendResponse = jest.fn();
    sw.onMessage(message, sender, sendResponse);
    await flushPromises();

    expect(SnipStorage.buildSnippet).toHaveBeenCalledWith({
      text: 'hello',
      context: 'ctx',
      url: 'http://example.com',
      pageTitle: 'Example',
    });
  });

  test('responds with success and snippet id on save', async () => {
    const sendResponse = jest.fn();
    sw.onMessage(message, sender, sendResponse);
    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({ success: true, id: 'test-uuid-1234' });
  });

  test('responds with error when save rejects (e.g. quota exceeded)', async () => {
    SnipStorage.save.mockRejectedValue(new Error('QUOTA_EXCEEDED'));
    const sendResponse = jest.fn();
    sw.onMessage(message, sender, sendResponse);
    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'QUOTA_EXCEEDED' });
  });

  test('responds with error when snippet limit is reached', async () => {
    SnipStorage.save.mockRejectedValue(new Error('LIMIT_EXCEEDED'));
    const sendResponse = jest.fn();
    sw.onMessage(message, sender, sendResponse);
    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'LIMIT_EXCEEDED' });
  });

  test('returns true to keep message channel open', () => {
    const result = sw.onMessage(message, sender, jest.fn());
    expect(result).toBe(true);
  });
});

// ─── DELETE_SNIPPET ───────────────────────────────────────────────────────────

describe('onMessage - DELETE_SNIPPET', () => {
  test('calls SnipStorage.remove with correct id', async () => {
    const sendResponse = jest.fn();
    sw.onMessage({ type: 'DELETE_SNIPPET', id: 'abc-123' }, {}, sendResponse);
    await flushPromises();

    expect(SnipStorage.remove).toHaveBeenCalledWith('abc-123');
  });

  test('responds with success after removal', async () => {
    const sendResponse = jest.fn();
    sw.onMessage({ type: 'DELETE_SNIPPET', id: 'abc-123' }, {}, sendResponse);
    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });
});

// ─── Unknown message ──────────────────────────────────────────────────────────

describe('onMessage - unknown type', () => {
  test('returns undefined for unrecognised message types', () => {
    const result = sw.onMessage({ type: 'UNKNOWN' }, {}, jest.fn());
    expect(result).toBeUndefined();
  });
});
