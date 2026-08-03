// For local dev: set homepage_url to "http://localhost:3000" in manifest.json
export const APP_URL =
  chrome.runtime.getManifest().homepage_url ?? "https://resume.nandan.fyi";
