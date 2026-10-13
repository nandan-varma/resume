// Shared console logger for module-context scripts (background, popup).
// Content scripts run as classic (non-module) scripts and can't import this —
// they use the equivalent content/logger.js instead.
const PREFIX = "[JobMatch]";

export const logger = {
  debug: (...args) => console.debug(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args),
  info: (...args) => console.info(PREFIX, ...args),
  warn: (...args) => console.warn(PREFIX, ...args),
};
