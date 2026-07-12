"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // PWA install should not block the app if SW registration fails.
    });
  }, []);

  return null;
}
