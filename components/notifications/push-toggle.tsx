"use client";

import { IconBell } from "nucleo-sharp-essential";
import { usePushSubscription } from "@/components/notifications/use-push-subscription";
import { Button } from "@/components/ui/button";
import { notifications } from "@/lib/i18n/fr/notifications";

const fr = { notifications };

// "Activer les notifications du navigateur". Hidden when push is not set up.
export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const t = fr.notifications.push;
  const { state, busy, enable, disable } = usePushSubscription(publicKey);

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
