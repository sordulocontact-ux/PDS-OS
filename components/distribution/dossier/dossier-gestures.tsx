"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  decideDossier,
  prepareNextDossier,
  submitDossier,
} from "@/lib/distribution/dossier-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.distributionJourney.dossier;

/** « Soumettre la Vn à Claire Morel »: refused in words while the
 * Préparation blocks (the server checks with the same rule). */
export function SubmitDossier({
  projectId,
  number,
  validator,
  blocked,
}: {
  projectId: string;
  number: number;
  validator: string;
  // The Préparation blocks: said at the click, never a disabled button.
  blocked: boolean;
}) {
  const [refusal, setRefusal] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(
    () => {},
    t.submitted(number, validator),
  );
  return (
    <div className="flex flex-col gap-2.5">
      <FormMessage kind="error">{refusal ?? error}</FormMessage>
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.submitNote(validator)}
      </p>
      <div>
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            if (blocked) return setRefusal(t.notReady);
            setRefusal(null);
            run(() => submitDossier({ projectId, number, validator }));
          }}
        >
          {t.submit(number, validator)}
        </Button>
      </div>
    </div>
  );
}

/** The validator decides on the evidence: « Valider la Vn » or refuse with
 * a reason that comes back in head of the owner's step. */
export function DecideDossier({
  projectId,
  versionId,
  number,
  owner,
}: {
  projectId: string;
  versionId: string;
  number: number;
  owner: string;
}) {
  return (
    <DecisionPanel
      id="dossier-decision"
      title={null}
      commentLabel={t.reason}
      commentHint={t.reasonHint(owner)}
      outcomes={[
        { kind: "approve", label: t.approve(number), done: t.approved(number) },
        { kind: "refuse", label: t.refuse, done: t.refused(number, owner) },
      ]}
      onDecide={(kind, comment) =>
        decideDossier({
          projectId,
          versionId,
          number,
          approve: kind === "approve",
          note: comment,
          owner,
        })
      }
    />
  );
}

/** « Préparer la Vn » after a correction at the source (CA13). */
export function PrepareNext({
  projectId,
  number,
  proposal,
}: {
  projectId: string;
  number: number;
  proposal: string;
}) {
  const [note, setNote] = useState(proposal);
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {}, t.prepared(number));
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
        {t.prepareBody(number - 1)}
      </p>
      <TextareaField
        name="prepare-note"
        label={t.prepareNote}
        required
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={missing ? t.prepareNoteRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            const lacking = !note.trim();
            setMissing(lacking);
            if (!lacking)
              run(() =>
                prepareNextDossier({ projectId, number, note: note.trim() }),
              );
          }}
        >
          {t.prepare(number)}
        </Button>
      </div>
    </div>
  );
}
