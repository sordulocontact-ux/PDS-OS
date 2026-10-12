"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { ActionResult } from "@/lib/framing/result";
import { fr } from "@/lib/i18n/fr";
import {
  requestBriefValidation,
  sendStrategyDocument,
} from "@/lib/strategy/actions/documents";

type Person = { personId: string; name: string };

/**
 * « Demander la validation » (ticket Stratégie § 9): the director always
 * validates; the owner may add the project's creative directors, whose
 * answers are then required too. `target`: the Brief de sortie (snapshotted
 * by the server on sending) or a version already written (any kind).
 */
export function SendForValidation({
  projectId,
  target,
  directorName,
  creatives,
  title,
  description,
  recap,
}: {
  projectId: string;
  target: { brief: true } | { documentId: string };
  directorName: string | null;
  creatives: Person[];
  // Dialog copy; defaults to the Brief de sortie's.
  title?: string;
  description?: string;
  // What is sent, said above the reviewers (MKT-S1-16).
  recap?: string;
}) {
  const t = fr.strategyDocuments;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        {t.request.open}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={title ?? t.request.title}
        description={description ?? t.request.body}
        closeLabel={t.close}
      >
        <SendForm
          send={(ids, note) =>
            "brief" in target
              ? requestBriefValidation(projectId, ids, note)
              : sendStrategyDocument(projectId, target.documentId, ids, note)
          }
          directorName={directorName}
          creatives={creatives}
          recap={recap}
          onDone={() => {
            setOpen(false);
            toast.success(t.request.sent);
          }}
        />
      </FormDialog>
    </>
  );
}

function SendForm({
  send,
  directorName,
  creatives,
  recap,
  onDone,
}: {
  send: (reviewerIds: string[], note: string) => Promise<ActionResult>;
  directorName: string | null;
  creatives: Person[];
  recap?: string;
  onDone: () => void;
}) {
  const t = fr.strategyDocuments.request;
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
        run(() => send([...chosen], note), onDone);
      }}
    >
      {recap && <ToneCallout tone="info">{recap}</ToneCallout>}
      <p className="text-body-md">
        <span className="font-semibold">{directorName ?? t.director}</span>
        <span className="text-muted-foreground">
          {" · "}
          {t.director} · {t.directorAlways}
        </span>
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t.addReviewers}</legend>
        {creatives.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{t.noCreatives}</p>
        ) : (
          creatives.map((c) => (
            <label
              key={c.personId}
              className="flex items-center gap-3 text-body-md"
            >
              <Checkbox
                checked={chosen.has(c.personId)}
                onChange={() => toggle(c.personId)}
              />
              <span>
                {c.name}
                <span className="text-muted-foreground">
                  {" · "}
                  {t.creativeRole}
                </span>
              </span>
            </label>
          ))
        )}
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="send-note">{t.note}</Label>
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
          {pending ? t.sending : t.send}
        </Button>
      </div>
    </form>
  );
}
