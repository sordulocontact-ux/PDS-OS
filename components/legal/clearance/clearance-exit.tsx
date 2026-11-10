"use client";

import { legalClearance } from "@/lib/i18n/fr/legal-clearance";
import { isClosed } from "@/lib/legal/clearance/matrix";
import type { Clearance } from "@/lib/legal/clearance/types";

import { isAskMoment } from "./clearance-stages";
import { NothingToSecureButton } from "./nothing-to-secure-button";
import { WithdrawButton } from "./withdraw-button";

const fr = { legalClearance };

/**
 * « Autre issue » of an open authorisation: nothing to secure (before
 * asking), or the element withdrawn from the title. Rare and final, so last
 * of the panel, after who answers for it and the exchanges (Sacha,
 * 09/11/2026: « cette partie est vraiment moche »), one quiet row.
 */
export function ClearanceExit({
  projectId,
  clearance,
}: {
  projectId: string;
  clearance: Clearance;
}) {
  if (isClosed(clearance.status)) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {fr.legalClearance.stages.other}
      </span>
      {isAskMoment(clearance.status) && (
        <NothingToSecureButton projectId={projectId} clearance={clearance} />
      )}
      <WithdrawButton projectId={projectId} clearanceId={clearance.id} />
    </div>
  );
}
