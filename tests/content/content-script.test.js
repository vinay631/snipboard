'use strict';

const cs = require('../../content/content-script');

beforeEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = '';
  cs._reset();
});

afterEach(() => {
  jest.useRealTimers();
});

// Helper: mock window.getSelection with a given selected text and optional parent element
function mockSelection(text, parentEl) {
  const el = parentEl || Object.assign(document.createElement('div'), { textContent: text });
  window.getSelection = jest.fn(() => ({
    toString: () => text,
    getRangeAt: () => ({
      getBoundingClientRect: () => ({ top: 100, right: 200, left: 100, bottom: 120 }),
      commonAncestorContainer: el,
    }),
    removeAllRanges: jest.fn(),
  }));
}

// ─── extractContext ───────────────────────────────────────────────────────────

describe('extractContext', () => {
  test('wraps selected text with [[SNIPPET]] marker', () => {
    expect(cs.extractContext('before selected after', 'selected', 500))
      .toBe('before [[SNIPPET]] after');
  });

  test('handles snippet at start of parent text', () => {
    expect(cs.extractContext('selected after', 'selected', 500))
      .toBe('[[SNIPPET]] after');
  });

  test('returns empty string when selected text not found', () => {
    expect(cs.extractContext('some text', 'missing', 500)).toBe('');
  });

  test('respects context length limit', () => {
    const long = 'a'.repeat(600);
    const result = cs.extractContext(long + 'TARGET' + long, 'TARGET', 10);
    const [before, after] = result.split('[[SNIPPET]]');
    expect(before.length).toBeLessThanOrEqual(10);
    expect(after.length).toBeLessThanOrEqual(10);
  });
});

// ─── escapeHtml ───────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  test('escapes < > & and "', () => {
    expect(cs.escapeHtml('<b>"hello"&world</b>'))
      .toBe('&lt;b&gt;&quot;hello&quot;&amp;world&lt;/b&gt;');
  });

  test('returns plain string unchanged', () => {
    expect(cs.escapeHtml('hello world')).toBe('hello world');
  });
});

// ─── FR-1.1: Text Selection Detection ────────────────────────────────────────

describe('FR-1.1 Text Selection Detection', () => {
  test('shows capture button when selection is >= 3 chars', () => {
    mockSelection('hello world');
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(document.getElementById('sh-capture-btn')).not.toBeNull();
  });

  test('does not show button when selection is < 3 chars', () => {
    mockSelection('ab');
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(document.getElementById('sh-capture-btn')).toBeNull();
  });

  test('does not show button when nothing is selected', () => {
    window.getSelection = jest.fn(() => ({ toString: () => '' }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(document.getElementById('sh-capture-btn')).toBeNull();
  });
});

// ─── FR-1.2: Capture Action Trigger ──────────────────────────────────────────

describe('FR-1.2 Capture Action Trigger', () => {
  test('button uses fixed positioning and correct title', () => {
    mockSelection('hello world');
    document.dispatchEvent(new MouseEvent('mouseup'));
    const btn = document.getElementById('sh-capture-btn');
    expect(btn).not.toBeNull();
    expect(btn.style.position).toBe('fixed');
    expect(btn.title).toBe('Save to SnipHarvest');
  });

  test('replaces previous button when selection changes', () => {
    mockSelection('first selection');
    document.dispatchEvent(new MouseEvent('mouseup'));
    mockSelection('second selection');
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(document.querySelectorAll('#sh-capture-btn').length).toBe(1);
  });
});

// ─── FR-1.3: Snippet Capture ─────────────────────────────────────────────────

describe('FR-1.3 Snippet Capture', () => {
  test('sends CAPTURE_SNIPPET message with text and context', () => {
    const parentEl = document.createElement('div');
    parentEl.textContent = 'before hello world after';
    mockSelection('hello world', parentEl);
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => cb({ success: true, id: 'test-id' }));

    document.dispatchEvent(new MouseEvent('mouseup'));
    document.getElementById('sh-capture-btn').click();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CAPTURE_SNIPPET',
        payload: expect.objectContaining({
          text: 'hello world',
          context: expect.stringContaining('[[SNIPPET]]'),
        }),
      }),
      expect.any(Function)
    );
  });

  test('removes capture button after clicking it', () => {
    mockSelection('hello world');
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => cb({ success: true, id: 'test-id' }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    document.getElementById('sh-capture-btn').click();
    expect(document.getElementById('sh-capture-btn')).toBeNull();
  });

  test('does nothing if selection drops below 3 chars before click', () => {
    mockSelection('hi'); // too short
    document.dispatchEvent(new MouseEvent('mouseup'));
    // button was never added; calling onCapture directly also bails out
    cs.onCapture();
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
  });
});

// ─── FR-1.4: Capture Confirmation ────────────────────────────────────────────

describe('FR-1.4 Capture Confirmation', () => {
  beforeEach(() => jest.useFakeTimers());

  function capture(text) {
    mockSelection(text);
    chrome.runtime.sendMessage.mockImplementation((msg, cb) => cb && cb({ success: true, id: 'saved-id' }));
    document.dispatchEvent(new MouseEvent('mouseup'));
    document.getElementById('sh-capture-btn').click();
  }

  test('shows toast with snippet preview', () => {
    capture('hello world');
    const toast = document.getElementById('sh-toast');
    expect(toast).not.toBeNull();
    expect(toast.querySelector('.sh-preview').textContent).toContain('hello world');
  });

  test('toast includes a View link', () => {
    capture('some text');
    expect(document.querySelector('.sh-view')).not.toBeNull();
  });

  test('toast includes an Undo button', () => {
    capture('some text');
    expect(document.querySelector('.sh-undo')).not.toBeNull();
  });

  test('undo sends DELETE_SNIPPET and removes toast', () => {
    capture('some text');
    document.querySelector('.sh-undo').click();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'DELETE_SNIPPET', id: 'saved-id' }
    );
    expect(document.getElementById('sh-toast')).toBeNull();
  });

  test('toast auto-dismisses after 5 seconds', () => {
    capture('some text');
    expect(document.getElementById('sh-toast')).not.toBeNull();
    jest.advanceTimersByTime(5001);
    expect(document.getElementById('sh-toast')).toBeNull();
  });

  test('preview is truncated at 60 chars with ellipsis', () => {
    capture('a'.repeat(80));
    const preview = document.querySelector('.sh-preview').textContent;
    expect(preview).toContain('\u2026');
    expect(preview.length).toBeLessThan(80);
  });
});
