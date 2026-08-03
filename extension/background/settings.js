import { DEFAULT_MODEL_ID } from "../shared/models.js";
import { APP_URL } from "./config.js";

export const DEFAULT_SETTINGS = {
  autoAnalyze: false,
  autoSave: false,
  modelId: DEFAULT_MODEL_ID,
};

export function getSettings() {
  return chrome.storage.sync.get({ ...DEFAULT_SETTINGS, appUrl: APP_URL });
}
