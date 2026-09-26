import type { CheckReleaseResult } from "@/lib/release/action-types";
import { CheckButton } from "@/components/release/check-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { onlineTone } from "@/lib/ui/state-tones";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { fr } from "@/lib/i18n/fr";
import { formatDate, formatDateTime } from "@/lib/release/format";
import type { Platform } from "@/lib/release/platforms";
import type { ReleaseLinkRow, ReleaseRow } from "@/lib/release/queries";

const t = fr.release.detection;

type Props = {
  release: ReleaseRow;
  links: ReleaseLinkRow[];
  checkAction: () => Promise<CheckReleaseResult>;
};

/** Detection status: facts from the database, the platform count from code. */
export function DetectionCard({ release, links, checkAction }: Props) {
  const online = release.online_detected_at !== null;
  const platformCount = new Set(links.map((link) => link.platform)).size;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.hint}</CardDescription>
        <CardAction>
          <StatusBadge tone={onlineTone(online)}>
            {online ? t.online : t.offline}
          </StatusBadge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-6">
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{t.onlineSince}</dt>
            <dd className="font-medium">
              {release.online_detected_at
                ? formatDateTime(release.online_detected_at)
                : "—"}
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{t.lastCheck}</dt>
            <dd className="font-medium">
              {release.last_checked_at
                ? formatDateTime(release.last_checked_at)
                : t.never}
            </dd>
          </div>
          <div className="grid gap-0.5">
            <dt className="text-muted-foreground">{t.links}</dt>
            <dd className="font-medium">{t.platformCount(platformCount)}</dd>
          </div>
        </dl>

        {links.length > 0 ? (
          <ul className="divide-y rounded-lg border text-sm">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2.5"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline-offset-4 hover:underline focus-visible:underline"
                >
                  {fr.release.platforms[link.platform as Platform] ??
                    link.platform}
                </a>
                <span className="text-xs text-muted-foreground">
                  {t.via}{" "}
                  {t.sources[link.source as keyof typeof t.sources] ??
                    link.source}{" "}
                  · {t.firstSeen} {formatDate(link.first_seen_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t.noLinks}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <CheckButton action={checkAction} disabled={!release.isrc} />
          {!release.isrc && (
            <p className="text-sm text-muted-foreground">{t.needsIsrc}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
