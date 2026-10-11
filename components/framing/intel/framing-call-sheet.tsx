"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { AgendaEditor, cleanAgenda } from "@/components/calls/agenda-editor";
import { CallFields, withOccurredAt } from "@/components/calls/call-fields";
import { ParticipantsField } from "@/components/calls/participants-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { idleFormState } from "@/lib/auth/form-state";
import type { AgendaItem } from "@/lib/calls/first-call-agenda";
import type { Participant } from "@/lib/calls/participants";
import { prepareFramingCall } from "@/lib/framing/actions/call";
import type { FramingTopic } from "@/lib/framing/call-prep";
import { fr } from "@/lib/i18n/fr";
import { Checkbox } from "@/components/ui/checkbox";

export type CallSheetData = {
  topics: FramingTopic[];
  purpose: string;
  // Who is proposed as participant (owner, creative team).
  people: string[];
  documents: Array<{ id: string; name: string }>;
  defaultOccurredAt: string;
};

/**
 * « Préparer un échange » (ticket § 5) as a side panel: purpose, the topics
 * PO prepared from what the Cadrage lacks (kept or removed, detailed or
 * not), the person's own topics, participants and documents, then
 * « Lancer », which creates the call and opens it.
 */
export function FramingCallSheet({
  projectId,
  data,
  variant = "outline",
}: {
  projectId: string;
  data: CallSheetData;
  variant?: "default" | "outline";
}) {
  const t = fr.framingIntel.call;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="lg" variant={variant} onClick={() => setOpen(true)}>
        {fr.framingIntel.entry.prepare}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="px-5 pt-5 pr-14">
            <SheetTitle>{t.title}</SheetTitle>
            <SheetDescription>{t.body}</SheetDescription>
          </SheetHeader>
          {open && (
            <div className="px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <CallForm
                projectId={projectId}
                data={data}
                onCancel={() => setOpen(false)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function CallForm({
  projectId,
  data,
  onCancel,
}: {
  projectId: string;
  data: CallSheetData;
  onCancel: () => void;
}) {
  const t = fr.framingIntel.call;
  const [state, formAction] = useActionState(prepareFramingCall, idleFormState);
  // PO's topics and questions, a draft the person edits before launching
  // (PROJ-UX-03): nothing enters the agenda unseen.
  const [agenda, setAgenda] = useState<AgendaItem[]>(() =>
    data.topics.map((x) => ({
      topic: x.topic,
      minutes: x.minutes,
      questions: x.questions,
      dimension: x.dimension,
    })),
  );
  const [people, setPeople] = useState<Participant[]>(() =>
    data.people.map((name) => ({ name, contactId: null })),
  );
  const [documents, setDocuments] = useState<Set<string>>(new Set());

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };

  return (
    <form
      action={(form) => formAction(withOccurredAt(form))}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input
        type="hidden"
        name="agenda"
        value={JSON.stringify(cleanAgenda(agenda))}
      />
      <input type="hidden" name="participants" value={JSON.stringify(people)} />
      <input
        type="hidden"
        name="documentIds"
        value={JSON.stringify([...documents])}
      />

      <div className="grid gap-2">
        <Label htmlFor="framing-call-purpose" required>
          {t.purposeLabel}
        </Label>
        <Textarea
          id="framing-call-purpose"
          name="purpose"
          required
          maxLength={500}
          rows={2}
          defaultValue={data.purpose}
        />
      </div>

      <section
        aria-labelledby="framing-call-topics"
        className="flex flex-col gap-2"
      >
        <h3 id="framing-call-topics" className="text-sm font-medium">
          {t.topics}
        </h3>
        <p className="text-caption text-muted-foreground">
          {fr.calls.agenda.suggested}
        </p>
        <AgendaEditor
          value={agenda}
          onChange={setAgenda}
          idPrefix="framing-call"
        />
      </section>

      <ParticipantsField
        id="framing-call-people"
        people={people}
        onChange={setPeople}
      />

      <section
        aria-labelledby="framing-call-documents"
        className="flex flex-col gap-3"
      >
        <h3 id="framing-call-documents" className="text-sm font-medium">
          {t.documents}
        </h3>
        {data.documents.length === 0 ? (
          <p className="text-caption text-muted-foreground">{t.noDocuments}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.documents.map((doc) => (
              <li key={doc.id}>
                <label className="flex items-center gap-3 text-body-md">
                  <Checkbox
                    checked={documents.has(doc.id)}
                    onChange={() => setDocuments((set) => toggle(set, doc.id))}
                  />
                  <span className="min-w-0 break-words">{doc.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CallFields
        idPrefix="framing-call"
        defaultTitle={t.defaultTitle}
        defaultOccurredAt={data.defaultOccurredAt}
      />

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {fr.framingIntel.guide.cancel}
        </Button>
        <SubmitButton pendingLabel={t.launching}>{t.launch}</SubmitButton>
      </div>
    </form>
  );
}
