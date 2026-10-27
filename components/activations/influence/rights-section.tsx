import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import type { InfluenceData } from "@/lib/activations/influence/queries";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { formatDate } from "@/lib/release/format";

import { RightsButtons } from "./rights-buttons";

const fr = { activationInfluence };

const t = fr.activationInfluence.rights;
const tone = {
  proposed: "action",
  accepted: "success",
  refused: "neutral",
  revoked: "neutral",
  expired: "danger",
  none: "warning",
} as const;

/** Organic and advertising rights, two separate blocks : each accepted,
 * refused, dated and expired on its own ; replaced versions kept. */
export function RightsSection({
  projectId,
  activationId,
  targetId,
  rights,
  today,
  canWrite,
}: {
  projectId: string;
  activationId: string;
  targetId: string;
  rights: InfluenceData["rights"];
  today: string;
  canWrite: boolean;
}) {
  return (
    <PageSection id="rights" title={t.title} description={t.description}>
      <div className="grid gap-3 md:grid-cols-2">
        {(["organic", "ads"] as const).map((kind) => {
          const blocks = rights.filter((r) => r.kind === kind);
          const current = blocks.find((r) => !r.superseded_at) ?? null;
          const expired =
            current?.status === "accepted" &&
            current.ends_on !== null &&
            current.ends_on < today;
          const state = !current
            ? "none"
            : expired
              ? "expired"
              : (current.status as keyof typeof tone);
          return (
            <div
              key={kind}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{t.kinds[kind]}</h3>
                <StatusBadge size="sm" tone={tone[state]}>
                  {t.statuses[state]}
                </StatusBadge>
              </div>
              {current ? (
                <dl className="flex flex-col gap-1 text-sm">
                  {[
                    [t.platforms, current.platforms.join(", ")],
                    [t.supports, current.supports],
                    [t.territory, current.territory],
                    [
                      t.endsOn,
                      [
                        current.starts_on && formatDate(current.starts_on),
                        current.ends_on && formatDate(current.ends_on),
                      ]
                        .filter(Boolean)
                        .join(" → "),
                    ],
                    [
                      t.remuneration,
                      `${t.remunerations[current.remuneration as "included" | "additional"]}${current.remuneration_note ? ` · ${current.remuneration_note}` : ""}`,
                    ],
                    [t.restrictions, current.restrictions],
                    [t.decisionNote, current.decision_note],
                  ]
                    .filter((pair): pair is [string, string] =>
                      Boolean(pair[1]),
                    )
                    .map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <dt className="shrink-0 text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="break-words">{value}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.kindHints[kind]}
                </p>
              )}
              {kind === "ads" && state !== "accepted" && (
                <p className="text-sm text-[color:var(--tone-danger-fg)]">
                  {t.adsBlocked}
                </p>
              )}
              {canWrite && (
                <RightsButtons
                  projectId={projectId}
                  activationId={activationId}
                  targetId={targetId}
                  kind={kind}
                  current={current}
                />
              )}
              {blocks.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  {t.history} : {blocks.filter((b) => b.superseded_at).length}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}
