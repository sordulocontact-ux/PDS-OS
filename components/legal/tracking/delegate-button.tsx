"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { delegateLegalPlanItem } from "@/lib/legal/tracking/actions";

const NONE = "none";

/** « Modifier »: hand an action to someone else or move its due date, an
 * explicit delegation kept in the plan's journal (Juridique 07). */
export function DelegateButton({
  projectId,
  itemId,
  label,
  responsibleId,
  dueOn,
  people,
}: {
  projectId: string;
  itemId: string;
  label: string;
  responsibleId: string | null;
  dueOn: string | null;
  people: Array<{ personId: string; name: string }>;
}) {
  const router = useRouter();
  const t = fr.legal.tracking;
  const p = fr.legal.plan;
  const [open, setOpen] = useState(false);
  const [responsible, setResponsible] = useState(responsibleId);
  const [due, setDue] = useState(dueOn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await delegateLegalPlanItem({
        projectId,
        itemId,
        responsibleId: responsible,
        dueOn: due,
      });
      if (!result.ok) return setError(result.error);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        aria-label={`${t.delegate} · ${label}`}
        onClick={() => setOpen(true)}
      >
        {t.delegate}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.delegateTitle}
        description={t.delegateDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <div className="flex flex-col gap-5">
          <p className="font-medium break-words">{label}</p>
          <OptionSelect
            name={`delegate-${itemId}`}
            label={p.responsible}
            items={{
              [NONE]: p.noResponsible,
              ...Object.fromEntries(people.map((x) => [x.personId, x.name])),
            }}
            defaultValue={responsibleId ?? NONE}
            onValueChange={(value) =>
              setResponsible(value === NONE ? null : value)
            }
          />
          <Field
            name={`delegate-due-${itemId}`}
            type="date"
            label={`${p.due} · ${p.optional}`}
            defaultValue={dueOn ?? ""}
            onChange={(event) => setDue(event.target.value || null)}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              {fr.legal.intake.cancel}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={save}
            >
              {pending ? t.saving : t.save}
            </Button>
          </div>
        </div>
      </FormDialog>
    </>
  );
}
