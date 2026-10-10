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
import { createProductionCall } from "@/lib/production/call-actions";
import type {
  CallFormat,
  ProductionCallSheetData,
} from "@/lib/production/call-prep";
import { cn } from "@/lib/utils";

/**
 * The production call as PO prepared it — objective, topics, participants,
 * format and date — then « Vérifier » shows the summary and only « Créer
 * l'échange » creates it. The fields stay mounted (hidden) on the summary,
 * so « Modifier » finds them as they were and the form sends them.
 */
export function ProductionCallForm({
  projectId,
  data,
  onCancel,
}: {
  projectId: string;
  data: ProductionCallSheetData;
  onCancel: () => void;
}) {
  const t = fr.productionCall;
  const [state, formAction] = useActionState(
    createProductionCall,
    idleFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const topics = data.topics.map((x) => ({ ...x, id: x.key }));
  const [kept, setKept] = useState(
    () => new Set<string>(topics.map((x) => x.id)),
  );
  const [detailed, setDetailed] = useState(false);
  const [extra, setExtra] = useState<string[]>([]);
  const [people, setPeople] = useState<Participant[]>(() =>
    data.people.map((name) => ({ name, contactId: null })),
  );
  const [format, setFormat] = useState<CallFormat>("video");
  const [recap, setRecap] = useState<CallRecapData | null>(null);
  const [peopleMissing, setPeopleMissing] = useState(false);
  // Taken when the panel opens (client only): the next round hour.
  const [defaultOccurredAt] = useState(() => nextRoundHourInput(new Date()));

  const toggle = (id: string) =>
    setKept((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Native validation first, then the summary from what the form holds.
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
      // Enter in a field checks first: nothing is created before the summary.
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
          <Label htmlFor="production-call-purpose" required>
            {t.purposeLabel}
          </Label>
          <Textarea
            id="production-call-purpose"
            name="purpose"
            required
            maxLength={500}
            rows={2}
            defaultValue={data.purpose}
          />
        </div>
        <AgendaTopicsField
          id="production-call-topics"
          title={t.topics}
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
          id="production-call-people"
          people={people}
          onChange={(next) => {
            setPeople(next);
            setPeopleMissing(false);
          }}
          hint={peopleMissing ? t.noParticipants : undefined}
        />
        <CallFormatField value={format} onChange={setFormat} />
        <CallFields
          idPrefix="production-call"
          defaultTitle={t.defaultTitle(data.deliverableTitle)}
          defaultOccurredAt={defaultOccurredAt}
          withLink={format === "video"}
        />
      </div>

      {recap && <CallRecap id="production-call-recap" recap={recap} />}

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
