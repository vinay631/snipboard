/* global chrome, crypto, self */

// FR-2.1 / FR-2.2 / FR-2.3: Local storage, data schema, persistence & quota handling
(function () {
  'use strict';

  var MAX_SNIPPETS = 10000;
  var KEY = 'snippets';

  // FR-2.1: Retrieve all snippets
  function getAll() {
    return chrome.storage.local.get(KEY).then(function (result) {
      return result[KEY] || [];
    });
  }

  // FR-2.3: Save with limit check and quota-exceeded handling
  function save(snippet) {
    return getAll().then(function (snippets) {
      if (snippets.length >= MAX_SNIPPETS) {
        return Promise.reject(new Error('LIMIT_EXCEEDED'));
      }
      return chrome.storage.local
        .set({ snippets: [snippet].concat(snippets) })
        .catch(function (err) {
          var msg = err && err.message ? err.message : '';
          if (msg.indexOf('QUOTA_BYTES') !== -1) {
            return Promise.reject(new Error('QUOTA_EXCEEDED'));
          }
          return Promise.reject(err);
        });
    });
  }

  function remove(id) {
    return getAll().then(function (snippets) {
      return chrome.storage.local.set({
        snippets: snippets.filter(function (s) { return s.id !== id; }),
      });
    });
  }

  function update(id, changes) {
    return getAll().then(function (snippets) {
      return chrome.storage.local.set({
        snippets: snippets.map(function (s) {
          return s.id === id ? Object.assign({}, s, changes) : s;
        }),
      });
    });
  }

  // FR-2.2: Full snippet schema — required + all optional fields
  function buildSnippet(opts) {
    var now = new Date();
    return {
      // Required
      id: crypto.randomUUID(),
      text: opts.text,
      url: opts.url,
      pageTitle: opts.pageTitle,
      context: opts.context,
      timestamp: now.toISOString(),
      createdDate: now.toISOString().slice(0, 10),
      // Optional (with defaults)
      tags: opts.tags || [],
      notes: opts.notes || '',
      color: opts.color || null,
      isFavorite: opts.isFavorite || false,
      folderId: opts.folderId || null,
    };
  }

  var api = { getAll: getAll, save: save, remove: remove, update: update, buildSnippet: buildSnippet };

  // Browser / service-worker: register on globalThis
  if (typeof self !== 'undefined') self.SnipStorage = api;
  // CommonJS / Jest
  if (typeof module !== 'undefined') module.exports = api;
})();
