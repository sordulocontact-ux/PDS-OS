"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import {
  creditRolesOf,
  engineerToChoose,
  type ContributorGroup,
} from "@/lib/catalog/master/contributor-groups";
import { saveContributor } from "@/lib/catalog/master/item-actions";
import {
  CONTRIBUTOR_ROLES,
  type ContributorRole,
} from "@/lib/catalog/master/rules";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { NetworkPersonOption } from "@/lib/network/people-actions";

import { ContributorPersonField } from "./contributor-person-field";
import { MasterForm } from "./master-form";

const fr = { masterPage };

const isRole = (value: unknown): value is ContributorRole =>
  (CONTRIBUTOR_ROLES as readonly unknown[]).includes(value);

// The roles sent back after a refused save (a JSON list), else none.
function parseRoles(raw: string): ContributorRole[] {
  try {
    const list: unknown = JSON.parse(raw || "[]");
    return Array.isArray(list) ? list.filter(isRole) : [];
  } catch {
    return [];
  }
}

/**
 * A person credited on a title, with all their roles at once (UX test of
 * 09/10/2026: « 2 crédits pour une autrice-compositrice »). Picking someone
 * of the Réseau fills the roles their fiche says, still to correct; an
 * engineer's role is left to choose (recording, mixing or mastering).
 */
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
  // The person edited, with their rows on the title.
  contributor: ContributorGroup | null;
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
  const chooseTitle = titles !== undefined && titles.length > 1;
  return (
    <MasterForm
      action={saveContributor}
      defaults={defaults}
      hidden={{
        masterId: chooseTitle ? undefined : masterId,
        itemIds: contributor ? JSON.stringify(contributor.itemIds) : undefined,
      }}
      onDone={onDone}
      onCancel={onCancel}
    >
      {({ value, error }) => {
        // Sent back after a refusal, else the person edited, else one role
        // proposed (the Master, PO).
        const proposed = value("role", null);
        const roles = parseRoles(value("roles", null));
        const start = roles.length
          ? roles
          : (contributor?.roles ??
            (isRole(proposed) ? [proposed] : initial ? [initial.role] : []));
        return (
          <>
            {chooseTitle && (
              <OptionSelect
                name="masterId"
                label={fr.masterPage.credits.fields.master}
                required
                items={Object.fromEntries(titles.map((m) => [m.id, m.title]))}
                defaultValue={value("masterId", masterId)}
              />
            )}
            <ContributorFields
              defaultName={
                value("name", contributor?.name ?? initial?.name) || null
              }
              defaultContactId={
                contributor
                  ? contributor.contactId
                  : (initial?.contactId ?? null)
              }
              defaultRoles={start}
              defaultDetail={value("detail", contributor?.detail)}
              errors={{
                name: error("name"),
                roles: error("roles"),
                detail: error("detail"),
              }}
            />
          </>
        );
      }}
    </MasterForm>
  );
}

function ContributorFields({
  defaultName,
  defaultContactId,
  defaultRoles,
  defaultDetail,
  errors,
}: {
  defaultName: string | null;
  defaultContactId: string | null;
  defaultRoles: ContributorRole[];
  defaultDetail: string;
  errors: { name?: string; roles?: string; detail?: string };
}) {
  const t = fr.masterPage.credits;
  const [roles, setRoles] = useState<ContributorRole[]>(defaultRoles);
  // Where the roles come from: the person's fiche (replaced by the next
  // person picked), an engineer still to say which, or the user.
  const [origin, setOrigin] = useState<"network" | "engineer" | null>(null);

  const picked = (option: NetworkPersonOption | null) => {
    if (!option || (roles.length > 0 && origin !== "network")) return;
    const fromNetwork = creditRolesOf(option.roles);
    if (fromNetwork.length > 0) {
      setRoles(fromNetwork);
      setOrigin("network");
    } else if (engineerToChoose(option.roles)) {
      if (origin === "network") setRoles([]);
      setOrigin("engineer");
    }
  };

  return (
    <>
      <ContributorPersonField
        defaultName={defaultName}
        defaultContactId={defaultContactId}
        roles={roles}
        onPick={picked}
        error={errors.name}
      />
      <OptionSelect
        multiple
        name="roles"
        label={t.fields.roles}
        required
        placeholder={t.fields.rolesPlaceholder}
        items={t.roles}
        value={roles}
        onValueChange={(next) => {
          setRoles(next.filter(isRole));
          setOrigin(null);
        }}
        hint={
          origin === "network"
            ? t.fields.rolesFromNetwork
            : origin === "engineer"
              ? t.fields.rolesEngineer
              : undefined
        }
        error={errors.roles}
      />
      <Field
        name="detail"
        label={t.fields.detail}
        hint={t.fields.detailHint}
        autoComplete="off"
        maxLength={200}
        defaultValue={defaultDetail}
        error={errors.detail}
      />
    </>
  );
}
