import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import { isBlocking } from "@/lib/legal/contracts/completeness";
import type { AgreementField } from "@/lib/legal/contracts/mapping";
import { contractValueTone } from "@/lib/ui/state-tones";

/**
 * The completeness checklist of a contract (JUR-16): every value its
 * template asks, with its state (filled, to check, not applicable, waiting
 * for the fiche, invalid, missing), whether it is required, where it comes
 * from, who provides it and, when it blocks, the link to where it is fixed.
 * Recomputed by the server at every change (`ProjectLive`).
 */
export function ContractValueList({
  fields,
  personName,
  fixHref,
}: {
  fields: AgreementField[];
  personName: string;
  fixHref?: (field: AgreementField) => string | null;
}) {
  const t = fr.legalContracts;
  const c = t.checklist;
  return (
    <ul className="flex flex-col divide-y">
      {fields.map((field) => {
        const href = isBlocking(field.status) ? fixHref?.(field) : null;
        const hint = c.statusHint[field.status];
        return (
          <li
            key={field.id}
            className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm text-muted-foreground">
                {field.label}
                {" · "}
                {field.required ? c.required : c.optional}
              </span>
              <span className="font-medium break-words">
                {field.value ?? t.fillIn[field.home]}
              </span>
              {hint && (
                <span className="text-sm text-muted-foreground">{hint}</span>
              )}
            </span>
            <span className="flex shrink-0 flex-col gap-1 sm:items-end">
              <StatusBadge tone={contractValueTone[field.status]} size="sm">
                {c.status[field.status]}
              </StatusBadge>
              {field.source && (
                <span className="text-sm text-muted-foreground">
                  {t.sources[field.source]}
                </span>
              )}
              {isBlocking(field.status) && (
                <span className="text-sm text-muted-foreground">
                  {field.provider === "person"
                    ? c.provider.person(personName)
                    : c.provider[field.provider]}
                </span>
              )}
              {href && (
                <Link
                  href={href}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {c.fix}
                </Link>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
