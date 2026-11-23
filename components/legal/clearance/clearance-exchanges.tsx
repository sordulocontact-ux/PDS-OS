"use client";

import { useState } from "react";

import { VersionCard } from "@/components/ui/version-card";
import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import type { Clearance } from "@/lib/legal/clearance/types";
import { cn } from "@/lib/utils";
import { formatInstant } from "@/lib/utils/instant";

const fr = { legalClearance };

// Beyond this, a text is cut to three lines with « Lire tout ».
const LONG = 240;

/**
 * « Échanges (n) » of an authorisation (Sacha, 08/11/2026: the journal
 * folded with no chevron, between the action and « Autre issue »): at the
 * bottom of the panel, a folded card (`VersionCard`, as every group that
 * folds: framed, the chevron on the left, the content inside), what was
 * sent and received, newest first — the request e-mailed (its proof), the
 * replies filed from PO's mailbox or pasted, the notes. Nothing when there is none.
 */
export function ClearanceExchanges({
  clearance,
  className,
}: {
  clearance: Clearance;
  className?: string;
}) {
  const t = fr.legalClearance;
  if (clearance.exchanges.length === 0) return null;
  return (
    <VersionCard
      title={t.exchanges.title(clearance.exchanges.length)}
      meta={t.exchanges.last(formatInstant(clearance.exchanges[0].at))}
      className={className}
    >
      <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)]">
        {clearance.exchanges.map((e) => (
          <li key={e.id} className="flex flex-col gap-1 py-3 first:pt-0">
            <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
              {[
                t.directions[e.direction as keyof typeof t.directions],
                e.kind === "email" ? t.kinds.email : null,
                e.from ?? e.by,
                formatInstant(e.at),
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <ExchangeText text={e.body} />
          </li>
        ))}
      </ul>
    </VersionCard>
  );
}

function ExchangeText({ text }: { text: string }) {
  const t = fr.legalClearance.exchanges;
  const long = text.length > LONG || text.split("\n").length > 3;
  const [open, setOpen] = useState(false);
  return (
    <>
      <span
        className={cn(
          "break-words whitespace-pre-wrap",
          long && !open && "line-clamp-3",
        )}
      >
        {text}
      </span>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="self-start text-[length:var(--type-body-sm)] font-medium underline-offset-4 hover:underline"
        >
          {open ? t.less : t.more}
        </button>
      )}
    </>
  );
}
