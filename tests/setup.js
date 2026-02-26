global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: { addListener: jest.fn() },
    onInstalled: { addListener: jest.fn() },
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  contextMenus: {
    create: jest.fn(),
    onClicked: { addListener: jest.fn() },
  },
};

Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: jest.fn(() => 'test-uuid-1234') },
  writable: true,
  configurable: true,
});

// Simulates importScripts() in service worker — no-op in test env
global.importScripts = jest.fn();

// SnipStorage mock used by service-worker tests
// (storage.test.js requires the real module directly and overwrites this)
global.SnipStorage = {
  getAll: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  buildSnippet: jest.fn(),
};
