"use client";

import { DelegateForm } from "@/components/legal/tracking/delegate-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { usePickListDone } from "@/components/ui/pick-list-context";
import { legal } from "@/lib/i18n/fr/legal";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { formatDay } from "@/lib/utils/day";

const fr = { legal, legalDemarches };

type Owner = {
  projectId: string;
  itemId: string;
  label: string;
  responsibleId: string | null;
  responsibleName: string | null;
  dueOn: string | null;
  people: Array<{ personId: string; name: string }>;
};

/**
 * Who answers for a démarche and by when, as the Master shows a fact
 * (`FactRow change`): one row, « Changer » opens the delegation's form in
 * place under it (no modal), « Modifié par … » once someone changed it,
 * « Échéance dépassée » when it is late.
 */
export function DemarcheOwner({
  owner,
  changedBy,
  overdue,
}: {
  owner: Owner;
  // The last person who changed the responsible or the date (plan journal).
  changedBy: string | null;
  overdue: boolean;
}) {
  const t = fr.legalDemarches.launched;
  const value = [
    owner.responsibleName ?? fr.legal.plan.noResponsible,
    owner.dueOn ? t.due(formatDay(owner.dueOn)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <FactRows>
      <FactRow
        label={fr.legalDemarches.responsible}
        value={value}
        source={fr.legal.plan.title}
        changedBy={changedBy}
        state={overdue ? { tone: "danger", label: t.state.overdue } : null}
        change={
          owner.people.length > 0
            ? { list: <OwnerForm owner={owner} />, defaultOpen: false }
            : null
        }
      />
    </FactRows>
  );
}

/** The form under the row, closed by the row once saved or cancelled. */
function OwnerForm({ owner }: { owner: Owner }) {
  const close = usePickListDone();
  return (
    <div className="pt-2">
      <DelegateForm
        projectId={owner.projectId}
        itemId={owner.itemId}
        label={owner.label}
        responsibleId={owner.responsibleId}
        dueOn={owner.dueOn}
        people={owner.people}
        onDone={close}
      />
    </div>
  );
}
