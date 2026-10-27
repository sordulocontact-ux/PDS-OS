import { ViewToggle } from "@/components/ui/view-toggle";
import { records } from "@/lib/i18n/fr/records";
import { viewHref } from "@/lib/ui/view-href";

const fr = { records };

// Live rows or the archive as pills (director only), in the URL
// (?view=archived): the secondary filter of a list whose tabs are another
// axis (Artistes). `params`: the page's other filters, kept on both views.
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
  return (
    <ViewToggle
      label={t.label}
      options={[
        {
          href: viewHref(path, { ...params }),
          label: t.live,
          current: !archived,
        },
        {
          href: viewHref(path, { ...params, view: "archived" }),
          label: t.archived,
          current: archived,
        },
      ]}
    />
  );
}
