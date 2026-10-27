"use client";

import { DecisionPanel } from "@/components/ui/decision-panel";
import { productionProposal } from "@/lib/i18n/fr/production-proposal";
import { decideProposal } from "@/lib/production/proposal/actions";
import { decideProposalByLink } from "@/lib/production/provider/proposal-link-actions";

const fr = { productionProposal };

const t = fr.productionProposal.decide;

/**
 * « Votre décision sur la Vn · validation créative interne / externe »
 * (proto): « Valider la Vn » or « Demander des modifications », the comment
 * required to ask (`DecisionPanel`). The internal side decides in the
 * step, the external one on its private link — in addition, never in its
 * place.
 */
export function ProposalDecision({
  side,
  versionId,
  number,
  projectId,
  token,
}: {
  side: "int" | "ext";
  versionId: string;
  number: number;
  projectId?: string;
  token?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-semibold">{t.title(number, t.slots[side])}</h3>
      <DecisionPanel
        id={`proposal-${versionId}`}
        title={null}
        commentLabel={t.comment}
        commentHint={t.commentHint}
        commentRequired={t.commentRequired}
        outcomes={[
          {
            kind: "approve",
            label: t.approve(number),
            done: `${t.approved(number)}.`,
          },
          { kind: "request_changes", label: t.changes, done: `${t.asked}.` },
        ]}
        onDecide={(kind, comment) => {
          const approve = kind === "approve";
          return token
            ? decideProposalByLink({ token, versionId, approve, comment })
            : decideProposal({
                projectId: projectId ?? "",
                versionId,
                number,
                approve,
                comment,
              });
        }}
      />
    </section>
  );
}
