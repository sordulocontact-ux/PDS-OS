import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { NotificationSubject } from "@/lib/notifications/types";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
} from "@/lib/projects/title-rules";
import type { Database } from "@/lib/supabase/database.types";

// A collective's participation confirmed or declined (retours d'Ibé du
// 18/11/2026): the notification names the artist and the title as the
// project calls it now (« Titre de Jay (à nommer) »), read with the
// reader's session (RLS: whoever sees the project). Never the interlocutor.

const SELECT =
  "id, artist:artists!title_participations_artist_same_org(name), title:project_titles!title_participations_title(position, working_title, link:project_masters!project_titles_link(master:masters!project_masters_master_same_org(title, title_is_provisional)), participations:title_participations!title_participations_title(status, created_at, artist:artists!title_participations_artist_same_org(name)))";

/** The artist and the title of each participation a notification is
 * about, by participation id; a participation the reader no longer sees is
 * left out (the text then stays general). */
export async function loadParticipationSubjects(
  supabase: SupabaseClient<Database>,
  rows: ReadonlyArray<{ kind: string; subject_id: string | null }>,
): Promise<Map<string, NotificationSubject>> {
  const ids = [
    ...new Set(
      rows
        .filter((r) => r.kind.startsWith("participation_") && r.subject_id)
        .map((r) => r.subject_id!),
    ),
  ];
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase
    .from("title_participations")
    .select(SELECT)
    .in("id", ids);
  if (error) console.error("loadParticipationSubjects:", error.message);
  const subjects = new Map<string, NotificationSubject>();
  for (const row of data ?? []) {
    if (!row.artist || !row.title) continue;
    const master = row.title.link?.master ?? null;
    const guests = [...row.title.participations]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .flatMap((p) =>
        p.artist ? [{ status: p.status, artist: p.artist }] : [],
      );
    subjects.set(row.id, {
      artist: row.artist.name,
      title: projectTitleLabel({
        position: row.title.position,
        workingTitle: row.title.working_title,
        masterTitle: masterNameOf(
          master
            ? { title: master.title, provisional: master.title_is_provisional }
            : null,
        ),
        artists: titleGuestNames(guests),
      }),
    });
  }
  return subjects;
}
