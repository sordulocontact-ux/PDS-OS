import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import type { ChecklistItem } from "@/lib/catalog/master/overview";
import { fr } from "@/lib/i18n/fr";
import { checklistTone } from "@/lib/ui/state-tones";

// What the master's file still needs, each line opening the tab where it is
// completed, listed without frame nor rules (it sits on a card). States
// computed by code (masterChecklist).
export function MasterChecklist({ items }: { items: ChecklistItem[] }) {
  const t = fr.masterPage.overview.checklist;
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li
          key={item.key}
          className="relative flex min-h-11 items-center justify-between gap-3 py-1.5"
        >
          {item.href ? (
            <Link
              href={item.href}
              className="min-w-0 text-sm font-medium no-underline outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="min-w-0 text-sm font-medium">{item.label}</span>
          )}
          <StatusBadge tone={checklistTone(item.done)} size="sm">
            {item.done ? t.done : t.todo}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}
