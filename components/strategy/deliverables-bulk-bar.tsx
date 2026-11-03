"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { labelClass } from "@/components/ui/option-class";
import { strategyDeliverables } from "@/lib/i18n/fr/strategy-deliverables";
import { updateDeliverables } from "@/lib/strategy/actions/deliverables";

const fr = { strategyDeliverables };

const KEEP = "keep";

/** The same responsible or deadline for the ticked deliverables
 * (MKT-S1-08); an untouched field stays as it is on each. */
export function DeliverablesBulkBar({
  projectId,
  ids,
  people,
  onDone,
}: {
  projectId: string;
  ids: string[];
  people: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.strategyDeliverables;
  const { pending, run } = useFramingAction();
  const [assignee, setAssignee] = useState(KEEP);
  const [due, setDue] = useState("");
  if (ids.length === 0) return null;
  return (
    <div
      role="region"
      aria-label={t.bulk.selected(ids.length)}
      className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-soft)] p-4"
    >
      <span className="text-sm font-medium">{t.bulk.selected(ids.length)}</span>
      <div className="flex flex-col gap-1">
        <Label htmlFor="bulk-assignee" className={labelClass}>
          {t.lots.assignee}
        </Label>
        <OptionSelect
          id="bulk-assignee"
          label={t.lots.assignee}
          options={{ [KEEP]: "—", ...people }}
          value={assignee}
          onChange={setAssignee}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="bulk-due" className={labelClass}>
          {t.lots.dueDate}
        </Label>
        <Input
          id="bulk-due"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="w-fit"
        />
      </div>
      <Button
        size="sm"
        disabled={pending || (assignee === KEEP && !due)}
        onClick={() =>
          run(
            () =>
              updateDeliverables(projectId, {
                ids,
                assigneePersonId: assignee === KEEP ? "" : assignee,
                dueDate: due,
              }),
            () => {
              toast.success(t.bulk.applied);
              onDone();
            },
          )
        }
      >
        {t.bulk.apply}
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}>
        {t.bulk.clear}
      </Button>
    </div>
  );
}
