/* global chrome, Node */

// FR-1.1 / FR-1.2 / FR-1.3 / FR-1.4: Text selection, capture button, snippet save, toast confirmation
(function (exports) {
  'use strict';

  var MIN_CHARS = 3;
  var CONTEXT_LEN = 500;
  var UNDO_MS = 5000;

  var captureBtn = null;
  var toast = null;
  var lastId = null;
  var undoTimer = null;

  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mousedown', function (e) {
    if (captureBtn && !captureBtn.contains(e.target)) hideCaptureBtn();
  });

  // FR-1.1: Detect text selection (min 3 chars)
  function onMouseUp(e) {
    if (e.target && e.target.closest && e.target.closest('#sh-capture-btn,#sh-toast')) return;
    var sel = window.getSelection();
    var text = sel ? sel.toString().trim() : '';
    if (text.length >= MIN_CHARS) {
      showCaptureBtn(sel);
    } else {
      hideCaptureBtn();
    }
  }

  // FR-1.2: Floating capture button, positioned near selected text
  function showCaptureBtn(sel) {
    hideCaptureBtn();
    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    captureBtn = document.createElement('button');
    captureBtn.id = 'sh-capture-btn';
    captureBtn.title = 'Save to SnipHarvest';
    captureBtn.textContent = '\u2702';
    captureBtn.style.cssText =
      'position:fixed;' +
      'top:' + Math.max(0, rect.top - 44) + 'px;' +
      'left:' + (rect.right + 4) + 'px;' +
      'z-index:2147483647;';
    captureBtn.addEventListener('click', onCapture);
    document.body.appendChild(captureBtn);
  }

  function hideCaptureBtn() {
    if (captureBtn) { captureBtn.remove(); captureBtn = null; }
  }

  // FR-1.3: Send selected text + context to background for saving
  function onCapture() {
    var sel = window.getSelection();
    var text = sel ? sel.toString().trim() : '';
    if (text.length < MIN_CHARS) return;
    var parentText = getParentText(sel);
    var context = extractContext(parentText, text, CONTEXT_LEN);
    hideCaptureBtn();
    if (sel.removeAllRanges) sel.removeAllRanges();
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_SNIPPET', payload: { text: text, context: context } },
      function (res) {
        if (res && res.success) {
          lastId = res.id;
          showToast(text, res.id);
        }
      }
    );
  }

  function getParentText(sel) {
    var range = sel.getRangeAt(0);
    var node = range.commonAncestorContainer;
    var el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return el ? (el.textContent || '') : '';
  }

  function extractContext(parentText, selected, len) {
    var idx = parentText.indexOf(selected);
    if (idx === -1) return '';
    var before = parentText.slice(Math.max(0, idx - len), idx);
    var after = parentText.slice(idx + selected.length, idx + selected.length + len);
    return before + '[[SNIPPET]]' + after;
  }

  // FR-1.4: Toast with preview, View link, and Undo (within 5s)
  function showToast(text, id) {
    hideToast();
    toast = document.createElement('div');
    toast.id = 'sh-toast';
    var preview = escapeHtml(text.slice(0, 60)) + (text.length > 60 ? '\u2026' : '');
    toast.innerHTML =
      '<span class="sh-preview">' + preview + '</span>' +
      '<a class="sh-view" href="#">View</a>' +
      '<button class="sh-undo">Undo</button>';
    toast.querySelector('.sh-undo').addEventListener('click', onUndo);
    toast.querySelector('.sh-view').addEventListener('click', function (e) {
      e.preventDefault();
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });
    document.body.appendChild(toast);
    undoTimer = setTimeout(hideToast, UNDO_MS);
  }

  function hideToast() {
    clearTimeout(undoTimer);
    if (toast) { toast.remove(); toast = null; }
  }

  function onUndo() {
    if (lastId) {
      chrome.runtime.sendMessage({ type: 'DELETE_SNIPPET', id: lastId });
      lastId = null;
    }
    hideToast();
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Resets internal state between tests
  function _reset() {
    hideCaptureBtn();
    hideToast();
    lastId = null;
  }

  Object.assign(exports, {
    onMouseUp: onMouseUp,
    onCapture: onCapture,
    showToast: showToast,
    onUndo: onUndo,
    extractContext: extractContext,
    escapeHtml: escapeHtml,
    _reset: _reset,
  });

})(typeof module !== 'undefined' ? module.exports : {});
