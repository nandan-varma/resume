// Prefixed console logger shared across content script files. Content scripts
// run as classic (non-module) scripts sharing one global scope — this mirrors
// shared/logger.js (which background.js/popup.js import as an ES module).
const PREFIX = "[JobMatch]";

const logger = {
  info: (...args) => console.info(PREFIX, ...args),
  warn: (...args) => console.warn(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args),
  debug: (...args) => console.debug(PREFIX, ...args),
};
