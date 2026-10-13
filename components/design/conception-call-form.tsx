"use client";

import { useActionState, useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { AgendaTopicsField } from "@/components/calls/agenda-topics-field";
import { CallFields, withOccurredAt } from "@/components/calls/call-fields";
import { CallFormActions } from "@/components/calls/call-form-actions";
import { CallFormatField } from "@/components/calls/call-format-field";
import { CallRecap, type CallRecapData } from "@/components/calls/call-recap";
import { ParticipantsField } from "@/components/calls/participants-field";
import { CallDeliverablesField } from "@/components/design/call-deliverables-field";
import { useDesignCallAgenda } from "@/components/design/use-design-call-agenda";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleFormState } from "@/lib/auth/form-state";
import type { Participant } from "@/lib/calls/participants";
import {
  agendaMinutes,
  agendaRecap,
  type ExtraTopic,
  type TopicDurations,
} from "@/lib/calls/prepare";
import { prepareDesignCall } from "@/lib/design/actions/call";
import type { CallFormat, DesignCallSheetData } from "@/lib/design/call-prep";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

/**
 * The creative exchange as PO prepared it — objective, deliverables, topics,
 * participants, date and format — then « Vérifier » shows the summary and
 * only « Créer l'échange » creates it. The topics follow the chosen
 * deliverables; a topic the person removed stays removed. The fields stay
 * mounted (hidden) on the summary, so « Modifier » finds them as they were.
 */
export function ConceptionCallForm({
  projectId,
  data,
  onCancel,
}: {
  projectId: string;
  data: DesignCallSheetData;
  onCancel: () => void;
}) {
  const t = fr.conceptionCall;
  const [state, formAction] = useActionState(prepareDesignCall, idleFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const [detailed, setDetailed] = useState(false);
  const [extra, setExtra] = useState<ExtraTopic[]>([]);
  const [durations, setDurations] = useState<TopicDurations>({});
  const [people, setPeople] = useState<Participant[]>(() =>
    data.people.map((name) => ({ name, contactId: null })),
  );
  const [format, setFormat] = useState<CallFormat>("video");
  const [recap, setRecap] = useState<CallRecapData | null>(null);
  const [peopleMissing, setPeopleMissing] = useState(false);

  const { chosen, topics, kept, purpose, ...agenda } =
    useDesignCallAgenda(data);

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
      purpose: purpose.trim(),
      participants: people.map((p) => p.name),
      topics: agendaRecap(topics, kept, extra, durations),
      minutes: agendaMinutes(topics, kept, extra, durations),
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
      <input
        type="hidden"
        name="deliverableIds"
        value={JSON.stringify(chosen.map((d) => d.id))}
      />
      <input type="hidden" name="topics" value={JSON.stringify([...kept])} />
      <input type="hidden" name="detailed" value={detailed ? "1" : "0"} />
      <input type="hidden" name="extraTopics" value={JSON.stringify(extra)} />
      <input
        type="hidden"
        name="topicMinutes"
        value={JSON.stringify(durations)}
      />
      <input type="hidden" name="participants" value={JSON.stringify(people)} />

      <div className={cn("flex flex-col gap-6", recap && "hidden")}>
        <div className="grid gap-2">
          <Label htmlFor="design-call-purpose" required>
            {t.purposeLabel}
          </Label>
          <Textarea
            id="design-call-purpose"
            name="purpose"
            required
            maxLength={500}
            rows={2}
            value={purpose}
            onChange={(e) => agenda.editPurpose(e.target.value)}
          />
        </div>
        <CallDeliverablesField
          id="design-call-deliverables"
          deliverables={data.deliverables}
          selected={agenda.selected}
          onToggle={agenda.toggleDeliverable}
        />
        <AgendaTopicsField
          id="design-call-topics"
          title={t.topics}
          topics={topics}
          kept={kept}
          onToggle={agenda.toggleTopic}
          extra={extra}
          onExtraChange={setExtra}
          durations={durations}
          onDurationsChange={setDurations}
          detailed={detailed}
          onDetailedChange={setDetailed}
          empty={t.noTopics}
        />
        <ParticipantsField
          id="design-call-people"
          people={people}
          onChange={(next) => {
            setPeople(next);
            setPeopleMissing(false);
          }}
          hint={peopleMissing ? t.noParticipants : undefined}
        />
        <CallFormatField value={format} onChange={setFormat} />
        <CallFields
          idPrefix="design-call"
          defaultTitle={t.defaultTitle}
          defaultOccurredAt={data.defaultOccurredAt}
          withLink={format === "video"}
        />
      </div>

      {recap && (
        <CallRecap
          id="design-call-recap"
          recap={recap}
          extra={[
            {
              label: t.recapDeliverables,
              value: chosen.length
                ? chosen.map((d) => d.title).join(", ")
                : null,
            },
          ]}
        />
      )}

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
