"use client";

import { CallFacts } from "@/components/calls/call-facts";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { AttendeeChipList } from "./attendee-chip";

const fr = { callPrep };

/**
 * « Récapitulatif avant création », at the same place as the form: when,
 * who, the agenda, the objective, who is external; « Confirmer et inviter »
 * creates the call, « Modifier » goes back to the form as it was.
 */
export function CallPrepRecap({
  when,
  people,
  agenda,
  goal,
  pending,
  error,
  onConfirm,
  onEdit,
}: {
  when: string;
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
    <section aria-labelledby="call-prep-recap" className="flex flex-col gap-4">
      <h3 id="call-prep-recap" className="text-body-md font-semibold">
        {t.heading}
      </h3>
      <CallFacts
        facts={[
          { label: t.when, value: when },
          {
            label: t.participants,
            value: <AttendeeChipList people={people} />,
          },
          {
            label: t.agenda,
            value:
              agenda.map((topic, i) => `${i + 1}. ${topic}`).join(" · ") || "—",
          },
          { label: t.goal, value: goal },
        ]}
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
          variant="ghost"
          onClick={onEdit}
          disabled={pending}
        >
          {t.edit}
        </Button>
      </div>
    </section>
  );
}
