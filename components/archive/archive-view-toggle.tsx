import { ViewToggle } from "@/components/ui/view-toggle";
import { fr } from "@/lib/i18n/fr";

// Live rows or the archive, on a list page (director only), in the URL
// (?view=archived). `params`: the page's other filters, kept on both views.
export function ArchiveViewToggle({
  path,
  archived,
  params,
}: {
  path: string;
  archived: boolean;
  params?: Record<string, string>;
}) {
  const t = fr.records.view;
  const href = (archivedView: boolean) => {
    const query = new URLSearchParams(params);
    if (archivedView) query.set("view", "archived");
    const search = query.toString();
    return search ? `${path}?${search}` : path;
  };
  return (
    <ViewToggle
      label={t.label}
      options={[
        { href: href(false), label: t.live, current: !archived },
        { href: href(true), label: t.archived, current: archived },
      ]}
    />
  );
}
