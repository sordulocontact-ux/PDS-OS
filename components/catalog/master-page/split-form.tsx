"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import {
  SPLIT_ROLES_OF_KIND,
  formatShare,
  type MasterSplit,
  type SplitKind,
} from "@/lib/catalog/master/rules";
import { saveSplit } from "@/lib/catalog/master/rights-actions";
import { masterPage } from "@/lib/i18n/fr/master-page";

import { MasterForm } from "./master-form";
import { SplitPartyField } from "./split-party-field";

const fr = { masterPage };

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
  // The section it was opened from fixes the kind (retour 49): never asked
  // again, so a share of the publishing cannot land in the master.
  const fixedKind = split?.kind ?? kind;
  const roles = Object.fromEntries(
    SPLIT_ROLES_OF_KIND[fixedKind].map((role) => [role, t.roles[role]]),
  );
  return (
    <MasterForm
      action={saveSplit}
      defaults={defaults}
      hidden={{ masterId, itemId: split?.id, kind: fixedKind }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          <SplitPartyField
            masterId={masterId}
            kind={fixedKind}
            role={split?.role ?? (kind === "master" ? "label" : "author")}
            split={split}
            defaultName={value("party", split?.party) || null}
            error={error("party")}
          />
          <OptionSelect
            name="role"
            label={t.fields.role}
            required
            items={roles}
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
