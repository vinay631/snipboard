# Popup Interface — Implementation Notes

Covers FR-3.1 through FR-3.4 from `docs/p0.md`.

---

## Files

| File | Purpose |
|------|---------|
| `popup/popup.html` | Shell page — loads `storage.js` then `popup.js` |
| `popup/popup.js` | All popup logic — list, detail, search, CRUD |
| `popup/popup.css` | Styles for cards, detail overlay, search, pagination |
| `tests/popup/popup.test.js` | 66 tests covering all four FRs |

---

## What Each FR Implements

### FR-3.1 — Snippet List View

`init()` calls `SnipStorage.getAll()`, stores the result in module state, then calls `render()`. A search input listener is also registered here.

`renderList(snippets, page)` handles three states:
- **Empty (no snippets):** generic onboarding message
- **Empty (filtered):** "No results for …" message containing the query
- **Has snippets:** renders `<article class="sh-card">` elements via `renderCard()`, then a `<nav class="sh-pager">` if total exceeds 20

Each card (`renderCard`) shows:
- Preview text truncated at 150 characters
- Source favicon (`origin/favicon.ico`, hidden on 404 via `onerror`)
- Page title truncated at 40 characters, falling back to URL
- Relative capture time (e.g. "2 days ago")

Clicking a card calls `openDetail(snippet)`.

### FR-3.2 — Snippet Detail View

`openDetail(snippet)` replaces the contents of `#detail` with:
- Full snippet text in a `<div class="sh-detail-text">`
- An expandable `<details class="sh-context">` section when `snippet.context` is non-empty. The `[[SNIPPET]]` marker is replaced with a `<mark>` tag wrapping the snippet text so the captured excerpt is visually highlighted in context
- A metadata row: clickable `<a target="_blank">` link to the source URL, and a localised timestamp
- Action buttons: **Copy**, **Edit**, **Delete**

Three ways to close the detail:
1. **✕ button** — `id="sh-close"`
2. **ESC key** — a `keydown` listener is added on `document` when the detail opens and removed when it closes
3. **Backdrop click** — `click` handler on the overlay `div` checks `event.target === detailEl`

### FR-3.3 — Search Functionality

`filterSnippets(snippets, query)` does a case-insensitive substring check across four fields: `text`, `pageTitle`, `url`, and each entry in `tags`. An empty query returns the full list unfiltered.

`highlight(escapedText, query)` runs a case-insensitive regex over already-HTML-escaped text and wraps every match in `<mark>$1</mark>`. Regex special characters in the query are escaped before building the pattern, so queries like `$5.00` work correctly.

### FR-3.4 — Basic Actions

**Delete** — `deleteSnippet(id)` calls `window.confirm()` first. On confirmation it calls `SnipStorage.remove()`, filters the snippet out of `state.snippets`, closes the detail, and re-renders the list.

**Edit** — `startEdit(snippet)` replaces the `<div class="sh-detail-text">` with a `<textarea id="sh-edit-area">` pre-filled with current text, and swaps the action buttons to **Save** / **Cancel**.
- On **Save**: trims the textarea value (no-ops if blank), calls `SnipStorage.update()` with `{ text: newText }`. If `snippet.originalText` is not yet set, `originalText: snippet.text` is also included — this preserves the first version of the text across multiple edits.
- On **Cancel**: calls `openDetail(snippet)` to restore the unchanged detail view.

**Copy** — `copySnippet(text)` calls `navigator.clipboard.writeText()`. On success the button label briefly changes to "Copied!" for 1.5 seconds.

**Open URL** — the detail URL is a plain `<a href="…" target="_blank">`. Chrome extension popup pages follow `target="_blank"` links in new tabs without requiring any extra manifest permission.

---

## Design Decisions

**Single module state object** — `state = { snippets, query, page }` is a plain object inside the IIFE closure. All rendering functions read from it. This makes render deterministic and easy to reset in tests via `_reset()`.

**`render()` is always synchronous** — only `init()` and the CRUD operations are async (they touch storage). Once `state.snippets` is populated, `render()` / `renderList()` / `renderCard()` are all synchronous DOM operations, which means search filtering and pagination respond instantly.

**`highlight` operates on escaped text** — `renderCard` calls `escapeHtml(truncate(...))` first, then passes the result to `highlight`. This means user-supplied text is always safely escaped before any `<mark>` tags are injected, preventing XSS.

**Context marker replacement** — The `[[SNIPPET]]` placeholder is replaced with a null byte (`\x00`) before escaping the context string. This allows safe HTML-escaping of the surrounding text without accidentally escaping the placeholder itself, after which `\x00` is replaced with the final `<mark>` HTML.

**`originalText` preservation** — The `originalText` field is only written on the first edit (`if (!snippet.originalText)`). Subsequent edits update `text` but leave `originalText` pointing to the very first captured version, satisfying the "preserve original in history" requirement without needing a full edit history array.

**No `chrome.tabs` required** — Opening the source URL uses `<a target="_blank">` rather than `chrome.tabs.create()`, avoiding the need for the `tabs` manifest permission while achieving the same result in extension popup pages.

**Auto-init guarded by `typeof module`** — The final line `if (typeof module === 'undefined') init()` runs `init()` automatically when loaded as a plain browser script (popup page), but not when `require()`d in Jest, giving tests full control over when initialisation happens.

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

Run only popup tests:
```bash
npx jest tests/popup/popup.test.js
```

---

## Test Coverage

### `tests/popup/popup.test.js` (66 tests)

| Group | Tests |
|-------|-------|
| `relativeTime` | just now, minutes, hours, singular/plural days, months |
| `truncate` | under max, over max with ellipsis, falsy input |
| `faviconUrl` | valid URL → origin + `/favicon.ico`, invalid URL → `''` |
| `escapeHtml` | escapes `& < > "`, handles falsy input |
| `highlight` | wraps match in `<mark>`, case-insensitive, empty query no-op, regex chars in query |
| `paginate` | first page, last page, correct total, page clamping |
| `filterSnippets` | empty query returns all, filters by text / pageTitle / url / tag, no match |
| FR-3.1 `renderList` | empty state, no-results message, correct card count, 20-per-page limit, pager shown/hidden |
| FR-3.1 `renderCard` | preview text, title, relative date, click opens detail, long text truncated |
| FR-3.1 `init` | loads snippets and renders, shows empty state |
| FR-3.3 search | real-time filter, highlights in previews, no-results message, resets to page 1 |
| FR-3.2 `openDetail` | full text, URL href + target, page title, context shown/hidden, snippet highlighted in context, all action buttons, close button, ESC key |
| FR-3.4 `deleteSnippet` | removes after confirm, no-op on cancel, updates state |
| FR-3.4 `startEdit` | textarea pre-filled, save calls update with `originalText`, no overwrite of existing `originalText`, cancel restores view, blank save no-ops |
| FR-3.4 `copySnippet` | calls `navigator.clipboard.writeText` |
| Pagination controls | Next advances page, Prev disabled on page 1, Next disabled on last page |
