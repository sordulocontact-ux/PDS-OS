"use client";

import { IconTrash } from "nucleo-sharp-essential";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { CallFields, withOccurredAt } from "@/components/calls/call-fields";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
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
  const [kept, setKept] = useState(
    () => new Set(data.topics.map((x) => x.dimension)),
  );
  const [detailed, setDetailed] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);
  const [topicDraft, setTopicDraft] = useState("");
  const [people, setPeople] = useState<string[]>(data.people);
  const [personDraft, setPersonDraft] = useState("");
  const [documents, setDocuments] = useState<Set<string>>(new Set());
  const minutes =
    data.topics
      .filter((x) => kept.has(x.dimension))
      .reduce((s, x) => s + x.minutes, 0) +
    extra.length * 5;

  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };
  const addTopic = () => {
    const topic = topicDraft.trim();
    if (topic && !extra.includes(topic)) setExtra((list) => [...list, topic]);
    setTopicDraft("");
  };
  const addPerson = () => {
    const name = personDraft.trim();
    if (name && !people.includes(name)) setPeople((list) => [...list, name]);
    setPersonDraft("");
  };

  return (
    <form
      action={(form) => formAction(withOccurredAt(form))}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input
        type="hidden"
        name="dimensions"
        value={JSON.stringify([...kept])}
      />
      <input type="hidden" name="detailed" value={detailed ? "1" : "0"} />
      <input type="hidden" name="extraTopics" value={JSON.stringify(extra)} />
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
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="framing-call-topics" className="text-sm font-medium">
            {t.topics}
          </h3>
          <span className="text-caption text-muted-foreground tabular-nums">
            {t.total(minutes)}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {data.topics.map((topic) => (
            <li key={topic.dimension} className="flex flex-col gap-1">
              <label className="flex items-start gap-3 text-body-md">
                <Checkbox
                  className="mt-1"
                  checked={kept.has(topic.dimension)}
                  onChange={() =>
                    setKept((set) => toggle(set, topic.dimension))
                  }
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold">
                    {topic.topic}{" "}
                    <span className="font-medium text-muted-foreground tabular-nums">
                      · {t.minutes(topic.minutes)}
                    </span>
                  </span>
                  {detailed && kept.has(topic.dimension) && (
                    <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-caption text-muted-foreground">
                      {topic.questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  )}
                </span>
              </label>
            </li>
          ))}
          {extra.map((topic) => (
            <li
              key={topic}
              className="flex items-center justify-between gap-3 text-body-md"
            >
              <span className="font-semibold">
                {topic}{" "}
                <span className="font-medium text-muted-foreground">
                  · {t.minutes(5)}
                </span>
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t.removeTopic(topic)}
                onClick={() =>
                  setExtra((list) => list.filter((x) => x !== topic))
                }
              >
                <IconTrash aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t.addTopic}
            value={topicDraft}
            maxLength={200}
            placeholder={t.topicPlaceholder}
            onChange={(e) => setTopicDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTopic();
              }
            }}
            className="h-9 min-w-0 flex-1"
          />
          <Button type="button" size="sm" variant="outline" onClick={addTopic}>
            {t.addTopic}
          </Button>
        </div>
        {data.topics.length > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="self-start"
            onClick={() => setDetailed((v) => !v)}
          >
            {detailed ? t.hideDetail : t.detail}
          </Button>
        )}
      </section>

      <section
        aria-labelledby="framing-call-people"
        className="flex flex-col gap-3"
      >
        <h3 id="framing-call-people" className="text-sm font-medium">
          {t.participants}
        </h3>
        {people.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {people.map((name) => (
              <FilterChip
                key={name}
                pressed
                aria-label={t.removeParticipant(name)}
                onClick={() =>
                  setPeople((list) => list.filter((x) => x !== name))
                }
              >
                {name}
              </FilterChip>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label={t.participantPlaceholder}
            value={personDraft}
            maxLength={120}
            placeholder={t.participantPlaceholder}
            onChange={(e) => setPersonDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPerson();
              }
            }}
            className="h-9 min-w-0 flex-1"
          />
          <Button type="button" size="sm" variant="outline" onClick={addPerson}>
            {t.addParticipant}
          </Button>
        </div>
      </section>

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
