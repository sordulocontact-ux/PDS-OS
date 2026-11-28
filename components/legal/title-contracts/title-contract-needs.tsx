"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import {
  confirmAllTitleContractNeeds,
  confirmTitleContractNeeds,
} from "@/lib/legal/title-contracts-actions";
import {
  TITLE_CONTRACT_KINDS,
  tickedKinds,
  type TitleContractKind,
  type TitleContractNeeds,
} from "@/lib/legal/title-contracts-rules";

const fr = { legalDemarches };

/** The contracts confirmed for a title, as pills (« Production », …), or
 * « À confirmer » while nothing is. */
export function TitleContractKinds({ needs }: { needs: TitleContractNeeds }) {
  const t = fr.legalDemarches.titleContracts;
  if (!needs.confirmed)
    return <StatusBadge tone="warning">{t.toConfirm}</StatusBadge>;
  if (needs.kinds.length === 0)
    return <StatusBadge tone="neutral">{t.none}</StatusBadge>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {needs.kinds.map((kind) => (
        <li key={kind}>
          <StatusBadge tone="neutral">{t.kinds[kind]}</StatusBadge>
        </li>
      ))}
    </ul>
  );
}

/**
 * The contracts a collective's title needs (§ 3.4 of Ibé's 18/11/2026):
 * production (it carries the negotiated rate), image rights, publishing
 * (potential, to untick) and the beatmaker, all ticked while nothing is
 * confirmed; the Juridique confirms and it is recorded, then the pills and
 * « Modifier ». Whoever cannot confirm (the database decides again) only
 * reads. Drafting stays one contract per person: nothing is generated here.
 * `others`: the other live titles not confirmed yet; with some, « Confirmer
 * pour les N titres » records them too, as proposed (M8, 26/11/2026).
 */
export function TitleContractNeedsForm({
  projectId,
  titleId,
  needs,
  canConfirm,
  others = 0,
}: {
  projectId: string;
  titleId: string;
  needs: TitleContractNeeds;
  canConfirm: boolean;
  others?: number;
}) {
  const t = fr.legalDemarches.titleContracts;
  const [editing, setEditing] = useState(!needs.confirmed);
  const [ticked, setTicked] = useState<TitleContractKind[]>(() =>
    tickedKinds(needs),
  );
  const { pending, run } = useLegalAction();
  const router = useRouter();
  // A first confirmation opens the title's next step (règle 7, Sacha
  // 28/11/2026: one stayed on a finished page); a correction stays here.
  const confirmed = () => {
    setEditing(false);
    if (!needs.confirmed)
      router.push(`${routes.projectLegal(projectId)}?titre=${titleId}`);
  };

  if (!canConfirm || (needs.confirmed && !editing))
    return (
      <div className="flex flex-col items-start gap-4">
        <TitleContractKinds needs={needs} />
        {canConfirm && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            {t.edit}
          </Button>
        )}
      </div>
    );

  const toggle = (kind: TitleContractKind, on: boolean) =>
    setTicked((all) =>
      on ? [...all, kind] : all.filter((other) => other !== kind),
    );
  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label={t.groupLabel}
        className="flex flex-col gap-3"
      >
        {TITLE_CONTRACT_KINDS.map((kind) => (
          <CheckboxField
            key={kind}
            label={t.kinds[kind]}
            checked={ticked.includes(kind)}
            onChange={(on) => toggle(kind, on)}
          />
        ))}
      </div>
      {/* The main action first, on the left. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() =>
            run(
              () =>
                confirmTitleContractNeeds({
                  projectId,
                  titleId,
                  kinds: TITLE_CONTRACT_KINDS.filter((kind) =>
                    ticked.includes(kind),
                  ),
                }),
              confirmed,
            )
          }
        >
          {pending ? t.confirming : t.confirm}
        </Button>
        {!needs.confirmed && others > 0 && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  confirmAllTitleContractNeeds({
                    projectId,
                    titleId,
                    kinds: TITLE_CONTRACT_KINDS.filter((kind) =>
                      ticked.includes(kind),
                    ),
                  }),
                confirmed,
              )
            }
          >
            {t.confirmAll(others + 1)}
          </Button>
        )}
        {needs.confirmed && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setTicked(tickedKinds(needs));
              setEditing(false);
            }}
          >
            {t.cancel}
          </Button>
        )}
      </div>
    </div>
  );
}
