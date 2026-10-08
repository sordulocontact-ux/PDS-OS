"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import {
  formatShare,
  type MasterSplit,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import { saveSplit } from "@/lib/catalog/master/rights-actions";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";
import { SplitPartyField } from "./split-party-field";

const shareInput = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

export function SplitForm({
  masterId,
  split,
  kind,
  available,
  defaults,
  onDone,
  onCancel,
}: {
  masterId: string;
  split: MasterSplit | null;
  // Kind of a new share (the section it was added from).
  kind: SplitKind;
  // What the share may take, computed by the caller (remainder + its own).
  available: number;
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.splits;
  return (
    <MasterForm
      action={saveSplit}
      defaults={defaults}
      hidden={{ masterId, itemId: split?.id }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          <OptionSelect
            name="kind"
            label={t.fields.kind}
            required
            items={t.kinds}
            defaultValue={value("kind", split?.kind ?? kind)}
            error={error("kind")}
          />
          <SplitPartyField
            masterId={masterId}
            kind={split?.kind ?? kind}
            role={split?.role ?? (kind === "master" ? "label" : "author")}
            split={split}
            defaultName={value("party", split?.party) || null}
            error={error("party")}
          />
          <OptionSelect
            name="role"
            label={t.fields.role}
            required
            items={t.roles}
            defaultValue={value(
              "role",
              split?.role ?? (kind === "master" ? "label" : "author"),
            )}
            error={error("role")}
          />
          <Field
            name="share"
            label={t.fields.share}
            hint={t.fields.shareHint(formatShare(available))}
            required
            inputMode="decimal"
            autoComplete="off"
            maxLength={6}
            defaultValue={value(
              "share",
              split ? shareInput.format(split.share) : null,
            )}
            error={error("share")}
          />
        </>
      )}
    </MasterForm>
  );
}
