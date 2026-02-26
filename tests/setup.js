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
