import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { DeezerAccount } from "@/lib/catalog/capture-artist-types";
import { formatFans } from "@/lib/catalog/types";
import { laboCaptures } from "@/lib/i18n/fr/labo-captures";
import { cn } from "@/lib/utils";

const fr = { laboCaptures };

/** One Deezer account: picture, name (link to its Deezer page), audience. */
export function DeezerAccountCard({
  account,
  compact = false,
}: {
  account: DeezerAccount;
  compact?: boolean;
}) {
  const t = fr.laboCaptures;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        name={account.name}
        pictureUrl={account.pictureUrl}
        className={compact ? "size-8" : "size-12"}
      />
      <div className="grid min-w-0 gap-0.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <a
            href={account.link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "font-semibold underline-offset-4 hover:underline",
              compact ? "text-sm" : "text-base",
            )}
          >
            {account.name}
            <span className="sr-only"> — {t.openDeezer}</span>
          </a>
          {account.existing && (
            <StatusBadge tone="info" size="sm">
              {t.inCatalog}
            </StatusBadge>
          )}
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {t.fans(formatFans(account.fans))} ·{" "}
          {t.releases(account.releaseCount)}
        </span>
      </div>
    </div>
  );
}
