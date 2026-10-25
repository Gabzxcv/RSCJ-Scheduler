"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Keeps a shared schedule fresh: when the app comes back to the foreground (or
// every couple of minutes while it is open), reload the server data. Client
// state such as half-filled forms is kept by router.refresh().
const MIN_GAP_MS = 20_000;
const POLL_MS = 120_000;

export function AutoRefresh() {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    last.current = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (Date.now() - last.current < MIN_GAP_MS) return;
      last.current = Date.now();
      router.refresh();
    };
    const interval = window.setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [router]);

  return null;
}
