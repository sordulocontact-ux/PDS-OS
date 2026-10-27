import { StatusBadge } from "@/components/ui/status-badge";
import { shell } from "@/lib/i18n/fr/shell";
import { projectFormatLabel, type ProjectKind } from "@/lib/projects/labels";
import { projectTypeHue } from "@/lib/ui/category-hues";

const fr = { shell };

// Kind of a project in a list: the type in its hue, so Musical and Contenu
// read apart at a glance, then the format ("EP", "PDS Mic") as plain text.
export function ProjectKindBadge({ kind }: { kind: ProjectKind }) {
  const format = projectFormatLabel(kind);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <StatusBadge tone={projectTypeHue[kind.type]} size="sm">
        {fr.shell.projectTypes[kind.type]}
      </StatusBadge>
      {format}
    </span>
  );
}
