"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { saveContributor } from "@/lib/catalog/master/item-actions";
import type {
  ContributorRole,
  MasterContributor,
} from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { ContributorPersonField } from "./contributor-person-field";
import { MasterForm } from "./master-form";

export function ContributorForm({
  masterId,
  titles,
  contributor,
  initial,
  defaults,
  onDone,
  onCancel,
}: {
  // The credited title (preselected when `titles` is given).
  masterId: string;
  // Opened outside the title page (a project's Juridique): with several
  // titles, the first field chooses which one is credited.
  titles?: Array<{ id: string; title: string }>;
  contributor: MasterContributor | null;
  // A new credit already filled (the Master: the role to credit, and the
  // engineer confirmed at the Cadrage, already linked, or named in a session).
  initial?: {
    name: string | null;
    role: ContributorRole;
    contactId?: string | null;
  };
  // Values proposed by PO, by field name.
  defaults?: Record<string, string>;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const t = fr.masterPage.credits;
  const chooseTitle = titles !== undefined && titles.length > 1;
  return (
    <MasterForm
      action={saveContributor}
      defaults={defaults}
      hidden={{
        masterId: chooseTitle ? undefined : masterId,
        itemId: contributor?.id,
      }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => (
        <>
          {chooseTitle && (
            <OptionSelect
              name="masterId"
              label={t.fields.master}
              required
              items={Object.fromEntries(titles.map((m) => [m.id, m.title]))}
              defaultValue={value("masterId", masterId)}
            />
          )}
          <ContributorPersonField
            defaultName={
              value("name", contributor?.name ?? initial?.name) || null
            }
            defaultContactId={
              contributor ? contributor.contactId : (initial?.contactId ?? null)
            }
            role={contributor?.role ?? initial?.role ?? "composer"}
            error={error("name")}
          />
          <OptionSelect
            name="role"
            label={t.fields.role}
            required
            items={t.roles}
            defaultValue={value(
              "role",
              contributor?.role ?? initial?.role ?? "composer",
            )}
            error={error("role")}
          />
          <Field
            name="detail"
            label={t.fields.detail}
            hint={t.fields.detailHint}
            autoComplete="off"
            maxLength={200}
            defaultValue={value("detail", contributor?.detail)}
            error={error("detail")}
          />
        </>
      )}
    </MasterForm>
  );
}
