import { statusBadgeVariants } from "@/components/ui/status-badge";
import { notes } from "@/lib/i18n/fr/notes";
import { projectHue } from "@/lib/ui/category-hues";
import { cn } from "@/lib/utils";

const fr = { notes };

/** Where a written note belongs: its project in the hue it has everywhere
 * (as a call's, CallProjectPill), « Note de l'équipe » in slate without one. */
export function NoteProjectPill({
  projectId,
  title,
  size = "sm",
}: {
  projectId: string | null;
  title: string | null;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        statusBadgeVariants({ tone: projectHue(projectId), size }),
        "max-w-full",
      )}
    >
      <span className="truncate">
        {projectId && title ? title : fr.notes.teamNote}
      </span>
    </span>
  );
}
