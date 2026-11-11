import { StatusBadge } from "@/components/ui/status-badge";
import { shell } from "@/lib/i18n/fr/shell";
import { projectFormatLabel, type ProjectKind } from "@/lib/projects/labels";
import { projectCollectiveHue, projectTypeHue } from "@/lib/ui/category-hues";

const fr = { shell };

// Kind of a project in a list: the type in its hue, so Musical and Contenu
// read apart at a glance, then the format ("EP", "PDS Mic") as plain text,
// then « Projet collectif » for a collective.
export function ProjectKindBadge({
  kind,
  collective = false,
}: {
  kind: ProjectKind;
  collective?: boolean;
}) {
  const format = projectFormatLabel(kind);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusBadge tone={projectTypeHue[kind.type]} size="sm">
        {fr.shell.projectTypes[kind.type]}
      </StatusBadge>
      {format}
      {collective && (
        <StatusBadge tone={projectCollectiveHue} size="sm">
          {fr.shell.projectCollective}
        </StatusBadge>
      )}
    </span>
  );
}
