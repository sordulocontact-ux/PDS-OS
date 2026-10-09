"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/lib/i18n/fr";
import { sendStrategyDocument } from "@/lib/strategy/actions/workflow";

/**
 * « Demander la validation »: the director always validates; the owner may
 * add the project's creative directors. Their answers are required too.
 */
export function SendForValidation({
  projectId,
  documentId,
  directorName,
  creatives,
  disabled,
  description,
}: {
  projectId: string;
  documentId: string;
  directorName: string | null;
  creatives: Array<{ personId: string; name: string }>;
  disabled?: boolean;
  // What sending means for this document (the Brief holds the others back).
  description?: string;
}) {
  const t = fr.strategyDocs;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" disabled={disabled} onClick={() => setOpen(true)}>
        {t.brief.requestValidation}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.brief.requestValidation}
        description={description ?? t.validation.noFinalDuringWait}
        closeLabel={fr.strategyFlow.calendar.close}
      >
        <SendForm
          projectId={projectId}
          documentId={documentId}
          directorName={directorName}
          creatives={creatives}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function SendForm({
  projectId,
  documentId,
  directorName,
  creatives,
  onDone,
}: {
  projectId: string;
  documentId: string;
  directorName: string | null;
  creatives: Array<{ personId: string; name: string }>;
  onDone: () => void;
}) {
  const t = fr.strategyDocs;
  const { pending, run } = useFramingAction();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const toggle = (id: string) =>
    setChosen((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        run(
          () =>
            sendStrategyDocument({
              projectId,
              documentId,
              reviewers: [...chosen],
              note,
            }),
          onDone,
        );
      }}
    >
      <div className="flex flex-col gap-2">
        <p className="text-caption text-muted-foreground">{t.validation.who}</p>
        <p className="text-body-md font-semibold">
          {directorName ?? "—"}{" "}
          <span className="font-medium text-muted-foreground">
            · {t.validation.director}
          </span>
        </p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-caption text-muted-foreground">
          {t.validation.addReviewers}
        </legend>
        {creatives.length === 0 ? (
          <p className="text-body-md text-muted-foreground">
            {t.validation.noCreatives}
          </p>
        ) : (
          creatives.map((c) => (
            <label
              key={c.personId}
              className="flex items-center gap-3 text-body-md"
            >
              <input
                type="checkbox"
                className="size-4 accent-selection"
                checked={chosen.has(c.personId)}
                onChange={() => toggle(c.personId)}
              />
              {c.name}
            </label>
          ))
        )}
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="send-note">{t.validation.note}</Label>
        <Textarea
          id="send-note"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? t.brief.sending : t.brief.requestValidation}
        </Button>
      </div>
    </form>
  );
}
