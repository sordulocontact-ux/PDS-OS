import { buttonVariants } from "@/components/ui/button";
import { VersionCard } from "@/components/ui/version-card";
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
 * The versions of a cover or of teasers, newest first (proto lightBody):
 * each folds (`VersionCard`, the latest and the validated open), its state,
 * who deposited it, the image with what the code read of it (or the link),
 * what the validation said.
 */
export function LightVersions({ versions }: { versions: LightVersion[] }) {
  if (versions.length === 0) return null;
  const latest = versions[0];
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-semibold">{fr.productionProposal.versions}</h3>
      {versions.map((v) => (
        <VersionCard
          key={v.id}
          title={t.version(v.number)}
          status={{ tone: TONE[v.status] ?? "info", label: t.status[v.status] }}
          meta={t.deposited(v.depositedBy, formatShortInstant(v.depositedAt))}
          defaultOpen={v.id === latest.id || v.status === "approved"}
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
            <a
              href={v.file.href ?? undefined}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {v.file.name}
            </a>
          ) : v.url ? (
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit break-all underline underline-offset-4"
            >
              {v.url}
            </a>
          ) : null}
          {v.decisionNote && v.decidedBy && (
            <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
              {t.said(v.decidedBy, v.decisionNote)}
            </span>
          )}
        </VersionCard>
      ))}
    </div>
  );
}
