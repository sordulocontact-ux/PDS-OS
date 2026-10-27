"use client";

import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { qualifyLegalParty } from "@/lib/framing/actions/legal-parties";
import {
  DOCUMENT_STATUSES,
  REASONED_STATUSES,
  type DocumentStatus,
  type LegalPartyLine,
  type PartyRelation,
} from "@/lib/framing/legal-parties";
import { contracts } from "@/lib/i18n/fr/contracts";
import { framingGuide } from "@/lib/i18n/fr/framing-guide";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingGuide, framingIntel, contracts };

const NONE = "none";

/**
 * « Qualifier » one legal party (PROJ-BUG-03): its relation with PDS, the
 * document it needs (a person's choice among the ticket's five statuses),
 * the contract that proves « Existant », who follows it, and why when no
 * document is needed. Missing answers are said at submit, in red.
 */
export function PartyDialog({
  projectId,
  line,
  members,
  onClose,
}: {
  projectId: string;
  line: LegalPartyLine;
  members: Array<{ personId: string; name: string }>;
  onClose: () => void;
}) {
  const t = fr.framingIntel.parties;
  const d = line.decision;
  const { pending, run } = useFramingAction();
  const signed = line.contracts.filter((c) => c.status === "signed");
  const [status, setStatus] = useState<DocumentStatus | null>(
    (d?.document_status as DocumentStatus | undefined) ??
      line.suggestion?.status ??
      null,
  );
  const [relation, setRelation] = useState<string>(d?.relation ?? NONE);
  const [contractId, setContractId] = useState<string>(
    d?.contract_id ?? line.suggestion?.contract.id ?? NONE,
  );
  const [owner, setOwner] = useState<string>(d?.owner_person_id ?? NONE);
  const [note, setNote] = useState(d?.note ?? "");
  const [tried, setTried] = useState(false);

  const contract = line.contracts.find((c) => c.id === contractId) ?? null;
  const errors = {
    status: status ? undefined : t.statusRequired,
    contract:
      status === "existing" && contract?.status !== "signed"
        ? t.contractRequired
        : undefined,
    note:
      status && REASONED_STATUSES.includes(status) && !note.trim()
        ? t.noteRequired
        : undefined,
  };
  const shown = (error?: string) => (tried ? error : undefined);

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t.title(line.name)}
      description={line.roles.join(", ") || t.found(line.origins.join(", "))}
      closeLabel={fr.framingGuide.close}
    >
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
          if (!status || errors.contract || errors.note) return;
          run(
            () =>
              qualifyLegalParty(projectId, {
                key: line.key,
                relation:
                  relation === NONE ? null : (relation as PartyRelation),
                status,
                contractId: contractId === NONE ? null : contractId,
                ownerPersonId: owner === NONE ? null : owner,
                note,
              }),
            onClose,
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <ChoiceCards
            name="party-status"
            legend={t.statusLabel}
            required
            value={status}
            onChange={setStatus}
            choices={DOCUMENT_STATUSES.map((value) => ({
              value,
              label: t.statuses[value],
              hint:
                value === "existing" && signed.length === 0
                  ? t.noSignedContract
                  : t.statusHints[value],
              disabled: value === "existing" && signed.length === 0,
            }))}
          />
          <FieldError id="party-status-error">
            {shown(errors.status)}
          </FieldError>
        </div>

        {line.contracts.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="party-contract" required={status === "existing"}>
              {t.contractLabel}
            </Label>
            <OptionSelect
              id="party-contract"
              label={t.contractLabel}
              value={contractId}
              onChange={setContractId}
              options={{
                [NONE]: t.contractNone,
                ...Object.fromEntries(
                  line.contracts.map((c) => [
                    c.id,
                    `${c.title} · ${(fr.contracts.states as Record<string, string>)[c.status] ?? c.status}`,
                  ]),
                ),
              }}
            />
            <FieldError id="party-contract-error">
              {shown(errors.contract)}
            </FieldError>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="party-relation">{t.relationLabel}</Label>
            <OptionSelect
              id="party-relation"
              label={t.relationLabel}
              value={relation}
              onChange={setRelation}
              options={{ [NONE]: t.relationNone, ...t.relations }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="party-owner">{t.ownerLabel}</Label>
            <OptionSelect
              id="party-owner"
              label={t.ownerLabel}
              value={owner}
              onChange={setOwner}
              options={{
                [NONE]: t.ownerNone,
                ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
              }}
            />
          </div>
        </div>

        <TextareaField
          name="party-note"
          label={t.noteLabel}
          required={!!status && REASONED_STATUSES.includes(status)}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={shown(errors.note)}
          rows={2}
          maxLength={500}
        />

        <DialogFormActions
          pending={pending}
          submitLabel={t.save}
          onCancel={onClose}
        />
      </form>
    </FormDialog>
  );
}
