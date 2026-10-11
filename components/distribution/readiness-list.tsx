import Link from "next/link";

import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  isReady,
  SOURCE_MODULES,
  type ReadinessItem,
} from "@/lib/distribution/readiness";
import { fr } from "@/lib/i18n/fr";
import { formatShortDate } from "@/lib/release/format";
import { distributionSourceTone } from "@/lib/ui/state-tones";

const t = fr.distribution.readiness;

/**
 * The checklist of the Préparation, one card per source module (ticket
 * § 12: « classée par module source, avec accès direct au bon écran de
 * correction »). Each line says what the source holds, how it is validated
 * there and when it changed; « Corriger » opens the owner module.
 */
export function ReadinessList({ items }: { items: ReadinessItem[] }) {
  return (
    <div className="grid gap-6">
      {SOURCE_MODULES.map((module) => {
        const rows = items.filter((item) => item.module === module);
        if (rows.length === 0) return null;
        return (
          <PageSection
            key={module}
            id={`source-${module}`}
            title={fr.distribution.modules[module]}
            description={t.moduleNotes[module]}
            card
          >
            <ul className="flex flex-col gap-4">
              {rows.map((item) => (
                <ReadinessRow key={item.key} item={item} />
              ))}
            </ul>
          </PageSection>
        );
      })}
    </div>
  );
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const ready = isReady(item) || item.state === "restricted";
  const meta = [
    item.validation,
    item.updatedAt ? t.updated(formatShortDate(item.updatedAt)) : null,
    !item.blocking && !isReady(item) && item.state !== "restricted"
      ? t.nonBlocking
      : null,
  ].filter(Boolean);
  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="grid min-w-0 gap-0.5">
        <p className="font-medium break-words">
          {item.label}
          {item.subject && (
            <span className="text-muted-foreground"> · {item.subject}</span>
          )}
        </p>
        <p className="text-sm break-words text-muted-foreground">
          {item.detail}
        </p>
        {meta.length > 0 && (
          <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge
          tone={distributionSourceTone(item.state, item.blocking)}
          size="sm"
        >
          {t.states[item.state]}
        </StatusBadge>
        <Link
          href={item.href}
          className={buttonVariants({
            variant: ready ? "ghost" : "outline",
            size: "sm",
          })}
        >
          {ready ? t.see : t.open}
        </Link>
      </div>
    </li>
  );
}
