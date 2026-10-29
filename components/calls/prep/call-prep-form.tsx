"use client";

import type { ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { callWhen, instantOfInputs } from "@/lib/calls/prep/dates";
import type { CallPrepDefaults, PrepTopic } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { AgendaList } from "./agenda-list";
import { AttendeeChips } from "./attendee-chips";
import { callBlockHeadingClass } from "./call-plan-block";
import { CallPrepGoal } from "./call-prep-goal";
import { CallPrepRecap } from "./call-prep-recap";
import { CallPrepWhen } from "./call-prep-when";
import { useCallPrep } from "./use-call-prep";

const fr = { callPrep };

/**
 * The common call form, in the step (proto « Projet complet », `prepGate`;
 * Figma PDS OS 304:20801, screen 3): « Nouvel échange » / « Nouveau call »
 * above a block with the participants as chips, date, hour and format, the
 * agenda, the objective and the documents, then « Voir le récapitulatif »
 * at the same place, « Confirmer et inviter » or « Modifier » (the input is
 * kept). Everything it opens with comes from the module (`defaults`,
 * computed on the server); `agenda` / `goal` override PO's when the
 * module's own fields change them (`extra`, the Conception's deliverables).
 * `stay`: the planned call then shows in place. `onBack`: « Revenir au
 * choix », the step's ways in; `onStartDirectly`: the Master's « Commencer
 * directement plutôt ».
 */
export function CallPrepForm({
  defaults,
  stay = false,
  agenda,
  goal,
  extra,
  extraIds = [],
  onBack,
  onStartDirectly,
}: {
  defaults: CallPrepDefaults;
  stay?: boolean;
  agenda?: PrepTopic[];
  goal?: string;
  extra?: ReactNode;
  extraIds?: string[];
  onBack?: () => void;
  onStartDirectly?: () => void;
}) {
  const t = fr.callPrep;
  const s = useCallPrep(defaults, { stay, agenda, goal, extraIds });
  const missing = Object.keys(s.errors).length;

  if (s.recap) {
    const at = instantOfInputs(s.date, s.time);
    return (
      <CallPrepRecap
        title={defaults.title}
        when={
          defaults.formats.length > 1
            ? t.recap.whenValue(at ? callWhen(at) : "", t.formats[s.format])
            : at
              ? callWhen(at)
              : ""
        }
        organizer={defaults.organizer}
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
      className="flex flex-col gap-3"
    >
      <h3 id="call-prep-heading" className={callBlockHeadingClass}>
        {t.heading[defaults.noun]}
      </h3>
      <div className="flex flex-col gap-7 rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)] p-6">
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
        />
        <CallPrepGoal
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
          {onBack && (
            <Button type="button" size="lg" variant="outline" onClick={onBack}>
              {t.back}
            </Button>
          )}
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
      </div>
    </section>
  );
}
