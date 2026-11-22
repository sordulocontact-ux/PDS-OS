"use client";

import { IconSparkle3 } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyNote } from "@/components/shell/empty-state";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  generateDealContract,
  loadDealContractDraft,
  type DealContractDraft,
} from "@/lib/deals/contract-generate-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";

const t = dealMemos.contract;
const fr = { dialogs, legalContracts };

/** The template chosen, then each of its values, prefilled and correctable. */
function GenerateForm({
  dealId,
  draft,
  onDone,
}: {
  dealId: string;
  draft: DealContractDraft;
  onDone: () => void;
}) {
  // The deal's kind of contract, chosen at once (a dropdown: Sacha
  // 22/11/2026).
  const [templateId, setTemplateId] = useState<string | null>(
    draft.recommended,
  );
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(draft.values).map(([id, v]) => [id, v.value]),
    ),
  );
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.generated);
  const template = draft.templates.find((x) => x.id === templateId) ?? null;

  if (draft.templates.length === 0)
    return <EmptyNote>{t.noTemplate}</EmptyNote>;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (!template) return;
        const missing = template.fields.find((id) => !values[id]?.trim());
        if (missing) {
          document.getElementById(`deal-contract-${missing}`)?.focus();
          return;
        }
        run(() =>
          generateDealContract({
            dealId,
            templateId: template.id,
            fields: Object.fromEntries(
              template.fields.map((id) => {
                const known = draft.values[id];
                const value = values[id].trim();
                // The source stays the deal's only for the value it gave.
                const source =
                  known && known.value === value
                    ? (fr.legalContracts.sources[known.source] ?? "")
                    : "";
                return [id, { value, source }];
              }),
            ),
          }),
        );
      }}
    >
      <OptionSelect
        id="deal-contract-template"
        name="deal-contract-template"
        label={t.template}
        required
        items={Object.fromEntries(draft.templates.map((x) => [x.id, x.name]))}
        defaultValue={draft.recommended}
        onValueChange={setTemplateId}
        error={tried && !template ? t.template : undefined}
      />
      {template && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 text-sm font-medium">{t.values}</legend>
          {template.fields.map((id) => {
            const known = draft.values[id];
            const value = values[id] ?? "";
            return (
              <Field
                key={id}
                id={`deal-contract-${id}`}
                name={id}
                label={fr.legalContracts.fields[id] ?? id}
                required
                value={value}
                onChange={(event) =>
                  setValues((v) => ({ ...v, [id]: event.target.value }))
                }
                hint={
                  known && known.value === value
                    ? fr.legalContracts.sources[known.source]
                    : undefined
                }
                error={tried && !value.trim() ? t.missing : undefined}
              />
            );
          })}
        </fieldset>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.generate}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * « Générer le contrat » (Sacha 22/11/2026: « je voudrais que PDS OS puisse
 * créer le contrat »): a validated template of Contrats, its values filled
 * from the deal — the terms of its validated deal memo, its project and
 * artist, its label or brand — each shown with its source and correctable,
 * then the contract generated, the deal's at once (generate_deal_contract).
 */
export function DealContractGenerate({
  dealId,
  size = "sm",
}: {
  dealId: string;
  size?: "sm" | "lg";
}) {
  return (
    <LoadedFormButton
      label={t.generate}
      icon={IconSparkle3}
      size={size}
      title={t.generateTitle}
      description={t.generateDescription}
      closeLabel={fr.dialogs.close}
      load={() => loadDealContractDraft(dealId)}
    >
      {(draft, close) => (
        <GenerateForm dealId={dealId} draft={draft} onDone={close} />
      )}
    </LoadedFormButton>
  );
}
