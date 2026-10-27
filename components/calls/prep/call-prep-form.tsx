"use client";

import type { ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { callWhen, instantOfInputs } from "@/lib/calls/prep/dates";
import type { CallPrepDefaults, PrepTopic } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { AgendaList } from "./agenda-list";
import { AttendeeChips } from "./attendee-chips";
import { CallPrepRecap } from "./call-prep-recap";
import { CallPrepSent } from "./call-prep-sent";
import { CallPrepWhen } from "./call-prep-when";
import { useCallPrep } from "./use-call-prep";

const fr = { callPrep };

/**
 * The common call form, in the step (proto « Projet complet », `prepGate`):
 * « Nouvel échange » / « Nouveau call », participants as chips, date, hour
 * and format, the agenda, what goes with the invitation, then « Voir le
 * récapitulatif » at the same place, « Confirmer et inviter » or
 * « Modifier » (the input is kept). Everything it opens with comes from the
 * module (`defaults`, computed on the server); `agenda` / `goal` override
 * PO's when the module's own fields change them (`extra`, the Conception's
 * deliverables). `stay`: the planned call then shows in place.
 */
export function CallPrepForm({
  defaults,
  stay = false,
  agenda,
  goal,
  extra,
  extraIds = [],
  onStartDirectly,
}: {
  defaults: CallPrepDefaults;
  stay?: boolean;
  agenda?: PrepTopic[];
  goal?: string;
  extra?: ReactNode;
  extraIds?: string[];
  onStartDirectly?: () => void;
}) {
  const t = fr.callPrep;
  const s = useCallPrep(defaults, { stay, agenda, goal, extraIds });
  const missing = Object.keys(s.errors).length;

  if (s.recap) {
    const at = instantOfInputs(s.date, s.time);
    return (
      <CallPrepRecap
        when={t.recap.whenValue(at ? callWhen(at) : "", t.formats[s.format])}
        people={s.people}
        agenda={s.agenda.items.map((x) => x.topic)}
        goal={s.goal}
        pending={s.pending}
        error={s.error}
        onConfirm={s.confirm}
        onEdit={() => s.setRecap(false)}
      />
    );
  }

  return (
    <section
      aria-labelledby="call-prep-heading"
      className="flex flex-col gap-6"
    >
      <h3 id="call-prep-heading" className="text-body-md font-semibold">
        {t.heading[defaults.noun]}
      </h3>
      <AttendeeChips
        id="call-prep-people"
        pool={defaults.people}
        value={s.people}
        onChange={s.setPeople}
        required
        error={s.errors.people}
      />
      <CallPrepWhen
        date={s.date}
        time={s.time}
        format={s.format}
        formats={defaults.formats}
        link={s.link}
        googleMeet={defaults.googleMeet}
        errors={s.errors}
        onDate={s.setDate}
        onTime={s.setTime}
        onFormat={s.setFormat}
        onLink={s.setLink}
      />
      {extra}
      <AgendaList
        id="call-prep-agenda"
        items={s.agenda.items}
        onChange={s.agenda.change}
        onAdd={s.agenda.add}
        detailed={s.detailed}
        onDetailedChange={s.setDetailed}
      />
      <CallPrepSent
        defaults={defaults}
        goal={s.goal}
        onGoal={s.setGoal}
        goalError={s.errors.goal}
        documentIds={s.documentIds}
        onDocuments={s.setDocumentIds}
      />
      {missing > 0 && (
        <FormMessage kind="error">{t.missingCount(missing)}</FormMessage>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="button" size="lg" onClick={s.review}>
          {t.review}
        </Button>
        {onStartDirectly && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onStartDirectly}
          >
            {t.startDirectly}
          </Button>
        )}
      </div>
    </section>
  );
}
