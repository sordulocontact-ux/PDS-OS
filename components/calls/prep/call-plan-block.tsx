import { LinkPill } from "@/components/ui/link-pill";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { AttendeeChipList } from "./attendee-chip";

const fr = { callPrep };

/** The title above the form, its summary and the planned call. */
export const callBlockHeadingClass = "text-body-lg font-semibold";

/** One fact of the call: its label, then its value under it. */
function PlanFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <dl className="flex min-w-0 flex-col gap-2">
      <dt className="text-caption text-[color:var(--text-secondary)]">
        {label}
      </dt>
      <dd className="min-w-0 text-body-md font-medium break-words">
        {children}
      </dd>
    </dl>
  );
}

/**
 * A call in one block, the same before and after « Confirmer et inviter »
 * (Figma PDS OS 304:20801, screens 4 and 5): when and who organizes it, the
 * video link once it exists, the participants, then the agenda one point
 * per line beside the exchange's objective.
 */
export function CallPlanBlock({
  when,
  organizer,
  link,
  people,
  agenda,
  goal,
}: {
  when: string;
  organizer: string | null;
  link?: string | null;
  people: PrepPerson[];
  agenda: string[];
  goal?: string | null;
}) {
  const t = fr.callPrep.planned;
  return (
    <div className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)] px-6 [&>*]:py-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <PlanFact label={t.when}>{when}</PlanFact>
        {organizer && <PlanFact label={t.organizer}>{organizer}</PlanFact>}
      </div>
      {link && (
        <PlanFact label={t.link}>
          <LinkPill url={link} copyLabel={t.copy} copiedLabel={t.copied} open />
        </PlanFact>
      )}
      <PlanFact label={t.participants}>
        <AttendeeChipList people={people} />
      </PlanFact>
      <div className="grid gap-4 sm:grid-cols-2">
        <PlanFact label={t.agenda}>
          {agenda.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {agenda.map((topic, i) => (
                <li key={`${i}-${topic}`}>{`${i + 1}. ${topic}`}</li>
              ))}
            </ol>
          ) : (
            "—"
          )}
        </PlanFact>
        {goal && <PlanFact label={fr.callPrep.goal}>{goal}</PlanFact>}
      </div>
    </div>
  );
}
