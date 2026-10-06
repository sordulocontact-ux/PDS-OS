import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";

import { SubmitButton } from "@/components/auth/submit-button";
import {
  FramingCallSheet,
  type CallSheetData,
} from "@/components/framing/intel/framing-call-sheet";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { startFramingWithPo } from "@/lib/framing/actions/start";
import type { FramingAssessment } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { factTone } from "@/lib/ui/state-tones";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

/**
 * The entry of the Cadrage on the project's overview (ticket § 1): the
 * acceptance, what PO found already known, the next attention, and the two
 * ways in — straight with PO, or an exchange prepared from what is missing.
 */
export function FramingEntry({
  projectId,
  assessment,
  acceptedAt,
  ownerName,
  started,
  canEdit,
  callSheet,
}: {
  projectId: string;
  assessment: FramingAssessment;
  acceptedAt: string | null;
  ownerName: string | null;
  // The Cadrage has begun: « Reprendre » instead of « Commencer ».
  started: boolean;
  canEdit: boolean;
  callSheet: CallSheetData;
}) {
  const t = fr.framingIntel;
  const { counts } = assessment;
  return (
    <section
      aria-labelledby="framing-entry-title"
      className="flex flex-col gap-6 rounded-3xl border border-border bg-background p-5 md:p-8"
    >
      {acceptedAt && (
        <p className="flex items-center gap-2 text-caption text-muted-foreground">
          <IconCheck
            aria-hidden
            className="size-4 text-[color:var(--tone-success-fg)]"
          />
          {t.entry.accepted(dateFormat.format(new Date(acceptedAt)), ownerName)}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h2 id="framing-entry-title" className="text-display-sm font-semibold">
          {t.entry.nextAttention}
        </h2>
        <p className="max-w-prose text-body-md text-muted-foreground">
          {canEdit ? t.entry.nextAttentionBody : t.entry.readOnly}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-body-md font-semibold">{t.entry.analysisTitle}</p>
        <p className="text-caption text-muted-foreground tabular-nums">
          {t.entry.analysis(counts.known, counts.to_confirm, counts.missing)}
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {assessment.dimensions.map((d, index) => (
            <li
              key={d.dimension}
              className="flex flex-col gap-1 rounded-2xl bg-[var(--surface-tint)] px-4 py-3"
            >
              <span className="text-body-md font-semibold">
                {t.dimensionNumber(index)} {t.dimensions[d.dimension]}
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={factTone[d.status]} size="sm">
                  {t.statuses[d.status]}
                </StatusBadge>
                <span className="text-caption text-muted-foreground">
                  {t.dimensionLine(
                    d.counts.known,
                    d.counts.to_confirm,
                    d.counts.missing,
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {started ? (
            <Link
              href={routes.projectFraming(projectId)}
              className={buttonVariants({ size: "lg" })}
            >
              {t.entry.resume}
            </Link>
          ) : (
            <form action={startFramingWithPo.bind(null, projectId)}>
              <SubmitButton pendingLabel={t.entry.starting}>
                {t.entry.start}
              </SubmitButton>
            </form>
          )}
          <FramingCallSheet projectId={projectId} data={callSheet} />
        </div>
      )}
    </section>
  );
}
