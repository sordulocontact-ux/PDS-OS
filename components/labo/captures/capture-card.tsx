"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { CaptureArtistRow } from "@/components/labo/captures/capture-artist-row";
import type { CaptureItem } from "@/components/labo/captures/use-capture-queue";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { fr } from "@/lib/i18n/fr";
import { sectionCardClass } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

/** A screenshot, its reading state, and the people read on it. */
export function CaptureCard({
  item,
  onRemove,
  onRetry,
}: {
  item: CaptureItem;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const t = fr.laboCaptures;
  const preview = useObjectUrl(item.file);
  const { result } = item;

  const badge =
    item.status === "done" && result && !result.isTikTok ? (
      <StatusBadge tone="warning">{t.status.notTiktok}</StatusBadge>
    ) : (
      <StatusBadge
        tone={
          item.status === "done"
            ? "success"
            : item.status === "failed"
              ? "danger"
              : item.status === "reading"
                ? "info"
                : "neutral"
        }
      >
        {t.status[item.status]}
      </StatusBadge>
    );

  return (
    <article
      className={cn(
        sectionCardClass,
        "grid grid-cols-[88px_minmax(0,1fr)] gap-4 sm:grid-cols-[120px_minmax(0,1fr)]",
      )}
      aria-busy={item.status === "reading"}
    >
      {preview && (
        // A local preview of the file: next/image has nothing to optimize.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="w-full self-start rounded-lg border border-[var(--border-hairline)] bg-[var(--surface-sunken)] object-contain"
        />
      )}
      <div className="grid min-w-0 content-start gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {item.file.name}
          </span>
          {badge}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.remove(item.file.name)}
            onClick={onRemove}
          >
            <IconXmark aria-hidden className="size-4" />
          </Button>
        </div>

        {item.status === "failed" && (
          <div className="grid justify-items-start gap-2">
            <p className="text-sm text-[color:var(--error)]">
              {t.errors[item.error ?? "provider_error"]}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          </div>
        )}

        {result && item.status === "done" && (
          <>
            {result.artists.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.nobody}</p>
            ) : (
              <ul className="grid gap-4">
                {result.artists.map((artist) => (
                  <CaptureArtistRow
                    key={artist.names.join("|")}
                    artist={artist}
                  />
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground tabular-nums">
              {t.meta(result.model, (result.durationMs / 1000).toFixed(1))}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
