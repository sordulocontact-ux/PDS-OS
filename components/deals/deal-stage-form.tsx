"use client";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { setDealStage } from "@/lib/deals/actions";
import { MOVABLE_DEAL_STAGES, type Deal } from "@/lib/deals/types";
import { deals } from "@/lib/i18n/fr/deals";

const fr = { deals };

/** The stages a deal may move to from where it is (the database decides
 * again): any open one but its own; contracting after a validated
 * agreement; signed from contracting. */
function reachable(deal: Deal) {
  return MOVABLE_DEAL_STAGES.filter((stage) => {
    if (stage === deal.stage) return false;
    if (stage === "contracting") return deal.agreementStatus === "validated";
    if (stage === "signed") return deal.stage === "contracting";
    return true;
  });
}

/** « Changer d'étape » of a deal, with why (BIZ 4). */
export function DealStageForm({
  deal,
  onDone,
}: {
  deal: Deal;
  onDone: () => void;
}) {
  const t = fr.deals.page;
  const { pending, error, run } = useWriteSubmit(onDone, "");
  const stages = reachable(deal);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(() =>
          setDealStage(
            deal.id,
            String(data.get("stage") ?? ""),
            String(data.get("note") ?? ""),
          ),
        );
      }}
    >
      <OptionSelect
        id={`deal-${deal.id}-stage`}
        name="stage"
        label={t.stage}
        required
        items={Object.fromEntries(stages.map((s) => [s, fr.deals.stages[s]]))}
        defaultValue={stages[0] ?? null}
      />
      <TextareaField
        id={`deal-${deal.id}-note`}
        name="note"
        label={t.note}
        rows={3}
        maxLength={2000}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.stageSubmit}
        onCancel={onDone}
      />
    </form>
  );
}
