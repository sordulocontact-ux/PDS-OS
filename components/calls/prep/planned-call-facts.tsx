import { callWhen } from "@/lib/calls/prep/dates";
import type { PlannedCall } from "@/lib/calls/prep/planned";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { CallPlanBlock, callBlockHeadingClass } from "./call-plan-block";

const fr = { callPrep };

/**
 * The call once prepared, in its step (Figma PDS OS 304:20801, screen 5,
 * Sacha 29/10/2026): its name, then in one block when and who organizes it,
 * the video link to open or copy, the participants, the agenda beside the
 * objective (CallPlanBlock, as the summary before it); then how it is
 * recorded, then `action`: the recorder in place (PlannedCallInPlace, every
 * module since 07/11/2026, never a detour by the call's page).
 * `waiting`: what someone else than the owner reads instead of the buttons
 * (« En attente de Lina Haddad : … »).
 */
export function PlannedCallFacts({
  call,
  noun,
  goal,
  waiting,
  action,
}: {
  call: PlannedCall;
  noun: "exchange" | "call";
  // The objective, when the module keeps it (framing_calls.purpose).
  goal?: string | null;
  waiting?: { name: string; what: string } | null;
  action: React.ReactNode;
}) {
  const t = fr.callPrep.planned;
  return (
    <section className="flex flex-col gap-4">
      <h3 className={callBlockHeadingClass}>{call.title}</h3>
      <CallPlanBlock
        when={callWhen(call.occurredAt)}
        organizer={call.createdBy}
        link={call.meetingUrl}
        people={call.people}
        agenda={call.agenda.map((point) => point.topic)}
        goal={goal}
      />
      <p className="text-caption text-[color:var(--text-tertiary)]">
        {t.note[noun]}
      </p>
      {waiting ? (
        <p className="text-caption text-[color:var(--text-tertiary)]">
          {t.waiting(waiting.name, waiting.what)}
        </p>
      ) : (
        action
      )}
    </section>
  );
}
