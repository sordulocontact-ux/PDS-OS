import type { Member } from "@/lib/framing/related";
import { productionNeeds } from "@/lib/i18n/fr/production-needs";
import type { NetworkOption, ProductionNeed } from "@/lib/production/sheet";

import { AssignmentItem } from "./assignment-item";
import { NeedActions } from "./need-actions";
import { needLabel } from "./need-label";

const fr = { productionNeeds };

const t = fr.productionNeeds;

// The soft row of a position or of the director, inside the section's card.
export const needRowClass =
  "flex flex-col gap-3 rounded-lg bg-[var(--surface-soft)] p-4";

/** One position: its label, « n / N affectés » counted by code, the note,
 * who holds it; « Affecter » and « ⋯ » for the owner. */
export function NeedCard({
  projectId,
  sheetId,
  need,
  canOrganize,
  members,
  contacts,
}: {
  projectId: string;
  sheetId: string;
  need: ProductionNeed;
  canOrganize: boolean;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const label = needLabel(need);
  return (
    <li className={needRowClass}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">{label}</span>
          <span className="text-sm text-muted-foreground">
            {t.count(need.assignments.length, need.headcount)}
          </span>
        </div>
        {canOrganize && (
          <NeedActions
            projectId={projectId}
            sheetId={sheetId}
            need={need}
            members={members}
            contacts={contacts}
          />
        )}
      </div>
      {need.note && (
        <p className="text-sm text-muted-foreground">{need.note}</p>
      )}
      {need.assignments.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {need.assignments.map((assignment) => (
            <AssignmentItem
              key={assignment.id}
              projectId={projectId}
              assignment={assignment}
              needLabel={label}
              canOrganize={canOrganize}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.unassigned}</p>
      )}
    </li>
  );
}
