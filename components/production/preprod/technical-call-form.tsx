"use client";

import { useActionState, useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { AgendaTopicsField } from "@/components/calls/agenda-topics-field";
import { CallFields, withOccurredAt } from "@/components/calls/call-fields";
import { CallFormActions } from "@/components/calls/call-form-actions";
import { CallFormatField } from "@/components/calls/call-format-field";
import { CallRecap, type CallRecapData } from "@/components/calls/call-recap";
import { ParticipantsField } from "@/components/calls/participants-field";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleFormState } from "@/lib/auth/form-state";
import type { Participant } from "@/lib/calls/participants";
import { nextRoundHourInput } from "@/lib/calls/format";
import { EXTRA_TOPIC_MINUTES, agendaMinutes } from "@/lib/calls/prepare";
import { fr } from "@/lib/i18n/fr";
import type { CallFormat } from "@/lib/production/call-prep";
import { createTechnicalCall } from "@/lib/production/preprod/actions-call";
import type { TechnicalTopicPrep } from "@/lib/production/preprod/call-topics";
import { cn } from "@/lib/utils";

const t = fr.productionPreprod.call;

/** What « Préparer le call technique » opens with, prepared by code. */
export type TechnicalCallSheetData = {
  sheetId: string;
  deliverableId: string;
  deliverableTitle: string;
  topics: TechnicalTopicPrep[];
  purpose: string;
  people: string[];
  documents: string[];
};

/**
 * The technical call as PO prepared it — objective, the six topics with
 * their open questions (kept when something is open), participants by
 * function, documents to have at hand, format and date — then « Vérifier »
 * shows the summary and only « Créer l'échange » creates it.
 */
export function TechnicalCallForm({
  projectId,
  data,
  onCancel,
}: {
  projectId: string;
  data: TechnicalCallSheetData;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(
    createTechnicalCall,
    idleFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const topics = data.topics.map((x) => ({ ...x, id: x.key }));
  const [kept, setKept] = useState(
    () =>
      new Set<string>(
        topics.filter((x) => x.questions.length > 0).map((x) => x.id),
      ),
  );
  const [detailed, setDetailed] = useState(true);
  const [extra, setExtra] = useState<string[]>([]);
  const [people, setPeople] = useState<Participant[]>(() =>
    data.people.map((name) => ({ name, contactId: null })),
  );
  const [format, setFormat] = useState<CallFormat>("video");
  const [recap, setRecap] = useState<CallRecapData | null>(null);
  const [peopleMissing, setPeopleMissing] = useState(false);
  const [defaultOccurredAt] = useState(() => nextRoundHourInput(new Date()));

  const toggle = (id: string) =>
    setKept((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const review = () => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    if (people.length === 0) return setPeopleMissing(true);
    const values = new FormData(form);
    setRecap({
      title: String(values.get("title") ?? ""),
      occurredAtLocal: String(values.get("occurredAtLocal") ?? ""),
      format,
      meetingUrl: String(values.get("meetingUrl") ?? "").trim(),
      purpose: String(values.get("purpose") ?? "").trim(),
      participants: people.map((p) => p.name),
      topics: [
        ...topics
          .filter((x) => kept.has(x.id))
          .map((x) => ({ topic: x.topic, minutes: x.minutes })),
        ...extra.map((topic) => ({ topic, minutes: EXTRA_TOPIC_MINUTES })),
      ],
      minutes: agendaMinutes(topics, kept, extra),
    });
  };

  return (
    <form
      ref={formRef}
      action={(form) => formAction(withOccurredAt(form))}
      onSubmit={(e) => {
        if (recap) return;
        e.preventDefault();
        review();
      }}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="deliverableId" value={data.deliverableId} />
      <input type="hidden" name="sheetId" value={data.sheetId} />
      <input type="hidden" name="topics" value={JSON.stringify([...kept])} />
      <input type="hidden" name="detailed" value={detailed ? "1" : "0"} />
      <input type="hidden" name="extraTopics" value={JSON.stringify(extra)} />
      <input type="hidden" name="participants" value={JSON.stringify(people)} />

      <div className={cn("flex flex-col gap-6", recap && "hidden")}>
        <div className="grid gap-2">
          <Label htmlFor="technical-call-purpose" required>
            {t.purposeLabel}
          </Label>
          <Textarea
            id="technical-call-purpose"
            name="purpose"
            required
            maxLength={500}
            rows={3}
            defaultValue={data.purpose}
          />
        </div>
        <AgendaTopicsField
          id="technical-call-topics"
          title={t.topicsLabel}
          topics={topics}
          kept={kept}
          onToggle={toggle}
          extra={extra}
          onExtraChange={setExtra}
          detailed={detailed}
          onDetailedChange={setDetailed}
          empty={t.noTopics}
        />
        <ParticipantsField
          id="technical-call-people"
          people={people}
          onChange={(next) => {
            setPeople(next);
            setPeopleMissing(false);
          }}
          hint={peopleMissing ? t.noParticipants : undefined}
        />
        <section aria-labelledby="technical-call-docs" className="grid gap-2">
          <h3 id="technical-call-docs" className="text-sm font-medium">
            {t.documentsLabel}
          </h3>
          {data.documents.length ? (
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {data.documents.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.noDocuments}</p>
          )}
        </section>
        <CallFormatField value={format} onChange={setFormat} />
        <CallFields
          idPrefix="technical-call"
          defaultTitle={t.defaultTitle(data.deliverableTitle)}
          defaultOccurredAt={defaultOccurredAt}
          withLink={format === "video"}
        />
      </div>

      {recap && <CallRecap id="technical-call-recap" recap={recap} />}

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <CallFormActions
        onSummary={recap !== null}
        onCancel={onCancel}
        onReview={review}
        onEdit={() => setRecap(null)}
      />
    </form>
  );
}
