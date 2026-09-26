"use client";

import { IconBell } from "nucleo-sharp-essential";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/notifications/actions";

type State = "loading" | "unsupported" | "denied" | "off" | "on" | "failed";

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

// "Activer les notifications du navigateur": asks the permission, subscribes
// this browser and stores the subscription. Hidden when push is not set up.
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const t = fr.notifications.push;
  const [state, setState] = useState<State>("loading");
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

  if (state === "loading") return null;
  if (state === "unsupported")
    return publicKey ? (
      <p className="text-xs text-muted-foreground">{t.unsupported}</p>
    ) : null;
  if (state === "denied")
    return <p className="text-xs text-muted-foreground">{t.denied}</p>;

  if (state === "on")
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <IconBell className="size-3.5" aria-hidden />
          {t.enabled}
        </span>
        <Button variant="ghost" size="sm" onClick={disable} disabled={busy}>
          {t.disable}
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={enable}
        disabled={busy}
        aria-busy={busy || undefined}
      >
        <IconBell aria-hidden data-icon="inline-start" />
        {busy ? t.enabling : t.enable}
      </Button>
      {state === "failed" && (
        <p role="alert" className="text-xs text-muted-foreground">
          {t.failed}
        </p>
      )}
    </div>
  );
}
