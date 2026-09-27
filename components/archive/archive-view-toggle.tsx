import { ViewToggle } from "@/components/ui/view-toggle";
import { fr } from "@/lib/i18n/fr";

// Live rows or the archive, on a list page (director only), in the URL
// (?view=archived).
export function ArchiveViewToggle({
  path,
  archived,
}: {
  path: string;
  archived: boolean;
}) {
  const t = fr.records.view;
  return (
    <ViewToggle
      label={t.label}
      options={[
        { href: path, label: t.live, current: !archived },
        { href: `${path}?view=archived`, label: t.archived, current: archived },
      ]}
    />
  );
}
