"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import { delegateLegalPlanItem } from "@/lib/legal/tracking/actions";

const NONE = "none";

/** « Changer »: hand a démarche to someone else or move its due date, with
 * its reason (« Pourquoi * »), kept in the plan's journal; the person who
 * takes it over is told (Juridique 07, proto « Projet complet »). */
export function DelegateButton({
  projectId,
  itemId,
  label,
  responsibleId,
  dueOn,
  people,
  triggerLabel,
}: {
  projectId: string;
  itemId: string;
  label: string;
  responsibleId: string | null;
  dueOn: string | null;
  people: Array<{ personId: string; name: string }>;
  // « Modifier » in the plan's list, « Changer » in the démarche.
  triggerLabel?: string;
}) {
  const router = useRouter();
  const t = fr.legal.tracking;
  const p = fr.legal.plan;
  const [open, setOpen] = useState(false);
  const [responsible, setResponsible] = useState(responsibleId);
  const [due, setDue] = useState(dueOn);
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const missing = reason.trim() === "";

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (missing) {
      document.getElementById(`delegate-why-${itemId}`)?.focus();
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await delegateLegalPlanItem({
        projectId,
        itemId,
        responsibleId: responsible,
        dueOn: due,
        reason,
      });
      if (!result.ok) return setError(result.error);
      toast.success(t.delegated);
      setOpen(false);
      setReason("");
      setTried(false);
      router.refresh();
    });
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="xs"
        aria-label={`${triggerLabel ?? t.delegate} · ${label}`}
        onClick={() => setOpen(true)}
      >
        {triggerLabel ?? t.delegate}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.delegateTitle}
        description={t.delegateDescription}
        closeLabel={fr.masterPage.form.close}
      >
        <form className="flex flex-col gap-5" onSubmit={save} noValidate>
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
            label={p.due}
            defaultValue={dueOn ?? ""}
            onChange={(event) => setDue(event.target.value || null)}
          />
          <TextareaField
            id={`delegate-why-${itemId}`}
            name="reason"
            label={t.delegateWhy}
            required
            rows={2}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            error={tried && missing ? t.delegateWhyMissing : undefined}
          />
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <DialogFormActions
            pending={pending}
            submitLabel={t.save}
            onCancel={() => setOpen(false)}
          />
        </form>
      </FormDialog>
    </>
  );
}
