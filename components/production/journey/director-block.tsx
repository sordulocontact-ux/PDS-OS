import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { shortStamp } from "@/lib/calls/prep/dates";
import { fr } from "@/lib/i18n/fr";
import { loadDirectorProposals } from "@/lib/production/director-proposals";
import type { ProductionSheetData } from "@/lib/production/sheet";

import { RetainDirectorButton } from "./retain-director-button";

const t = fr.productionDirector;
const TONE = {
  proposed: "info",
  retained: "success",
  declined: "neutral",
} as const;

/**
 * « Réalisateur » of an external production (proto directorBlock): the
 * directors the company proposed on its link, « Retenir » for whoever
 * organises; once retained, who holds « Réalisation ». Waiting for the
 * company while it proposed nobody.
 */
export async function DirectorBlock({
  projectId,
  data,
}: {
  projectId: string;
  data: ProductionSheetData;
}) {
  const sheet = data.sheet;
  const org = sheet?.organization;
  if (!sheet || org?.kind !== "external" || !org.company) return null;
  const company = org.company.name;
  const list = await loadDirectorProposals(sheet.id);
  const retained = list.find((d) => d.status === "retained");
  return (
    <section
      id="director-proposals"
      aria-labelledby="director-title"
      className="flex flex-col gap-3"
    >
      <h3 id="director-title" className="font-semibold">
        {t.title}
      </h3>
      {retained ? (
        <ToneCallout tone="success">
          {t.retained(retained.name, company)}
        </ToneCallout>
      ) : list.length === 0 ? (
        !sheet.director && (
          <p className="rounded-xl bg-[var(--surface-soft)] px-3.5 py-3 text-[color:var(--text-secondary)]">
            {t.waiting(company)}
          </p>
        )
      ) : (
        <p className="text-[color:var(--text-secondary)]">{t.intro(company)}</p>
      )}
      {list.length > 0 && (
        <ul className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
          {list.map((d) => (
            <li
              key={d.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border-hairline)] px-4 py-3 last:border-b-0"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 break-words">
                <span>
                  <b className="font-semibold">{d.name}</b> ·{" "}
                  <a
                    href={d.reelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {d.reelUrl}
                  </a>
                </span>
                {d.note && <span>« {d.note} »</span>}
                <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                  {t.by(company, shortStamp(d.proposedAt))}
                </span>
              </span>
              {d.status === "proposed" && data.canOrganize && !retained ? (
                <RetainDirectorButton
                  projectId={projectId}
                  proposalId={d.id}
                  name={d.name}
                />
              ) : (
                <StatusBadge size="sm" tone={TONE[d.status]}>
                  {t.status[d.status]}
                </StatusBadge>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
