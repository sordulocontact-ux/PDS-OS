"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { strategyFollowUp } from "@/lib/i18n/fr/strategy-follow-up";
import { noteKpiMeasure } from "@/lib/strategy/actions/follow-up";

const fr = { strategyFollowUp };

/**
 * « Noter une valeur »: the value really read for a quantitative KPI, with
 * its date and where it was read, typed by the owner — never estimated by
 * PO. The follow-up compares the latest one to the target.
 */
export function NoteKpiButton({
  projectId,
  objectiveId,
  label,
  unit,
  today,
}: {
  projectId: string;
  objectiveId: string;
  label: string;
  unit: string | null;
  // "YYYY-MM-DD": a measure is never in the future.
  today: string;
}) {
  const t = fr.strategyFollowUp.kpis;
  const [open, setOpen] = useState(false);
  const { pending, run } = useFramingAction();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(today);
  const [source, setSource] = useState("");
  const id = (field: string) => `kpi-${objectiveId}-${field}`;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t.note}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.noteTitle(label)}
        description={t.noteBody}
        closeLabel={t.close}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                noteKpiMeasure({
                  projectId,
                  objectiveId,
                  value,
                  measuredOn: date,
                  source,
                }),
              () => {
                setOpen(false);
                setValue("");
                toast.success(t.saved);
              },
            );
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("value")} required>
              {t.value}
              {unit ? ` (${unit})` : ""}
            </Label>
            <Input
              id={id("value")}
              inputMode="decimal"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="tabular-nums"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("date")} required>
              {t.date}
            </Label>
            <Input
              id={id("date")}
              type="date"
              required
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-fit"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("source")}>{t.source}</Label>
            <Input
              id={id("source")}
              maxLength={200}
              value={source}
              placeholder={t.sourcePlaceholder}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={pending || value.trim() === ""}
            >
              {pending ? t.saving : t.save}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
