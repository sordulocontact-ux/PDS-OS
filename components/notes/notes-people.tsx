import { Avatar } from "@/components/ui/avatar";
import { DataTableText } from "@/components/ui/data-table";
import { notes } from "@/lib/i18n/fr/notes";
import type { NotePerson } from "@/lib/notes/views";

const fr = { notes };

// Faces shown before « +n ».
const FACES = 3;

/** Who is in a note's row: the members' avatars side by side, then their
 * names on one line (the whole list on hover); a note's author alone. */
export function NotesPeople({ people }: { people: NotePerson[] }) {
  if (people.length === 0) return null;
  const more = people.length - FACES;
  return (
    <div className="flex items-center gap-2">
      <span className="flex shrink-0 -space-x-2">
        {people.slice(0, FACES).map((person) => (
          <Avatar
            key={person.personId}
            name={person.name}
            pictureUrl={null}
            className="size-6 ring-2 ring-[var(--surface-page)]"
          />
        ))}
      </span>
      {more > 0 && (
        <span className="shrink-0 text-[color:var(--text-tertiary)] tabular-nums">
          {fr.notes.others(more)}
        </span>
      )}
      <DataTableText>
        {people.map((person) => person.name).join(", ")}
      </DataTableText>
    </div>
  );
}
