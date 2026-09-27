import type { ActivityEvent } from "@/lib/catalog/activity-types";
import { fr } from "@/lib/i18n/fr";

// One sentence per event, from what the trigger copied at the time.
export function activitySentence(event: ActivityEvent): string {
  const t = fr.artistActivity;
  const s = t.sentences;
  const d = event.detail;
  const title = t.quoted(
    d.title && d.version ? `${d.title} (${d.version})` : d.title,
    event.kind.startsWith("master") ? t.aMaster : t.aProject,
  );
  const assignee = d.assignee || t.someone;
  const name = (fallback: string) => t.quoted(d.name, fallback);
  const relations = fr.catalog.relation.labels;

  switch (event.kind) {
    case "artist_created":
      return d.relation
        ? s.artistCreatedAs(relations[d.relation])
        : s.artistCreated;
    case "artist_updated": {
      const fields = (d.fields ?? []).map((f) =>
        f === "relation" && d.relation
          ? s.relationNow(t.fields[f], relations[d.relation])
          : t.fields[f],
      );
      return fields.length > 0
        ? s.artistUpdated(joinFr(fields))
        : s.artistUpdatedNoField;
    }
    case "contact_added":
      return s.contactAdded(name(t.aContact));
    case "contact_updated":
      return s.contactUpdated(name(t.aContact));
    case "contact_removed":
      return s.contactRemoved(name(t.aContact));
    case "file_added":
      return s.fileAdded(name(t.aFile));
    case "file_removed":
      return s.fileRemoved(name(t.aFile));
    case "master_created":
      return s.masterCreated(title);
    case "master_credited":
      return s.masterCredited(title);
    case "project_created":
      return s.projectCreated(title);
    case "project_linked":
      return s.projectLinked(title);
    case "project_transmitted":
      return s.projectTransmitted(title, assignee);
    case "project_accepted":
      return s.projectAccepted(title);
    case "project_refused":
      return s.projectRefused(title);
    case "project_clarification_requested":
      return s.projectClarification(title);
  }
}

const listFormat = new Intl.ListFormat("fr-FR", {
  style: "long",
  type: "conjunction",
});

function joinFr(items: string[]): string {
  return listFormat.format(items);
}
