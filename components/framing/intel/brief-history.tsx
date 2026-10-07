import { StatusBadge } from "@/components/ui/status-badge";
import { briefChanges, snapshotOf } from "@/lib/framing/brief-snapshot";
import type { Dimension } from "@/lib/framing/dimensions";
import type { BriefVersion } from "@/lib/framing/knowledge";
import { fr } from "@/lib/i18n/fr";
import { briefVersionTone } from "@/lib/ui/state-tones";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/**
 * Every version of the Brief, newest first: who made it, who decided, the
 * validator's request and what it reopened, and what changed from the
 * version before (compared item by item, lib/framing/brief-snapshot.ts).
 */
export function BriefHistory({ versions }: { versions: BriefVersion[] }) {
  const t = fr.framingIntel;
  if (versions.length === 0) return null;
  return (
    <section aria-labelledby="brief-history" className="flex flex-col gap-4">
      <h3 id="brief-history" className="text-display-sm font-semibold">
        {t.brief.history}
      </h3>
      <ol className="flex flex-col gap-3">
        {versions.map((version, index) => {
          const previous = versions[index + 1];
          const now = snapshotOf(version.content);
          const before = previous ? snapshotOf(previous.content) : null;
          const changes = now && before ? briefChanges(before, now) : [];
          return (
            <li
              key={version.id}
              className="flex flex-col gap-3 rounded-2xl border border-border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-md font-semibold">
                  {t.brief.version(version.version)}
                </span>
                <StatusBadge
                  tone={briefVersionTone[version.state] ?? "neutral"}
                  size="sm"
                >
                  {(t.brief.states as Record<string, string>)[version.state] ??
                    version.state}
                </StatusBadge>
              </div>
              <p className="text-caption text-muted-foreground">
                {t.brief.created(
                  version.createdByName,
                  dateFormat.format(new Date(version.created_at)),
                )}
                {version.decided_at &&
                  ` · ${t.brief.decided(version.decidedByName, dateFormat.format(new Date(version.decided_at)))}`}
              </p>
              {version.change_comment && (
                <div className="flex flex-col gap-1">
                  <p className="text-caption text-muted-foreground">
                    {t.brief.validatorComment}
                  </p>
                  <p className="text-body-md break-words whitespace-pre-line">
                    {version.change_comment}
                  </p>
                  {version.reopened_dimensions && (
                    <p className="text-caption text-muted-foreground">
                      {t.brief.reopened(
                        version.reopened_dimensions
                          .map((d) => t.dimensions[d as Dimension])
                          .join(", "),
                      )}
                    </p>
                  )}
                </div>
              )}
              {previous && (
                <div className="flex flex-col gap-2">
                  <p className="text-caption text-muted-foreground">
                    {t.brief.changesFrom(previous.version)}
                  </p>
                  {changes.length === 0 ? (
                    <p className="text-body-md text-muted-foreground">
                      {t.brief.noChange}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {changes.map((change) => (
                        <li
                          key={`${change.dimension}-${change.label}`}
                          className="grid gap-1 text-body-md"
                        >
                          <span className="font-semibold">
                            {t.dimensions[change.dimension]} · {change.label}
                          </span>
                          <span className="text-muted-foreground line-through decoration-1">
                            {change.before}
                          </span>
                          <span>{change.after}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
