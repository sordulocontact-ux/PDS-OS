"use client";

import { IconLink, IconXmark } from "nucleo-sharp-essential";

import { CaptureArtistRow } from "@/components/labo/captures/capture-artist-row";
import { Avatar } from "@/components/ui/avatar";
import type { CaptureItem } from "@/components/labo/captures/use-capture-queue";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";
import { sectionCardClass } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

const fr = { laboCaptures };

// "tiktok.com/@huntrill" for a shared link: what a person recognizes.
function shortLink(text: string): string {
  const raw = /https?:\/\/[^\s<>"']+/i.exec(text)?.[0];
  if (!raw) return text;
  try {
    const url = new URL(raw);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return raw;
  }
}

/** A screenshot or a shared link, its reading state, and the people read
 * on it. A link read shows its account's profile picture in place of the
 * link icon (initials when the platform gave none). */
export function CaptureCard({
  item,
  canAddToNetwork,
  onRemove,
  onRetry,
}: {
  item: CaptureItem;
  canAddToNetwork: boolean;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const t = fr.laboCaptures;
  const preview = useObjectUrl(item.file);
  const { result } = item;
  const name = item.file?.name ?? shortLink(item.link ?? "");
  // A link names one account: its picture heads the card.
  const linked =
    item.link && item.status === "done" ? result?.artists[0] : undefined;

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
      {linked ? (
        <Avatar
          name={linked.account?.name ?? linked.artistName}
          pictureUrl={linked.pictureUrl}
          className="aspect-square h-auto w-full self-start text-[length:var(--type-body-xl)]"
        />
      ) : (
        item.link && (
          <div className="flex aspect-square w-full items-center justify-center self-start rounded-lg border border-[var(--border-hairline)] bg-[var(--surface-sunken)]">
            <IconLink aria-hidden className="size-6 text-muted-foreground" />
          </div>
        )
      )}
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
            {name}
          </span>
          {badge}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.remove(name)}
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
              {item.link ? t.retryLink : t.retry}
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
                    canAddToNetwork={canAddToNetwork}
                    // The link's card already shows it.
                    withPicture={!item.link}
                  />
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground tabular-nums">
              {result.model
                ? t.meta(result.model, (result.durationMs / 1000).toFixed(1))
                : t.metaLink((result.durationMs / 1000).toFixed(1))}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
