"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useEffect, useState } from "react";

import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { qualifyLegalParty } from "@/lib/framing/actions/legal-parties";
import {
  DOCUMENT_STATUSES,
  REASONED_STATUSES,
  type DocumentStatus,
  type LegalPartyLine,
  type PartyRelation,
} from "@/lib/framing/legal-parties";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel };

const NONE = "none";
// How long « ✓ Qualifié · … » stays under the party.
const DONE_MS = 8000;

/**
 * One legal party qualified in its line (PROJ-BUG-03; proto « Qualifier
 * les parties », Sacha 10/11/2026): the document it needs as one grey
 * segmented choice, saved at the click — no window per person. « Existant »
 * is offered only with a signed contract of Contrats, which proves it;
 * « Non nécessaire » and « Non applicable » open « Pourquoi » under the line
 * and save with the reason only. The relation with PDS and who follows,
 * optional, are given after, from a link under the line. Still one decision
 * by a person for each party, never deduced from a role.
 */
export function PartyChoice({
  projectId,
  line,
  members,
}: {
  projectId: string;
  line: LegalPartyLine;
  members: Array<{ personId: string; name: string }>;
}) {
  const t = fr.framingIntel.parties;
  const d = line.decision;
  const saved = (d?.document_status as DocumentStatus | undefined) ?? null;
  const signed = line.contracts.filter((c) => c.status === "signed");
  const { pending, run } = useFramingAction();
  // A choice that waits for its reason before it is saved.
  const [reasoned, setReasoned] = useState<DocumentStatus | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [more, setMore] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(null), DONE_MS);
    return () => clearTimeout(timer);
  }, [done]);

  const contractFor = (status: DocumentStatus) =>
    status === "existing"
      ? ((signed.find((c) => c.id === d?.contract_id) ?? signed[0])?.id ?? null)
      : (d?.contract_id ?? line.suggestion?.contract.id ?? null);
  const save = (
    status: DocumentStatus,
    said: string,
    patch: { relation?: string; owner?: string; note?: string } = {},
  ) => {
    const relation = patch.relation ?? d?.relation ?? NONE;
    const owner = patch.owner ?? d?.owner_person_id ?? NONE;
    run(
      () =>
        qualifyLegalParty(projectId, {
          key: line.key,
          relation: relation === NONE ? null : (relation as PartyRelation),
          status,
          contractId: contractFor(status),
          ownerPersonId: owner === NONE ? null : owner,
          note: REASONED_STATUSES.includes(status)
            ? (patch.note ?? d?.note ?? "")
            : "",
        }),
      () => {
        setReasoned(null);
        setTried(false);
        setDone(said);
      },
    );
  };
  const pick = (status: DocumentStatus | null) => {
    if (!status) return;
    setDone(null);
    if (REASONED_STATUSES.includes(status)) {
      setReasoned(status);
      setNote(saved === status ? (d?.note ?? "") : "");
      setTried(false);
      return;
    }
    setReasoned(null);
    if (status !== saved) save(status, t.qualified(t.statuses[status]));
  };
  const noteError = tried && !note.trim() ? t.noteRequired : undefined;
  const statuses = DOCUMENT_STATUSES.filter(
    (s) => s !== "existing" || signed.length > 0,
  );

  return (
    <div
      className="flex flex-col gap-2.5 modern:gap-2"
      aria-busy={pending || undefined}
    >
      <SegmentedControl<DocumentStatus>
        aria-label={t.statusFor(line.name)}
        options={statuses.map((value) => ({
          value,
          label: t.statuses[value],
        }))}
        value={reasoned ?? saved}
        onChange={pick}
      />
      {reasoned && (
        <form
          className="flex flex-col gap-3 rounded-xl bg-[var(--surface-soft)] p-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (!note.trim()) return;
            save(reasoned, t.qualified(t.statuses[reasoned]), { note });
          }}
        >
          <TextareaField
            name={`party-note-${line.key}`}
            label={t.noteLabel}
            hint={t.statusHints[reasoned]}
            required
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={noteError}
            rows={2}
            maxLength={500}
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {t.saveReason}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setReasoned(null)}
            >
              {fr.framingIntel.guide.cancel}
            </Button>
          </div>
        </form>
      )}
      {done && (
        <p
          role="status"
          className="flex items-center gap-1.5 text-caption font-semibold text-[color:var(--tone-success-fg)]"
        >
          <IconCheck aria-hidden className="size-4 shrink-0" />
          {done}
        </p>
      )}
      {saved &&
        !reasoned &&
        (more ? (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`party-relation-${line.key}`}
                className="text-caption text-[color:var(--text-secondary)]"
              >
                {t.relationLabel}
              </label>
              <OptionSelect
                id={`party-relation-${line.key}`}
                label={t.relationLabel}
                value={d?.relation ?? NONE}
                disabled={pending}
                onChange={(relation) =>
                  save(saved, t.detailsSaved, { relation })
                }
                options={{ [NONE]: t.relationNone, ...t.relations }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`party-owner-${line.key}`}
                className="text-caption text-[color:var(--text-secondary)]"
              >
                {t.ownerLabel}
              </label>
              <OptionSelect
                id={`party-owner-${line.key}`}
                label={t.ownerLabel}
                value={d?.owner_person_id ?? NONE}
                disabled={pending}
                onChange={(owner) => save(saved, t.detailsSaved, { owner })}
                options={{
                  [NONE]: t.ownerNone,
                  ...Object.fromEntries(
                    members.map((m) => [m.personId, m.name]),
                  ),
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setMore(false)}
            >
              {t.closeDetails}
            </Button>
          </div>
        ) : (
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-expanded={false}
              onClick={() => setMore(true)}
            >
              {d?.relation || d?.owner_person_id ? t.editDetails : t.addDetails}
            </Button>
          </div>
        ))}
    </div>
  );
}
