import { StepSection } from "@/components/shell/journey/step-section";
import {
  DeliverableVersion,
  DeliverableVersions,
} from "@/components/ui/deliverable-version";
import { productionLight } from "@/lib/i18n/fr/production-light";
import { productionProposal } from "@/lib/i18n/fr/production-proposal";
import type { LightVersion } from "@/lib/production/light/types";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortInstant } from "@/lib/utils/day";

const fr = { productionProposal, productionLight };

const t = fr.productionLight;
const TONE: Partial<Record<LightVersion["status"], Tone>> = {
  approved: "success",
  changes_requested: "warning",
  refused: "warning",
};

/**
 * The versions of a cover or of teasers, newest first (proto lightBody): the
 * latest and the validated one open as a `DeliverableVersion`, the others
 * fold; its state, who deposited it, « Ouvrir » on its file, the image with
 * what the code read of it (or the link), what the validation said.
 */
export function LightVersions({ versions }: { versions: LightVersion[] }) {
  if (versions.length === 0) return null;
  const latest = versions[0];
  return (
    <StepSection title={fr.productionProposal.versions}>
      <DeliverableVersions
        versions={versions}
        isCurrent={(v) => v.id === latest.id || v.status === "approved"}
        earlierTitle={fr.productionProposal.earlier}
        render={(v) => {
          const href = v.file?.href ?? v.url;
          return (
            <DeliverableVersion
              name={t.version(v.number)}
              line={t.deposited(
                v.depositedBy,
                formatShortInstant(v.depositedAt),
              )}
              statuses={[
                { tone: TONE[v.status] ?? "info", label: t.status[v.status] },
              ]}
              open={href ? { href, label: fr.productionProposal.open } : null}
            >
              {v.file?.mime.startsWith("image/") && v.file.href ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a signed, private file */}
                  <img
                    src={v.file.href}
                    alt={v.file.name}
                    className="aspect-square w-full max-w-72 rounded-lg border border-[color:var(--border-hairline)] object-cover"
                  />
                  <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                    {v.width && v.height
                      ? t.read(v.file.name, v.width, v.height)
                      : v.file.name}
                  </span>
                </>
              ) : v.file ? (
                <span className="break-all">{v.file.name}</span>
              ) : v.url ? (
                <span className="break-all">{v.url}</span>
              ) : null}
              {v.decisionNote && v.decidedBy && (
                <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                  {t.said(v.decidedBy, v.decisionNote)}
                </span>
              )}
            </DeliverableVersion>
          );
        }}
      />
    </StepSection>
  );
}
