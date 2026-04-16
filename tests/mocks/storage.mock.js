'use strict';

function createMockStorage() {
  const store = {};
  return {
    getItem:    (key)        => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem:    (key, value) => { store[key] = String(value); },
    removeItem: (key)        => { delete store[key]; },
    clear:      ()           => { Object.keys(store).forEach(k => delete store[k]); },
    get length()             { return Object.keys(store).length; },
    _dump:      ()           => ({ ...store }),
  };
}

module.exports = { createMockStorage };
