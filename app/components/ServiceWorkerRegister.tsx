"use client";

import { useEffect } from "react";

// Registers a tiny service worker that only shows a friendly offline page when
// a navigation fails. It never stores signed-in pages or business data.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
