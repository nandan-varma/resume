"use client";

import { useEffect } from "react";

export function BusyTexSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        // Keep the ~355 MB busytex cache alive under storage pressure
        if ("storage" in navigator && "persist" in navigator.storage) {
          navigator.storage.persist();
        }
      })
      .catch(() => {
        // SW is progressive enhancement — silently ignore registration failures
      });
  }, []);

  return null;
}
