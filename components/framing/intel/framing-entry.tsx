import Link from "next/link";
import { IconCheck } from "nucleo-sharp-essential";

import { SubmitButton } from "@/components/auth/submit-button";
import { CallPrepForm } from "@/components/calls/prep/call-prep-form";
import { CallPrepLauncher } from "@/components/calls/prep/call-prep-launcher";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
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
 * ways in — an exchange prepared from what is missing (first: the Cadrage
 * is mostly done in meetings), or straight with PO.
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
  callSheet: CallPrepDefaults | null;
}) {
  const t = fr.framingIntel;
  const { counts } = assessment;
  // Most of it unknown: a conversation gathers it faster than PO's reading.
  const exchangeFirst = counts.missing > counts.known + counts.to_confirm;
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
            <>
              {/* In a card, preparing an exchange is the main action
                  (Sacha, 14/10/2026). */}
              {callSheet && (
                <CallPrepLauncher
                  label={t.entry.prepare}
                  title={t.call.title}
                  variant="default"
                >
                  <CallPrepForm defaults={callSheet} />
                </CallPrepLauncher>
              )}
              <Link
                href={routes.projectFraming(projectId)}
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                {t.entry.resume}
              </Link>
            </>
          ) : (
            // Two ways in, each said with what it does (PROJ-UX-02), the
            // recommended one first — decided by code from what is missing.
            // The exchange stays the primary button either way (Sacha,
            // 14/10/2026).
            <ul className="grid w-full gap-3 md:grid-cols-2">
              {(exchangeFirst
                ? (["exchange", "direct"] as const)
                : (["direct", "exchange"] as const)
              ).map((way, index) => (
                <li
                  key={way}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-4"
                >
                  <div className="flex flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-body-md font-semibold">
                      {t.entry.ways[way].title}
                      {index === 0 && (
                        <StatusBadge tone="info" size="sm">
                          {t.entry.recommended}
                        </StatusBadge>
                      )}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {t.entry.ways[way].body}
                    </span>
                    {index === 0 && (
                      <span className="text-caption">
                        {exchangeFirst
                          ? t.entry.why.exchange(counts.missing)
                          : t.entry.why.direct(
                              counts.known + counts.to_confirm,
                            )}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto">
                    {way === "exchange" ? (
                      callSheet && (
                        <CallPrepLauncher
                          label={t.entry.prepare}
                          title={t.call.title}
                          body={t.call.body}
                          mode="sheet"
                          variant="default"
                        >
                          <CallPrepForm defaults={callSheet} />
                        </CallPrepLauncher>
                      )
                    ) : (
                      <form action={startFramingWithPo.bind(null, projectId)}>
                        <SubmitButton
                          pendingLabel={t.entry.starting}
                          variant="outline"
                        >
                          {t.entry.start}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
