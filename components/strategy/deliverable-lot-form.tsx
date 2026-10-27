"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { labelClass } from "@/components/ui/option-class";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { strategy } from "@/lib/i18n/fr/strategy";
import { strategyDeliverables } from "@/lib/i18n/fr/strategy-deliverables";
import { addDeliverableLot } from "@/lib/strategy/actions/deliverables";
import type { LotItem } from "@/lib/strategy/deliverable-lots";
import { toast } from "sonner";

const fr = { dialogs, strategy, strategyDeliverables };

const NONE = "none";

/**
 * « Proposer un lot » (MKT-S1-08): the deliverables a lever usually needs,
 * proposed by code, to tick and adjust, then created at once with a common
 * responsible and deadline.
 */
export function DeliverableLotForm({
  projectId,
  leverId,
  lot,
  people,
  onDone,
}: {
  projectId: string;
  leverId: string;
  lot: LotItem[];
  people: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.strategyDeliverables.lots;
  const { pending, run } = useFramingAction();
  const [rows, setRows] = useState(
    lot.map((item) => ({ ...item, quantity: String(item.quantity), on: true })),
  );
  const [assignee, setAssignee] = useState(NONE);
  const [due, setDue] = useState("");
  const chosen = rows.filter((r) => r.on && r.title.trim());

  if (lot.length === 0) return <p className="text-sm">{t.none}</p>;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosen.length === 0) return;
        run(
          () =>
            addDeliverableLot(projectId, {
              leverId,
              items: chosen.map((r) => ({
                title: r.title,
                quantity: r.quantity,
              })),
              assigneePersonId: assignee === NONE ? "" : assignee,
              dueDate: due,
            }),
          () => {
            toast.success(t.created(chosen.length));
            onDone();
          },
        );
      }}
    >
      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <li key={row.title} className="flex items-center gap-3">
            <Checkbox
              checked={row.on}
              aria-label={row.title}
              onChange={() =>
                setRows((all) =>
                  all.map((r, i) => (i === index ? { ...r, on: !r.on } : r)),
                )
              }
            />
            <span className="min-w-0 flex-1 text-sm">{row.title}</span>
            <Input
              aria-label={`${t.quantity} · ${row.title}`}
              inputMode="numeric"
              maxLength={2}
              value={row.quantity}
              onChange={(e) =>
                setRows((all) =>
                  all.map((r, i) =>
                    i === index ? { ...r, quantity: e.target.value } : r,
                  ),
                )
              }
              className="w-16 tabular-nums"
            />
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="lot-assignee" className={labelClass}>
            {t.assignee}
          </Label>
          <OptionSelect
            id="lot-assignee"
            label={t.assignee}
            options={{ [NONE]: fr.strategy.deliverables.noAssignee, ...people }}
            value={assignee}
            onChange={setAssignee}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lot-due" className={labelClass}>
            {t.dueDate}
          </Label>
          <Input
            id="lot-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-fit"
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="lg" onClick={onDone}>
          {fr.dialogs.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending || chosen.length === 0}
        >
          {pending ? fr.dialogs.saving : t.create(chosen.length)}
        </Button>
      </div>
    </form>
  );
}
