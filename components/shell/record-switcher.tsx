"use client";

import { usePathname } from "next/navigation";

import { SwitcherMenu } from "@/components/shell/switcher-menu";
import type { SwitcherKind } from "@/lib/shell/switcher";
import { loadRecordSwitcher } from "@/lib/shell/switcher-actions";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

/**
 * The name of a record opened from a list, in the page's top band, opening
 * the others of its list (Sacha 24/11/2026: « on peut changer de budget,
 * deal, contrat… »). `base`: the record's own address when its page has
 * tabs (an artist, a title): the other one opens on the same tab.
 */
export function RecordSwitcher({
  kind,
  id,
  name,
  allHref,
  base,
}: {
  kind: SwitcherKind;
  id: string;
  name: string;
  allHref: string;
  base?: string;
}) {
  const pathname = usePathname();
  const t = fr.shell.topbar.switcher;
  const rest =
    base && pathname.startsWith(base) ? pathname.slice(base.length) : "";
  return (
    <SwitcherMenu
      name={name}
      currentId={id}
      variant="bar"
      allHref={allHref}
      load={async () =>
        (await loadRecordSwitcher(kind)).map((item) => ({
          ...item,
          href: `${item.href}${rest}`,
        }))
      }
      labels={{
        open: t.open(name),
        search: t.search[kind],
        placeholder: t.placeholder,
        noResult: t.noResult,
        loading: t.loading,
        error: t.error,
        all: t.all[kind],
      }}
    />
  );
}
