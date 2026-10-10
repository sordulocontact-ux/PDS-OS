"use client";

import { useActionState, useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { AgendaTopicsField } from "@/components/calls/agenda-topics-field";
import { CallFields, withOccurredAt } from "@/components/calls/call-fields";
import { ParticipantsField } from "@/components/calls/participants-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { idleFormState } from "@/lib/auth/form-state";
import type { Participant } from "@/lib/calls/participants";
import { EXTRA_TOPIC_MINUTES, agendaMinutes } from "@/lib/calls/prepare";
import { fr } from "@/lib/i18n/fr";
import { prepareStrategyCall } from "@/lib/strategy/actions/call";
import { cn } from "@/lib/utils";
import {
  CALL_FORMATS,
  type CallFormat,
  type StrategyCallSheetData,
} from "@/lib/strategy/call-prep";

import { StrategyCallRecap, type CallRecap } from "./strategy-call-recap";

/**
 * The exchange as PO prepared it — objective, topics, participants, date
 * and format — then « Vérifier » shows the summary and only « Créer
 * l'échange » creates it. The fields stay mounted (hidden) on the summary,
 * so « Modifier » finds them as they were and the form sends them.
 */
export function StrategyCallForm({
  projectId,
  data,
  onCancel,
}: {
  projectId: string;
  data: StrategyCallSheetData;
  onCancel: () => void;
}) {
  const t = fr.strategyEntry.call;
  const [state, formAction] = useActionState(
    prepareStrategyCall,
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
  const [recap, setRecap] = useState<CallRecap | null>(null);
  const [peopleMissing, setPeopleMissing] = useState(false);

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
      <input type="hidden" name="topics" value={JSON.stringify([...kept])} />
      <input type="hidden" name="detailed" value={detailed ? "1" : "0"} />
      <input type="hidden" name="extraTopics" value={JSON.stringify(extra)} />
      <input type="hidden" name="participants" value={JSON.stringify(people)} />

      <div className={cn("flex flex-col gap-6", recap && "hidden")}>
        <div className="grid gap-2">
          <Label htmlFor="strategy-call-purpose" required>
            {t.purposeLabel}
          </Label>
          <Textarea
            id="strategy-call-purpose"
            name="purpose"
            required
            maxLength={500}
            rows={2}
            defaultValue={data.purpose}
          />
        </div>
        <AgendaTopicsField
          id="strategy-call-topics"
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
          id="strategy-call-people"
          people={people}
          onChange={(next) => {
            setPeople(next);
            setPeopleMissing(false);
          }}
          hint={peopleMissing ? t.noParticipants : undefined}
        />
        <ChoiceCards
          name="format"
          legend={t.format}
          required
          columns={3}
          value={format}
          onChange={setFormat}
          choices={CALL_FORMATS.map((value) => ({
            value,
            label: t.formats[value],
            hint: t.formatHints[value],
          }))}
        />
        <CallFields
          idPrefix="strategy-call"
          defaultTitle={t.defaultTitle}
          defaultOccurredAt={data.defaultOccurredAt}
          withLink={format === "video"}
        />
      </div>

      {recap && <StrategyCallRecap recap={recap} />}

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {recap ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => setRecap(null)}
            >
              {t.edit}
            </Button>
            <SubmitButton pendingLabel={t.creating}>{t.create}</SubmitButton>
          </>
        ) : (
          <>
            <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
              {t.cancel}
            </Button>
            <Button type="button" size="lg" onClick={review}>
              {t.review}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
