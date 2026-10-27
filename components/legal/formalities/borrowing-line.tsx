import Link from "next/link";

import { routes } from "@/lib/auth/redirects";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type { TitleFormality } from "@/lib/legal/formalities/types";

import { FieldStateLine } from "./field-state";

const fr = { legalClearance, legalFormalities };

const SECURED = ["cleared", "abandoned"];

/** « Œuvre préexistante » in « 1. Œuvre » (JUR-02): what the title takes of
 * an existing work and whether it is authorised — without authorisation,
 * no declaration; it is secured in its own démarche. */
export function BorrowingLine({
  projectId,
  borrowings,
}: {
  projectId: string;
  borrowings: TitleFormality["borrowings"];
}) {
  const t = fr.legalFormalities.page;
  const open = borrowings.some((b) => !SECURED.includes(b.status));
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
      <FieldStateLine
        state={open ? "missing" : "confirmed"}
        label={t.borrowings}
        reason={
          borrowings.length === 0
            ? t.noBorrowing
            : borrowings
                .map(
                  (b) =>
                    `« ${b.work} » · ${fr.legalClearance.statuses[b.status]}`,
                )
                .join(" · ")
        }
      />
      {open && (
        <Link
          href={routes.projectLegalStep(projectId, "clearances")}
          className="self-start text-sm underline underline-offset-4"
        >
          {t.openClearances}
        </Link>
      )}
    </div>
  );
}
