import {
  handleAnalyze,
  handleGetInit,
  handleSaveJob,
  handleSignOut,
} from "./background/api.js";
import { APP_URL } from "./background/config.js";
import { getSettings } from "./background/settings.js";
import { logger } from "./shared/logger.js";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handlers = {
    GET_INIT: handleGetInit,
    GET_SETTINGS: () => getSettings(),
    SET_SETTINGS: () =>
      chrome.storage.sync.set(msg.settings).then(() => ({ ok: true })),
    ANALYZE: () => handleAnalyze(msg.jobDescription),
    SAVE_JOB: () =>
      handleSaveJob(msg.jobTitle, msg.jobDescription, msg.link, msg.analysis),
    SIGN_OUT: handleSignOut,
  };

  const handler = handlers[msg.type];
  if (!handler) {
    logger.warn("Unknown message type:", msg.type);
    return;
  }
  handler()
    .then(sendResponse)
    .catch((e) => {
      logger.error(`${msg.type} threw:`, e.message);
      sendResponse({ error: e.message });
    });
  return true;
});

logger.info("Background service worker started. App URL:", APP_URL);
