/* global chrome, crypto */

// FR-1.2 context menu + FR-1.3 capture handler + storage helpers
(function (exports) {
  'use strict';

  chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
      id: 'snipharvest-save',
      title: 'Save to SnipHarvest',
      contexts: ['selection'],
    });
  });

  // FR-1.2: Context menu alternative trigger
  chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId !== 'snipharvest-save') return;
    var snippet = buildSnippet({
      text: info.selectionText,
      context: '',
      url: info.pageUrl,
      pageTitle: tab ? tab.title || '' : '',
    });
    saveSnippet(snippet);
  });

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    return onMessage(message, sender, sendResponse);
  });

  // FR-1.3: Build, save snippet; FR-1.4 undo via DELETE_SNIPPET
  function onMessage(message, sender, sendResponse) {
    if (message.type === 'CAPTURE_SNIPPET') {
      var snippet = buildSnippet({
        text: message.payload.text,
        context: message.payload.context,
        url: sender.tab ? sender.tab.url : '',
        pageTitle: sender.tab ? sender.tab.title || '' : '',
      });
      saveSnippet(snippet).then(function () {
        sendResponse({ success: true, id: snippet.id });
      });
      return true; // keep message channel open for async response
    }
    if (message.type === 'DELETE_SNIPPET') {
      deleteSnippet(message.id).then(function () {
        sendResponse({ success: true });
      });
      return true;
    }
  }

  // FR-1.3: Snippet schema (FR-2.2)
  function buildSnippet(opts) {
    var now = new Date();
    return {
      id: crypto.randomUUID(),
      text: opts.text,
      url: opts.url,
      pageTitle: opts.pageTitle,
      context: opts.context,
      timestamp: now.toISOString(),
      createdDate: now.toISOString().slice(0, 10),
      tags: [],
      notes: '',
      isFavorite: false,
    };
  }

  function saveSnippet(snippet) {
    return chrome.storage.local.get('snippets').then(function (result) {
      var snippets = [snippet].concat(result.snippets || []);
      return chrome.storage.local.set({ snippets: snippets });
    });
  }

  function deleteSnippet(id) {
    return chrome.storage.local.get('snippets').then(function (result) {
      var snippets = (result.snippets || []).filter(function (s) { return s.id !== id; });
      return chrome.storage.local.set({ snippets: snippets });
    });
  }

  Object.assign(exports, {
    buildSnippet: buildSnippet,
    saveSnippet: saveSnippet,
    deleteSnippet: deleteSnippet,
    onMessage: onMessage,
  });

})(typeof module !== 'undefined' ? module.exports : {});
