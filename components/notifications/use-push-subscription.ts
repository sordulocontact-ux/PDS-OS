"use client";

import { useEffect, useState } from "react";

import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/notifications/actions";

export type PushState =
  "loading" | "unsupported" | "denied" | "off" | "on" | "failed";

const SW_URL = "/sw.js";

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// The VAPID public key is base64url; the Push API wants bytes.
function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = `${base64url}${"=".repeat((4 - (base64url.length % 4)) % 4)}`;
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

// This browser's notifications: asks the permission, subscribes the browser and
// stores the subscription. The bell's toggle and the presentation share it.
export function usePushSubscription(publicKey: string | null) {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!publicKey || !supported()) return setState("unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const registration =
        await navigator.serviceWorker.getRegistration(SW_URL);
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) setState(subscription ? "on" : "off");
    }
    check().catch(() => !cancelled && setState("off"));
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.register(SW_URL);
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(publicKey),
        }));
      const saved = await savePushSubscription(subscription.toJSON());
      setState(saved ? "on" : "failed");
    } catch {
      setState("failed");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const registration =
        await navigator.serviceWorker.getRegistration(SW_URL);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  return { state, busy, enable, disable };
}
