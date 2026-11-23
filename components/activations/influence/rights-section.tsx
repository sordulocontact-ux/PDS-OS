import { ActivationSection } from "@/components/activations/activation-section";
import { StepSection } from "@/components/shell/journey/step-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
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
    <ActivationSection id="rights" title={t.title} description={t.description}>
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
            <StepSection
              key={kind}
              title={t.kinds[kind]}
              aside={
                <StatusBadge size="sm" tone={tone[state]}>
                  {t.statuses[state]}
                </StatusBadge>
              }
              className="[&:not(:first-child)]:mt-0"
            >
              {current ? (
                <FactRows>
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
                      <FactRow key={label} label={label} value={value} />
                    ))}
                </FactRows>
              ) : (
                <p className="text-body-sm text-muted-foreground">
                  {t.kindHints[kind]}
                </p>
              )}
              {kind === "ads" && state !== "accepted" && (
                <p className="text-body-sm text-[color:var(--tone-danger-fg)]">
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
            </StepSection>
          );
        })}
      </div>
    </ActivationSection>
  );
}
