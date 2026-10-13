"use client";

import { ReasonForm } from "@/components/ui/reason-form";
import { reopenDesign } from "@/lib/design/actions/closure";
import type { HandoffItem } from "@/lib/design/handoff-plan";
import { fr } from "@/lib/i18n/fr";

/**
 * « Rouvrir la Conception » (the direction, MKT-C2-13): what is already in
 * Production first — it stays — then the reason, required.
 */
export function ReopenDesignForm({
  projectId,
  handed,
  onDone,
}: {
  projectId: string;
  handed: HandoffItem[];
  onDone: () => void;
}) {
  const t = fr.conceptionClosure;
  return (
    <div className="flex flex-col gap-4">
      {handed.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-body-md font-semibold">{t.reopenImpact}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md">
            {handed.map((i) => (
              <li key={i.deliverableId}>
                {t.impactLine(i.title, i.version ?? 0, false)}
              </li>
            ))}
          </ul>
        </section>
      )}
      <ReasonForm
        label={t.reopenReason}
        submitLabel={t.reopenSubmit}
        doneMessage={t.reopened}
        run={(reason) => reopenDesign(projectId, reason)}
        onDone={onDone}
      />
    </div>
  );
}
