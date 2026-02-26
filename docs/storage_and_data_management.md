# Storage & Data Management — Implementation Notes

Covers FR-2.1 through FR-2.3 from `docs/p0.md`.

---

## Files

| File | Purpose |
|------|---------|
| `utils/storage.js` | All `chrome.storage.local` logic — the authoritative storage layer |
| `background/service-worker.js` | Updated to delegate to `SnipStorage` via `importScripts` |
| `tests/setup.js` | Updated — adds `importScripts` and `SnipStorage` mocks |
| `tests/utils/storage.test.js` | 29 tests for the storage module |
| `tests/background/service-worker.test.js` | Rewritten — tests message routing only, mocks `SnipStorage` |

---

## What Each FR Implements

### FR-2.1 — Local Storage
`utils/storage.js` wraps all `chrome.storage.local` access behind four functions:

- `getAll()` — reads the `"snippets"` key and returns the array (or `[]` if empty)
- `save(snippet)` — enforces a hard cap of **10,000 snippets**; rejects with `LIMIT_EXCEEDED` if the cap is reached, otherwise prepends the new snippet and writes back atomically
- `remove(id)` — filters out the snippet with the given id and writes back
- `update(id, changes)` — maps over the array, merging `changes` into the matching snippet with `Object.assign`, leaving all others untouched

### FR-2.2 — Data Structure
`buildSnippet(opts)` constructs a snippet conforming to the full schema:

**Required fields** (always populated):

| Field | Source |
|-------|--------|
| `id` | `crypto.randomUUID()` |
| `text` | `opts.text` |
| `url` | `opts.url` |
| `pageTitle` | `opts.pageTitle` |
| `context` | `opts.context` |
| `timestamp` | `new Date().toISOString()` |
| `createdDate` | first 10 chars of `timestamp` |

**Optional fields** (populated from `opts` or defaulted):

| Field | Default |
|-------|---------|
| `tags` | `[]` |
| `notes` | `''` |
| `color` | `null` |
| `isFavorite` | `false` |
| `folderId` | `null` |

### FR-2.3 — Data Persistence
- **Auto-save**: every capture goes through `SnipStorage.save()` before the success response is sent
- **Quota exceeded**: if `chrome.storage.local.set()` throws an error containing `QUOTA_BYTES`, it is re-thrown as `Error('QUOTA_EXCEEDED')`; the service worker forwards this as `{ success: false, error: 'QUOTA_EXCEEDED' }` so the content script can surface it
- **Limit exceeded**: checked before the write, so no partial state is ever written when full
- **Crash safety**: `chrome.storage.local` is persisted to disk by Chrome between the `get` and `set` calls; no additional handling is required

---

## Architecture: Storage Module Pattern

`utils/storage.js` uses an IIFE that registers itself in two ways:

```js
if (typeof self !== 'undefined') self.SnipStorage = api;   // browser / service worker
if (typeof module !== 'undefined') module.exports = api;    // CommonJS / Jest
```

The service worker loads it at runtime via:
```js
if (typeof importScripts !== 'undefined') importScripts('../utils/storage.js');
```

In tests, `global.importScripts = jest.fn()` makes that call a no-op. The service-worker test instead relies on `global.SnipStorage` being pre-populated with Jest mocks from `tests/setup.js`.

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

Run only the storage tests:
```bash
npx jest tests/utils/storage.test.js
```

Run only the service-worker tests:
```bash
npx jest tests/background/service-worker.test.js
```

---

## Test Coverage

### `tests/utils/storage.test.js` (29 tests)

| Group | Tests |
|-------|-------|
| `buildSnippet` required fields | all 7 required fields present, `createdDate` matches `timestamp` prefix |
| `buildSnippet` optional fields | each of the 5 optional fields defaults correctly, custom values accepted |
| `getAll` | returns array from storage, returns `[]` when key absent, queries with correct key |
| `save` | prepends to list, creates list when empty, rejects at 10,000 (`LIMIT_EXCEEDED`), still saves at 9,999, rejects on Chrome quota error (`QUOTA_EXCEEDED`), re-throws unrelated errors |
| `remove` | removes correct snippet, handles empty storage, no-ops when id not found |
| `update` | merges changes into target snippet, leaves other snippets untouched, no-ops when id not found |

### `tests/background/service-worker.test.js` (11 tests)

| Group | Tests |
|-------|-------|
| `CAPTURE_SNIPPET` | builds snippet from payload + sender tab, responds `{ success, id }`, responds with error on quota exceeded, responds with error on limit exceeded, returns `true` to keep channel open |
| `DELETE_SNIPPET` | calls `SnipStorage.remove` with correct id, responds `{ success: true }` |
| Unknown type | returns `undefined` |

---

## Implementation Notes

- `save` uses `[snippet].concat(existing)` rather than `existing.unshift(snippet)` to avoid mutating the array returned directly from the storage mock — mutating it would cause double-prepend bugs in tests where the same array reference is reused.
- `update` uses `Object.assign({}, s, changes)` to produce a new object, so the original array is never mutated in place.
- The `global.SnipStorage` mock in `tests/setup.js` is only used by `service-worker.test.js`. When `storage.test.js` loads `utils/storage.js`, the real module overwrites `self.SnipStorage`; storage tests call the module's exported functions directly and are unaffected.
