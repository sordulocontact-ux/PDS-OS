"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FormDialog } from "@/components/ui/form-dialog";
import { routes } from "@/lib/auth/redirects";
import { createDesignSheet } from "@/lib/design/actions/sheets";
import { fr } from "@/lib/i18n/fr";

type Kind = "single" | "series";

/**
 * « Créer la fiche » of one deliverable (chef de projet): a single sheet, or
 * a series with as many numbered items as the Stratégie planned — a
 * proposal the person changes, never a fixed count. Opens the new sheet.
 */
export function CreateSheetButton({
  projectId,
  deliverableId,
  title,
  planned,
}: {
  projectId: string;
  deliverableId: string;
  title: string;
  // The quantity the Stratégie committed to, if more than one.
  planned: number | null;
}) {
  const t = fr.conceptionSheet.create;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="relative z-10"
        onClick={() => setOpen(true)}
      >
        {t.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.title(title)}
        description={t.description}
        closeLabel={t.close}
      >
        <CreateSheetForm
          projectId={projectId}
          deliverableId={deliverableId}
          planned={planned}
          onCancel={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function CreateSheetForm({
  projectId,
  deliverableId,
  planned,
  onCancel,
}: {
  projectId: string;
  deliverableId: string;
  planned: number | null;
  onCancel: () => void;
}) {
  const t = fr.conceptionSheet.create;
  const id = useId();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>(planned ? "series" : "single");
  const [count, setCount] = useState(String(planned ?? 2));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDesignSheet(
        projectId,
        deliverableId,
        kind,
        kind === "series" ? Number(count) : 1,
      );
      if (!result.ok) return setError(result.error);
      toast.success(t.created);
      if (result.sheetId)
        router.push(routes.projectDesignSheet(projectId, result.sheetId));
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <ChoiceCards
        name="kind"
        legend={t.kindLegend}
        value={kind}
        onChange={setKind}
        choices={(["single", "series"] as const).map((value) => ({
          value,
          label: t.kinds[value],
          hint: t.kindHints[value],
        }))}
      />
      {kind === "series" && (
        <Field
          id={`${id}-count`}
          name="count"
          type="number"
          inputMode="numeric"
          min={1}
          max={200}
          required
          label={t.countLabel}
          hint={t.countHint(planned)}
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.submitting : t.submit}
        </Button>
      </div>
    </form>
  );
}
