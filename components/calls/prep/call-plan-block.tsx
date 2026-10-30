import {
  BlockFact,
  FactBlock,
  FactBlockRow,
  factBlockTitleClass,
} from "@/components/ui/fact-block";
import { LinkPill } from "@/components/ui/link-pill";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { callPrep } from "@/lib/i18n/fr/call-prep";

import { AttendeeChipList } from "./attendee-chip";

const fr = { callPrep };

/** The title above the form, its summary and the planned call. */
export const callBlockHeadingClass = factBlockTitleClass;

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
    <FactBlock>
      <FactBlockRow>
        <BlockFact label={t.when}>{when}</BlockFact>
        {organizer && <BlockFact label={t.organizer}>{organizer}</BlockFact>}
      </FactBlockRow>
      {link && (
        <BlockFact label={t.link}>
          <LinkPill url={link} copyLabel={t.copy} copiedLabel={t.copied} open />
        </BlockFact>
      )}
      <BlockFact label={t.participants}>
        <AttendeeChipList people={people} />
      </BlockFact>
      <FactBlockRow>
        <BlockFact label={t.agenda}>
          {agenda.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {agenda.map((topic, i) => (
                <li key={`${i}-${topic}`}>{`${i + 1}. ${topic}`}</li>
              ))}
            </ol>
          ) : (
            "—"
          )}
        </BlockFact>
        {goal && <BlockFact label={fr.callPrep.goal}>{goal}</BlockFact>}
      </FactBlockRow>
    </FactBlock>
  );
}
