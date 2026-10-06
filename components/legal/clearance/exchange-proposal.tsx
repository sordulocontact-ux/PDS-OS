"use client";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  advanceClearance,
  addRightsholder,
} from "@/lib/legal/clearance/actions";
import type { MessageProposal } from "@/lib/legal/clearance/interpret";
import { formatFee } from "@/lib/legal/contracts/fields";
import { proposeTerms } from "@/lib/legal/clearance/terms-actions";

import { useLegalAction } from "@/components/legal/use-legal-action";

/** « Ce que PO propose » from a free message: each piece applied on its own
 * click, through the same checked functions as by hand. */
export function ExchangeProposal({
  projectId,
  clearanceId,
  proposal,
  communicationId,
}: {
  projectId: string;
  clearanceId: string;
  proposal: MessageProposal;
  communicationId: string | null;
}) {
  const t = fr.legalClearance;
  const { pending, run } = useLegalAction();
  const empty =
    !proposal.status && proposal.holders.length === 0 && !proposal.terms;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <p className="font-medium">
        {t.exchanges.proposalTitle} ·{" "}
        {t.exchanges.events[proposal.event] ?? proposal.event}
      </p>
      {empty && (
        <p className="text-sm text-muted-foreground">
          {t.exchanges.proposalEmpty}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {proposal.holders.map((h) => (
          <Button
            key={`${h.name}-${h.right}`}
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() =>
                addRightsholder({
                  projectId,
                  clearanceId,
                  right: h.right,
                  name: h.name,
                  role: h.role,
                }),
              )
            }
          >
            {t.exchanges.addRightsholder(h.name)}
          </Button>
        ))}
        {proposal.terms && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() =>
                proposeTerms({
                  projectId,
                  clearanceId,
                  communicationId,
                  terms: {
                    right: null,
                    amountCents: proposal.terms?.amountCents ?? null,
                    share: proposal.terms?.share ?? "",
                    credits: proposal.terms?.credits ?? "",
                    territory: proposal.terms?.territory ?? "",
                    duration: proposal.terms?.duration ?? "",
                    other: "",
                  },
                }),
              )
            }
          >
            {t.exchanges.addTerms}
            {proposal.terms.amountCents !== null &&
              ` · ${formatFee(proposal.terms.amountCents)}`}
          </Button>
        )}
        {proposal.status && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              run(() =>
                advanceClearance({
                  projectId,
                  clearanceId,
                  status: proposal.status!,
                  note:
                    proposal.status === "refused"
                      ? t.exchanges.events.refusal
                      : "",
                }),
              )
            }
          >
            {t.exchanges.suggestedStatus(t.statuses[proposal.status])}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {t.exchanges.proposalNotice}
      </p>
    </div>
  );
}
