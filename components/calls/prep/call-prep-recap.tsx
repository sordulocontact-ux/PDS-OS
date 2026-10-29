"use client";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { CallPlanBlock, callBlockHeadingClass } from "./call-plan-block";

const fr = { callPrep };

/**
 * « Récapitulatif avant création », at the same place as the form (Figma
 * PDS OS 304:20801, screen 4): the call's name, then the block it will have
 * once planned (CallPlanBlock: when, who organizes, who, the agenda beside
 * the objective; no link yet, it is made at the confirmation), who is
 * external; « Confirmer et inviter » creates the call, « Modifier » goes back
 * to the form as it was.
 */
export function CallPrepRecap({
  title,
  when,
  organizer,
  people,
  agenda,
  goal,
  pending,
  error,
  onConfirm,
  onEdit,
}: {
  title: string;
  when: string;
  organizer: string | null;
  people: PrepPerson[];
  agenda: string[];
  goal: string;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const t = fr.callPrep.recap;
  const externals = people.filter((p) => p.external);
  return (
    <section aria-labelledby="call-prep-recap" className="flex flex-col gap-3">
      <h3 id="call-prep-recap" className={callBlockHeadingClass}>
        {title}
      </h3>
      <CallPlanBlock
        when={when}
        organizer={organizer}
        people={people}
        agenda={agenda}
        goal={goal}
      />
      <p className="text-caption text-[color:var(--text-tertiary)]">
        {externals.length
          ? t.invitationsExternal(
              externals.map((p) => p.name).join(", "),
              externals.length > 1,
            )
          : t.invitations}
      </p>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="lg"
          onClick={onConfirm}
          aria-busy={pending || undefined}
          disabled={pending}
        >
          {pending ? t.confirming : t.confirm}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={onEdit}
          disabled={pending}
        >
          {t.edit}
        </Button>
      </div>
    </section>
  );
}
