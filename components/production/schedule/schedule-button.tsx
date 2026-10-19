"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { fr } from "@/lib/i18n/fr";
import { decideSchedule } from "@/lib/production/schedule/actions";
import {
  SCHEDULE_SOURCES,
  type ScheduleSource,
} from "@/lib/production/schedule/model";

const t = fr.productionSchedule;

/**
 * « Fixer / Changer la date et les horaires » (proto schedModal): the
 * date, the start and the end, where it was decided; « Valider la date et
 * les horaires ». The current decision is said first: the new one replaces
 * it, the previous one stays in the history. `defaults` (and `stay`):
 * opened prefilled.
 */
export function ScheduleButton({
  projectId,
  sheetId,
  current,
  defaults,
}: {
  projectId: string;
  sheetId: string;
  // The current decision, already said in words (« Tournage le … »).
  current: { text: string; by: string } | null;
  defaults: { date: string; start: string; end: string };
}) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [source, setSource] = useState<ScheduleSource>("meeting");
  const { pending, error, run } = useWriteSubmit(
    () => setOpen(false),
    current ? t.changed : t.decided,
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const v = (k: string) => String(data.get(k) ?? "").trim();
    const next: Record<string, string> = {};
    if (!v("date")) next.date = t.errors.date;
    if (!v("start")) next.start = t.errors.start;
    if (!v("end")) next.end = t.errors.end;
    else if (v("start") && v("end") <= v("start"))
      next.end = t.errors.end_before_start;
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    run(() =>
      decideSchedule({
        projectId,
        sheetId,
        date: v("date"),
        start: v("start"),
        end: v("end"),
        source,
        change: current !== null,
      }),
    );
  }
  const title = current ? t.change : t.open;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        {title}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={
          current ? t.today(current.text, current.by) : t.description
        }
        closeLabel={fr.dialogs.close}
      >
        <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
          <Field
            name="date"
            type="date"
            label={t.date}
            required
            defaultValue={defaults.date}
            error={errors.date}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="start"
              type="time"
              step={900}
              label={t.start}
              required
              defaultValue={defaults.start}
              error={errors.start}
            />
            <Field
              name="end"
              type="time"
              step={900}
              label={t.end}
              required
              defaultValue={defaults.end}
              error={errors.end}
            />
          </div>
          <OptionSelect
            name="source"
            label={t.source}
            items={Object.fromEntries(
              SCHEDULE_SOURCES.map((s) => [s, t.sources[s]]),
            )}
            defaultValue={source}
            onValueChange={(value) =>
              setSource(SCHEDULE_SOURCES.find((s) => s === value) ?? "other")
            }
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <DialogFormActions
            pending={pending}
            submitLabel={t.submit}
            onCancel={() => setOpen(false)}
          />
        </form>
      </FormDialog>
    </>
  );
}
