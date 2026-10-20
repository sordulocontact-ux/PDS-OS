"use client";

import { DecisionPanel } from "@/components/ui/decision-panel";
import { fr } from "@/lib/i18n/fr";
import { decideLightVersion } from "@/lib/production/light/actions";

const t = fr.productionCut.decide;

/**
 * « Votre retour sur le montage Vn » of an external production (proto
 * BODY.post), the internal creative validation: « Valider le montage Vn »
 * or « Demander des modifications », the feedback required to ask — the
 * company reads it on its link and deposits the next version.
 */
export function CutDecision({
  projectId,
  versionId,
  number,
}: {
  projectId: string;
  versionId: string;
  number: number;
}) {
  return (
    <section id="decision" className="flex flex-col gap-3">
      <h3 className="font-semibold">{t.title(number)}</h3>
      <DecisionPanel
        id={`cut-${versionId}`}
        title={null}
        commentLabel={t.comment}
        commentHint={t.hint}
        commentRequired={t.required}
        outcomes={[
          { kind: "approve", label: t.approve(number) },
          { kind: "request_changes", label: t.changes },
        ]}
        onDecide={(kind, note) =>
          decideLightVersion({
            projectId,
            versionId,
            number,
            approve: kind === "approve",
            note,
          })
        }
      />
    </section>
  );
}
