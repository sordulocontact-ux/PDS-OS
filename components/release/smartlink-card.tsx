"use client";

import { IconCopy, IconExternalLink } from "@/components/icons";
import { useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/ui/status-badge";
import { onlineTreatment } from "@/lib/ui/state-treatments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fr } from "@/lib/i18n/fr";

const t = fr.release.smartlink;

type Props = {
  url: string;
  enabled: boolean;
  toggleAction: (enabled: boolean) => Promise<{ ok: boolean }>;
};

/** Public smartlink: on/off switch, its address and a copy button. */
export function SmartlinkCard({ url, enabled, toggleAction }: Props) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      try {
        const result = await toggleAction(!enabled);
        if (!result.ok) toast.error(t.error);
      } catch {
        toast.error(t.error);
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyFailed);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.hint}</CardDescription>
        <CardAction>
          <StatusBadge treatment={onlineTreatment(enabled)}>
            {enabled ? t.enabled : t.disabled}
          </StatusBadge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <label htmlFor="smartlink-url" className="text-sm font-medium">
            {t.urlLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="smartlink-url"
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-muted/40 px-2.5 font-mono text-base text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9 md:text-sm"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="lg" onClick={copy}>
                <IconCopy data-icon="inline-start" aria-hidden />
                {t.copy}
              </Button>
              {enabled && (
                <Button
                  variant="ghost"
                  size="lg"
                  nativeButton={false}
                  render={
                    <a href={url} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  <IconExternalLink data-icon="inline-start" aria-hidden />
                  {t.open}
                </Button>
              )}
            </div>
          </div>
          {!enabled && (
            <p className="text-xs text-muted-foreground">{t.offHint}</p>
          )}
        </div>

        <div>
          <Button
            type="button"
            size="lg"
            variant={enabled ? "outline" : "default"}
            onClick={toggle}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? t.pending : enabled ? t.disable : t.enable}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
