"use client";

import { IconCheck, IconTriangleWarning } from "nucleo-sharp-essential";

import Link from "next/link";

import { CheckboxField } from "@/components/ui/checkbox-field";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { dateWarnings } from "@/lib/master-workflow/calendar";
import { transmissionExpiry } from "@/lib/master-workflow/link-expiry";
import type { StepView } from "@/lib/master-workflow/transmission";
import { masterStepHref } from "@/lib/ui/master-steps";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The review before a sending (PROJ-UX-09): who receives it, what is ready,
 * what is missing (stems: sent without only on purpose), the dates that
 * leave with it, and what the private link opens, for whom and how long.
 */
export function TransmitReview({
  view,
  withoutStems,
  onWithoutStems,
}: {
  view: StepView;
  withoutStems: boolean;
  onWithoutStems: (value: boolean) => void;
}) {
  const t = fr.masterWorkflow.mix.review;
  const p = fr.masterWorkflow.mix.package;
  const brief = view.brief;
  const dates = brief?.dates;
  const missingStems =
    view.role === "mix"
      ? view.titles.filter((title) => title.stems === 0).map((x) => x.title)
      : [];
  // Every date of the Brief leaves, each with its meaning (PROJ-BUG-07).
  const dated: Array<[string, string | null | undefined]> = [
    [p.mixV1Due, dates?.mixV1Due],
    [p.mixFinalDue, dates?.mixFinalDue],
    [p.masteringDue, dates?.masteringDue],
    [p.masterFinalDue, dates?.masterFinalDue],
    [p.releaseDue, view.releaseDue],
  ];
  const warnings = dates
    ? dateWarnings(dates, todayInParis(), view.releaseDue, view.role)
    : [];
  const fieldLabel = fr.masterWorkflow.brief.fields;
  const datesText = dated
    .filter(([, value]) => value)
    .map(([label, value]) => `${label} ${formatBriefDate(value!)}`)
    .join(" · ");
  const now = new Date();
  const expiry = transmissionExpiry(
    now,
    view.role === "mix"
      ? (dates?.mixFinalDue ?? null)
      : (dates?.masterFinalDue ?? dates?.masteringDue ?? null),
  );
  const days = Math.round((expiry.getTime() - now.getTime()) / DAY_MS);
  const ok = (text: string) => (
    <li className="flex items-start gap-2">
      <IconCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </li>
  );
  const warn = (text: string) => (
    <li className="flex items-start gap-2 text-[color:var(--tone-warning-fg)]">
      <IconTriangleWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{text}</span>
    </li>
  );

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby="transmit-review"
        className="flex flex-col gap-2"
      >
        <h3 id="transmit-review" className="text-sm font-medium">
          {t.title}
        </h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          {view.engineer &&
            ok(t.engineer(view.engineer.name, view.engineer.email))}
          {view.role === "mix"
            ? ok(t.sources(view.titles.length))
            : ok(t.finals(view.titles.length))}
          {view.role === "mix" &&
            (missingStems.length === 0
              ? ok(t.stemsOk)
              : warn(t.stemsMissing(missingStems)))}
          {datesText ? ok(t.dates(datesText)) : warn(t.noDates)}
          {warnings.map((w) =>
            warn(
              w.kind === "past"
                ? t.datePast(
                    fieldLabel[w.field],
                    formatBriefDate(dates![w.field]!),
                  )
                : t.dateAfterRelease(
                    fieldLabel[w.field],
                    formatBriefDate(view.releaseDue!),
                  ),
            ),
          )}
        </ul>
        {missingStems.length > 0 && (
          <CheckboxField
            label={t.withoutStems}
            hint={t.withoutStemsHint}
            checked={withoutStems}
            onChange={onWithoutStems}
          />
        )}
      </section>
      <section aria-labelledby="transmit-files" className="flex flex-col gap-2">
        <h3 id="transmit-files" className="text-sm font-medium">
          {t.files}
        </h3>
        <ul className="flex flex-col gap-3 text-sm">
          {view.titles.map((title) => (
            <li key={title.id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="min-w-0 break-words">
                  <span className="font-medium">{title.title}</span>
                  {title.source &&
                    ` · ${fr.catalog.audioStates[title.source.audioState]} · ${title.source.fileName}`}
                </span>
                <Link
                  href={masterStepHref(
                    view.projectId,
                    view.role === "mix" ? "source" : "mix",
                  )}
                  className="text-caption underline underline-offset-4"
                >
                  {t.change}
                </Link>
              </div>
              {view.sourceUrls[title.id] && (
                <audio
                  controls
                  preload="none"
                  src={view.sourceUrls[title.id]}
                  aria-label={t.listen(title.title)}
                  className="h-9 w-full"
                />
              )}
            </li>
          ))}
        </ul>
      </section>
      {view.role === "mastering" && view.engineer && (
        <p className="text-sm">
          {view.reusesMixLink ? t.sameLink(view.engineer.name) : t.otherLink}
        </p>
      )}
      {!view.reusesMixLink && (
        <section
          aria-labelledby="transmit-link"
          className="flex flex-col gap-1 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-sm"
        >
          <h3 id="transmit-link" className="font-medium">
            {t.linkTitle}
          </h3>
          <p>{t.linkScope}</p>
          <p>
            {t.linkExpiry(
              formatBriefDate(expiry.toISOString().slice(0, 10)),
              days,
            )}
          </p>
          <p className="text-muted-foreground">{t.linkPolicy}</p>
        </section>
      )}
    </div>
  );
}
