# Text Selection & Capture — Implementation Notes

Covers FR-1.1 through FR-1.4 from `docs/p0.md`.

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest — declares permissions, content script, service worker |
| `content/content-script.js` | Selection detection, capture button, toast notification |
| `content/content-styles.css` | Styles for the capture button and toast |
| `background/service-worker.js` | Handles capture messages, context menu, storage read/write |
| `tests/setup.js` | Jest global mocks for `chrome.*` and `crypto` |
| `tests/content/content-script.test.js` | 18 tests for content-script logic |
| `tests/background/service-worker.test.js` | 12 tests for service-worker logic |

---

## What Each FR Implements

### FR-1.1 — Text Selection Detection
`content-script.js` listens for `mouseup` on `document`. On each event it reads `window.getSelection()` and checks the trimmed length. Selections under 3 characters are ignored.

### FR-1.2 — Capture Action Trigger
When a valid selection is detected, a fixed-position `<button id="sh-capture-btn">` is injected near the selected text (above and to the right of the selection rect). Only one button exists at a time — a new selection replaces the previous button.

A right-click context menu entry ("Save to SnipHarvest") is registered by the service worker via `chrome.contextMenus.create` on `onInstalled`.

### FR-1.3 — Snippet Capture
Clicking the button sends a `CAPTURE_SNIPPET` message to the service worker with `{ text, context }`. The service worker builds a snippet object (UUID, text, url, pageTitle, context, timestamp, createdDate, plus empty tags/notes/isFavorite) and prepends it to the `snippets` array in `chrome.storage.local`. The context is extracted from the parent element's text content — 500 characters before and after the selection, with the selection replaced by `[[SNIPPET]]` as a marker.

### FR-1.4 — Capture Confirmation
On a successful save response, a `<div id="sh-toast">` is injected containing:
- A truncated preview of the snippet (60 chars max)
- A **View** link (sends `OPEN_POPUP` to the background)
- An **Undo** button (sends `DELETE_SNIPPET` and removes the toast immediately)

The toast auto-dismisses after 5 seconds.

---

## Running Tests

Install dependencies (first time only):
```bash
npm install
```

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npx jest --watch
```

Run a single test file:
```bash
npx jest tests/content/content-script.test.js
npx jest tests/background/service-worker.test.js
```

---

## Test Coverage

### `tests/content/content-script.test.js` (18 tests)

| Group | Tests |
|-------|-------|
| `extractContext` | wraps snippet with `[[SNIPPET]]`, handles start-of-text, returns `''` when not found, respects length limit |
| `escapeHtml` | escapes `< > & "`, passes plain strings unchanged |
| FR-1.1 | shows button on ≥ 3 chars, no button on < 3 chars, no button on empty selection |
| FR-1.2 | button has `position:fixed` and correct title, replaces previous button |
| FR-1.3 | sends correct `CAPTURE_SNIPPET` message, removes button after click, bails on short selection |
| FR-1.4 | toast shows preview, has View link, has Undo button, Undo sends `DELETE_SNIPPET`, toast auto-dismisses after 5 s, long previews are truncated |

### `tests/background/service-worker.test.js` (12 tests)

| Group | Tests |
|-------|-------|
| `buildSnippet` | contains all required schema fields, uses `crypto.randomUUID` for id |
| `saveSnippet` | prepends to existing list, creates array when storage is empty |
| `deleteSnippet` | removes matched id, handles empty storage |
| `onMessage CAPTURE_SNIPPET` | responds `{ success, id }`, stores correct url and pageTitle |
| `onMessage DELETE_SNIPPET` | removes snippet and responds `{ success: true }` |
| `onMessage unknown` | returns `undefined` for unrecognised message types |

---

## Implementation Notes

- Both JS files use an IIFE pattern — `(function(exports){...})(typeof module !== 'undefined' ? module.exports : {})` — so they work as plain scripts in the browser and as testable CommonJS modules in Jest.
- `global.crypto` must be set via `Object.defineProperty(globalThis, 'crypto', ...)` in `tests/setup.js`; a plain assignment is silently overridden by jsdom's built-in Web Crypto API.
- `saveSnippet` constructs the new array with `[snippet].concat(existing)` rather than mutating the array returned from storage, which would cause double-prepend bugs in tests.
- Service-worker async tests use `await flushPromises()` (`new Promise(r => setTimeout(r, 0))`) instead of `await Promise.resolve()`, because the `get → set → sendResponse` chain spans multiple microtask checkpoints that a single `Promise.resolve()` does not drain.
