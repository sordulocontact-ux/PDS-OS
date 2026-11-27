import { Avatar } from "@/components/ui/avatar";
import { DataTableText } from "@/components/ui/data-table";
import type { NotePerson } from "@/lib/notes/views";

/** Who is in a note's row: the first one's avatar, then every name on one
 * line (the whole list on hover). One avatar, no stack: overlapping faces
 * needed a ring that read as a stray outline (Sacha, 27/11/2026). */
export function NotesPeople({ people }: { people: NotePerson[] }) {
  const [first] = people;
  if (!first) return null;
  return (
    <div className="flex items-center gap-2">
      <Avatar name={first.name} pictureUrl={null} className="size-6 shrink-0" />
      <DataTableText>
        {people.map((person) => person.name).join(", ")}
      </DataTableText>
    </div>
  );
}
