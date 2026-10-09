"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";
import { noteKpiActual } from "@/lib/strategy/actions/dimensions";

/**
 * « Noter »: the value really observed for a KPI, typed by the owner with
 * what was seen (never estimated by PO). It is what the follow-up compares.
 */
export function NoteKpiButton({
  projectId,
  kpi,
}: {
  projectId: string;
  kpi: {
    id: string;
    label: string;
    kind: string;
    unit: string | null;
    actual_value: number | null;
    actual_text: string | null;
  };
}) {
  const t = fr.strategyDocs.followUp;
  const [open, setOpen] = useState(false);
  const { pending, run } = useFramingAction();
  const [value, setValue] = useState(kpi.actual_value?.toString() ?? "");
  const [text, setText] = useState(kpi.actual_text ?? "");
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t.note}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.noteTitle(kpi.label)}
        description={t.noteBody}
        closeLabel={fr.strategyDocs.generator.close}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => noteKpiActual(projectId, kpi.id, { value, text }),
              () => setOpen(false),
            );
          }}
        >
          {kpi.kind === "quantitative" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`kpi-${kpi.id}-value`}>
                {t.actual}
                {kpi.unit ? ` (${kpi.unit})` : ""}
              </Label>
              <Input
                id={`kpi-${kpi.id}-value`}
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`kpi-${kpi.id}-text`}>{t.actualText}</Label>
            <Textarea
              id={`kpi-${kpi.id}-text`}
              value={text}
              maxLength={300}
              rows={3}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
            >
              {fr.framingIntel.guide.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={pending}>
              {pending
                ? fr.strategyDocs.generator.saving
                : fr.strategyDocs.generator.save}
            </Button>
          </div>
        </form>
      </FormDialog>
    </>
  );
}
