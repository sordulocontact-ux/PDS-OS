import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { formatLongDay } from "@/lib/project-history/format";
import type { ProjectValidation } from "@/lib/project-history/queries";
import { validationTone } from "@/lib/ui/state-tones";

// One validation request: stage and state, who asked and who decides, then
// the request note and the decision comment when there is one.
export function ValidationItem({
  validation: v,
}: {
  validation: ProjectValidation;
}) {
  const t = fr.projectHistory.validations;
  const person = (name: string) => name || t.unknownPerson;

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid min-w-0 gap-1">
          <Link
            href={v.stageHref}
            className="text-body-md font-semibold underline-offset-4 hover:underline"
          >
            {v.stageLabel}
          </Link>
          <p className="text-sm text-muted-foreground">
            {[
              t.requestedBy(
                person(v.requestedByName),
                formatLongDay(v.requestedAt),
              ),
              t.validator(person(v.validatorName)),
              ...(v.decidedAt ? [t.decidedAt(formatLongDay(v.decidedAt))] : []),
            ].join(" · ")}
          </p>
        </div>
        <StatusBadge tone={validationTone[v.state] ?? "neutral"} size="sm">
          {t.states[v.state] ?? v.state}
        </StatusBadge>
      </div>
      {(v.requestNote || v.decisionComment) && (
        <dl className="grid gap-2 text-sm">
          {v.requestNote && (
            <div className="grid gap-0.5">
              <dt className="text-caption text-grey-400">{t.note}</dt>
              <dd className="break-words whitespace-pre-line">
                {v.requestNote}
              </dd>
            </div>
          )}
          {v.decisionComment && (
            <div className="grid gap-0.5">
              <dt className="text-caption text-grey-400">{t.comment}</dt>
              <dd className="break-words whitespace-pre-line">
                {v.decisionComment}
              </dd>
            </div>
          )}
        </dl>
      )}
    </li>
  );
}
