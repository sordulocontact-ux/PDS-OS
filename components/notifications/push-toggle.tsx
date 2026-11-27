"use client";

import { IconBell } from "nucleo-sharp-essential";
import { usePushSubscription } from "@/components/notifications/use-push-subscription";
import { Button } from "@/components/ui/button";
import { notifications } from "@/lib/i18n/fr/notifications";
import { settings } from "@/lib/i18n/fr/settings";

const fr = { notifications, settings };

// "Activer les notifications du navigateur". Hidden when push is not set up.
// `row`: the control of a row of Paramètres › Notifications, whose label
// already names it (« Activées » and « Désactiver », or « Activer »).
export function PushToggle({
  publicKey,
  row = false,
}: {
  publicKey: string | null;
  row?: boolean;
}) {
  const t = fr.notifications.push;
  const { state, busy, enable, disable } = usePushSubscription(publicKey);

  if (state === "loading") return null;
  if (state === "unsupported")
    return publicKey ? (
      <p className="text-xs text-muted-foreground modern:text-caption">
        {t.unsupported}
      </p>
    ) : null;
  if (state === "denied")
    return (
      <p className="text-xs text-muted-foreground modern:text-caption">
        {t.denied}
      </p>
    );

  if (state === "on" && row)
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-body-sm text-[color:var(--text-secondary)]">
          <IconBell className="size-4" aria-hidden />
          {fr.settings.notifications.on}
        </span>
        <Button variant="outline" size="sm" onClick={disable} disabled={busy}>
          {t.disable}
        </Button>
      </div>
    );

  if (state === "on")
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-muted-foreground modern:text-caption">
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
        {busy ? t.enabling : row ? fr.settings.notifications.enable : t.enable}
      </Button>
      {state === "failed" && (
        <p
          role="alert"
          className="text-xs text-muted-foreground modern:text-caption"
        >
          {t.failed}
        </p>
      )}
    </div>
  );
}
