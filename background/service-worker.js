/* global chrome, SnipStorage, importScripts */

// Load storage utility (no-op in test environment where importScripts is mocked)
if (typeof importScripts !== 'undefined') importScripts('../utils/storage.js');

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
    var snippet = SnipStorage.buildSnippet({
      text: info.selectionText,
      context: '',
      url: info.pageUrl,
      pageTitle: tab ? tab.title || '' : '',
    });
    SnipStorage.save(snippet);
  });

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    return onMessage(message, sender, sendResponse);
  });

  function onMessage(message, sender, sendResponse) {
    if (message.type === 'CAPTURE_SNIPPET') {
      var snippet = SnipStorage.buildSnippet({
        text: message.payload.text,
        context: message.payload.context,
        url: sender.tab ? sender.tab.url : '',
        pageTitle: sender.tab ? sender.tab.title || '' : '',
      });
      SnipStorage.save(snippet)
        .then(function () {
          sendResponse({ success: true, id: snippet.id });
        })
        .catch(function (err) {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
    if (message.type === 'DELETE_SNIPPET') {
      SnipStorage.remove(message.id).then(function () {
        sendResponse({ success: true });
      });
      return true;
    }
  }

  Object.assign(exports, { onMessage: onMessage });

})(typeof module !== 'undefined' ? module.exports : {});
