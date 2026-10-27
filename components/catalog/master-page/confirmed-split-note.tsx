"use client";

import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { adoptConfirmedSplit } from "@/lib/catalog/master/adopt-split-actions";
import type { MasterSplit } from "@/lib/catalog/master/rules";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { formatShare } from "@/lib/legal/splits/shares";
import type { ConfirmedSplit } from "@/lib/legal/splits/title-split";

const fr = { legalSplits, masterPage };

/** The Juridique's confirmed publishing split on the title's page, and
 * « Reprendre ces parts » when the title's own differ. */
export function ConfirmedSplitNote({
  masterId,
  confirmed,
  current,
  canEdit,
}: {
  masterId: string;
  confirmed: ConfirmedSplit;
  current: MasterSplit[];
  canEdit: boolean;
}) {
  const t = fr.masterPage.splits.confirmed;
  const { pending, run } = useLegalAction();
  const key = (name: string, share: number) =>
    `${name.trim().toLowerCase()}|${share.toFixed(2)}`;
  const mine = new Set(current.map((s) => key(s.party, s.share)));
  const same =
    current.length === confirmed.lines.length &&
    confirmed.lines.every((l) =>
      mine.has(key(l.name, Math.round(l.units / 100) / 100)),
    );
  return (
    <ToneCallout tone="success" contentClassName="flex flex-col gap-2">
      <span>
        {t.title(confirmed.projectTitle, confirmed.version)}{" "}
        {same ? t.same : t.differs}
      </span>
      <span className="text-sm">
        {confirmed.lines
          .map(
            (l) =>
              `${l.name} · ${fr.legalSplits.roles[l.role]} · ${formatShare(l.units)}`,
          )
          .join(" — ")}
      </span>
      {canEdit && !same && (
        <span className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => adoptConfirmedSplit(masterId))}
          >
            {pending ? t.adopting : t.adopt}
          </Button>
          <span className="text-sm">{t.rounded}</span>
        </span>
      )}
    </ToneCallout>
  );
}
