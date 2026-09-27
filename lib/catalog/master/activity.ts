import "server-only";

import { z } from "zod";

import type { ActivityEntry } from "@/components/catalog/activity/activity-log";
import { routes } from "@/lib/auth/redirects";
import {
  MASTER_ITEM_SECTIONS,
  ORGANISMS,
  SESSION_KINDS,
  oneOf,
} from "@/lib/catalog/master/rules";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { AUDIO_STATES } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Activity of a title ("master" in the code), read with the user's session: RLS hides split and
// contract events without manage_catalog, and project events the viewer may
// not see. Rows are written by database triggers only; each becomes one
// sentence written here, from what the trigger copied at the time.
export const MASTER_ACTIVITY_LIMIT = 200;

// Tolerant: a malformed key is dropped, the event stays.
const detailSchema = z.object({
  name: z.string().optional().catch(undefined),
  title: z.string().optional().catch(undefined),
  kind: z.string().nullish().catch(undefined),
  section: z.enum(MASTER_ITEM_SECTIONS).optional().catch(undefined),
  fields: z.array(z.string()).optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  previous_category: z.string().optional().catch(undefined),
  audio_state: z.enum(AUDIO_STATES).nullish().catch(undefined),
});
type Detail = z.infer<typeof detailSchema>;

const listFormat = new Intl.ListFormat("fr-FR", {
  style: "long",
  type: "conjunction",
});

// "la session « Studio Ferber »", "la déclaration SACEM".
function itemLabel(d: Detail): string {
  const t = fr.masterPage;
  const section = d.section ?? "session";
  const prefix = t.activity.sections[section];
  if (section === "declaration" && d.name)
    return `${prefix} ${t.declarations.organisms[oneOf(ORGANISMS, d.name, "sacem")]}`;
  const name =
    section === "session" && d.name && d.name === d.kind
      ? t.sessions.kinds[oneOf(SESSION_KINDS, d.name, "other")]
      : d.name;
  return name ? `${prefix} « ${name} »` : prefix;
}

function sentence(kind: string, d: Detail): string | null {
  const s = fr.masterPage.activity.sentences;
  const quoted = fr.artistActivity.quoted;
  switch (kind) {
    case "master_created":
      return s.masterCreated;
    case "master_updated": {
      // The audio state alone (often moved forward by an audio file) says
      // where the title now stands.
      if (d.fields?.length === 1 && d.fields[0] === "audio" && d.audio_state)
        return s.audioStateSet(fr.catalog.audioStates[d.audio_state]);
      const fields = (d.fields ?? []).flatMap((f) =>
        f === "identity" || f === "rights" || f === "audio"
          ? [fr.masterPage.activity.fields[f]]
          : [],
      );
      return fields.length > 0
        ? s.masterUpdated(listFormat.format(fields))
        : s.masterUpdatedNoField;
    }
    case "master_item_added":
      return s.itemAdded(itemLabel(d));
    case "master_item_updated":
      return s.itemUpdated(itemLabel(d));
    case "master_item_removed":
      return s.itemRemoved(itemLabel(d));
    case "file_added":
      return d.audio_state
        ? s.audioAdded(
            fr.catalog.audioStates[d.audio_state],
            quoted(d.name, fr.artistActivity.aFile),
          )
        : s.fileAdded(quoted(d.name, fr.artistActivity.aFile));
    case "file_updated": {
      const name = quoted(d.name, fr.artistActivity.aFile);
      const labels: Record<string, string> = fr.catalogFiles.categories.master;
      return d.previous_category && d.category && labels[d.category]
        ? s.fileMoved(name, labels[d.category])
        : s.fileUpdated(name);
    }
    case "file_removed":
      return d.audio_state
        ? s.audioRemoved(
            fr.catalog.audioStates[d.audio_state],
            quoted(d.name, fr.artistActivity.aFile),
          )
        : s.fileRemoved(quoted(d.name, fr.artistActivity.aFile));
    case "project_created":
      return s.projectCreated(quoted(d.title, fr.artistActivity.aProject));
    case "project_linked":
      return s.projectLinked(quoted(d.title, fr.artistActivity.aProject));
    default:
      return null;
  }
}

export async function listMasterActivity(
  masterId: string,
): Promise<{ entries: ActivityEntry[]; error: boolean }> {
  if (!catalogIdSchema.safeParse(masterId).success)
    return { entries: [], error: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select(
      "id, kind, created_at, project_id, detail, actor:people!activity_events_actor_person_id_fkey(first_name, last_name)",
    )
    .eq("master_id", masterId)
    .order("created_at", { ascending: false })
    .order("seq", { ascending: false })
    .limit(MASTER_ACTIVITY_LIMIT);
  if (error) {
    console.error("listMasterActivity:", error.message);
    return { entries: [], error: true };
  }

  const entries = (data ?? []).flatMap((row): ActivityEntry[] => {
    const parsed = detailSchema.safeParse(row.detail);
    const text = sentence(row.kind, parsed.success ? parsed.data : {});
    if (!text) return [];
    return [
      {
        id: row.id,
        createdAt: row.created_at,
        sentence: text,
        href: row.project_id ? routes.project(row.project_id) : null,
        actorName: row.actor
          ? personName(row.actor.first_name, row.actor.last_name)
          : "",
      },
    ];
  });
  return { entries, error: false };
}
