import { WorkRow } from "@/components/project-work/work-row";
import { ListCard } from "@/components/ui/list-card";
import { fr } from "@/lib/i18n/fr";
import type { WorkPerson } from "@/lib/project-work/queries";
import type { WorkItem } from "@/lib/project-work/workload";

const t = fr.projectWork.work;

// A person's card: open items (already sorted, late first), then the tasks
// they ticked, folded so the card stays about what is left.
export function PersonWorkCard({
  person,
  items,
  projectId,
  names,
  mePersonId,
}: {
  person: WorkPerson;
  items: WorkItem[];
  projectId: string;
  names: Record<string, string>;
  mePersonId: string | null;
}) {
  const open = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done");
  const row = (item: WorkItem) => (
    <WorkRow
      key={item.id}
      item={item}
      projectId={projectId}
      names={names}
      mePersonId={mePersonId}
    />
  );

  return (
    <ListCard
      title={`${person.name || t.unknownPerson} · ${t.roles[person.role]}`}
      count={open.length}
      empty={items.length ? undefined : t.personEmpty}
    >
      {open.length === 0 && (
        <li className="text-body-md text-muted-foreground">{t.personEmpty}</li>
      )}
      {open.map(row)}
      {done.length > 0 && (
        <li>
          <details className="group">
            <summary className="cursor-pointer py-1 text-caption text-muted-foreground">
              {t.doneCount(done.length)}
            </summary>
            <ul className="grid gap-1 pt-1 text-muted-foreground">
              {done.map(row)}
            </ul>
          </details>
        </li>
      )}
    </ListCard>
  );
}
