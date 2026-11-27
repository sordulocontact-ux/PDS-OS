import { unstable_rethrow } from "next/navigation";
import { IconPenWriting4 } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { NewNoteButton } from "@/components/notes/new-note-button";
import { NotesListView } from "@/components/notes/notes-list-view";
import { EmptyState } from "@/components/shell/empty-state";
import { SectionFrame } from "@/components/shell/section-frame";
import { requireApproved } from "@/lib/auth/dal";
import { callDeleter } from "@/lib/calls/delete-rule";
import { fr } from "@/lib/i18n/fr";
import { loadNoteProjectOptions } from "@/lib/notes/options";
import { getNoteRows } from "@/lib/notes/queries";
import { asNoteTab, type NoteRow } from "@/lib/notes/views";
import { filterValues } from "@/lib/ui/filter-options";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.notes.title} · ${fr.app.name}` };

async function loadRows(): Promise<NoteRow[] | null> {
  try {
    return await getNoteRows(null);
  } catch (error) {
    // Next's own signals (dynamic rendering, redirects) are not failures.
    unstable_rethrow(error);
    console.error(error);
    return null;
  }
}

/**
 * What the team wrote down: the reports and transcripts of its calls and the
 * notes written by hand, as a list (Toutes / Calls / Écrites / À compléter,
 * a search in the texts, the filters Projet and Personne) whose rows open in
 * a side sheet; « Nouvelle note » in the header. The calendar is the
 * Calendrier's.
 */
export default async function NotesPage({
  searchParams,
}: PageProps<"/app/notes">) {
  const params = await searchParams;
  const now = new Date();
  const [access, rows, projects] = await allInOrder([
    requireApproved(),
    loadRows(),
    loadNoteProjectOptions().catch((error) => {
      unstable_rethrow(error);
      return [];
    }),
  ]);
  const action = <NewNoteButton projects={projects} />;

  if (!rows)
    return (
      <SectionFrame title={fr.notes.title} action={action}>
        <FormMessage kind="error">{fr.notes.loadError}</FormMessage>
      </SectionFrame>
    );

  return (
    <SectionFrame
      title={fr.notes.title}
      action={action}
      toolsAction={rows.length > 0}
    >
      <NotesListView
        rows={rows}
        pageAction={action}
        now={now}
        door={{ kind: "calls" }}
        tab={asNoteTab(params.tab)}
        project={filterValues(params.project)}
        person={filterValues(params.person)}
        deleter={callDeleter(access)}
        projects={projects}
        empty={<EmptyState icon={IconPenWriting4} title={fr.notes.empty.all} />}
      />
    </SectionFrame>
  );
}
