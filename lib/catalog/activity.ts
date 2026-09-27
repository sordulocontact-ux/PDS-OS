import "server-only";

import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import {
  ACTIVITY_KINDS,
  ARTIST_FIELDS,
  FILE_CATEGORIES,
  type ActivityEvent,
  type ActivityKind,
} from "@/lib/catalog/activity-types";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { ARTIST_RELATIONS } from "@/lib/catalog/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Activity of an artist, read with the user's session: RLS hides contact and
// contract events without manage_catalog, and project events the viewer may
// not see. Rows are written by database triggers only.
const LIMIT = 200;

const kindSchema = z.enum(ACTIVITY_KINDS);

// Tolerant: a malformed key is dropped, the event stays.
const detailSchema = z.object({
  name: z.string().optional().catch(undefined),
  title: z.string().optional().catch(undefined),
  version: z.string().nullish().catch(undefined),
  assignee: z.string().optional().catch(undefined),
  role: z.string().optional().catch(undefined),
  category: z.enum(FILE_CATEGORIES).optional().catch(undefined),
  relation: z.enum(ARTIST_RELATIONS).optional().catch(undefined),
  fields: z
    .array(z.string())
    .optional()
    .catch(undefined)
    .transform((fields) =>
      fields?.filter((f): f is (typeof ARTIST_FIELDS)[number] =>
        (ARTIST_FIELDS as readonly string[]).includes(f),
      ),
    ),
});

const MASTER_KINDS: ActivityKind[] = ["master_created", "master_credited"];

export async function listArtistActivity(
  artistId: string,
): Promise<{ events: ActivityEvent[]; error: boolean }> {
  if (!catalogIdSchema.safeParse(artistId).success)
    return { events: [], error: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      "id, kind, created_at, subject_id, project_id, detail, actor:people!activity_events_actor_person_id_fkey(first_name, last_name)",
    )
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false })
    .order("seq", { ascending: false })
    .limit(LIMIT);
  if (error) {
    console.error("listArtistActivity:", error.message);
    return { events: [], error: true };
  }

  const events = (data ?? []).flatMap((row): ActivityEvent[] => {
    const kind = kindSchema.safeParse(row.kind);
    if (!kind.success) return [];
    const parsed = detailSchema.safeParse(row.detail);
    const { version, ...rest } = parsed.success ? parsed.data : {};
    const href = row.project_id
      ? routes.project(row.project_id)
      : MASTER_KINDS.includes(kind.data) && row.subject_id
        ? routes.master(row.subject_id)
        : null;
    return [
      {
        id: row.id,
        kind: kind.data,
        createdAt: row.created_at,
        actorName: row.actor
          ? personName(row.actor.first_name, row.actor.last_name)
          : "",
        href,
        detail: { ...rest, ...(version ? { version } : {}) },
      },
    ];
  });
  return { events, error: false };
}
