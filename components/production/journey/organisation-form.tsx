"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  HolderSelect,
  holderValue,
} from "@/components/production/holder-select";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { productionOrganization } from "@/lib/i18n/fr/production-organization";
import { organizeProduction } from "@/lib/production/organization-actions";
import type { OrganizationKind } from "@/lib/production/organization";
import type { Holder, NetworkOption } from "@/lib/production/sheet";

const fr = { productionOrganization };

const t = fr.productionOrganization;
const NOBODY = "none";

/**
 * « Qui produit ? » (Ibé, 14/10): internal or external, then the roles —
 * prefilled with what the project knows, changeable — and « Lancer ». The
 * owner only; the next step opens once saved.
 */
export function OrganisationForm({
  projectId,
  deliverableId,
  current,
  members,
  contacts,
  defaultValidatorId,
  nextHref,
}: {
  projectId: string;
  deliverableId: string;
  current: {
    kind: OrganizationKind | null;
    companyId: string | null;
    lineProducerId: string | null;
    validatorId: string | null;
    director: Holder | null;
    dop: Holder | null;
  };
  members: Member[];
  contacts: NetworkOption[];
  defaultValidatorId: string | null;
  nextHref: Record<OrganizationKind, string>;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<OrganizationKind | null>(current.kind);
  const [company, setCompany] = useState(
    current.companyId ? `contact:${current.companyId}` : "",
  );
  const [director, setDirector] = useState(holderValue(current.director));
  const [dop, setDop] = useState(holderValue(current.dop));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, error, run } = useWriteSubmit(
    () => kind && router.push(nextHref[kind]),
    current.kind ? t.saved : t.launched,
  );
  // Production companies of the Réseau first.
  const companies = [...contacts].sort(
    (a, b) =>
      Number(b.roles.includes("production_company")) -
      Number(a.roles.includes("production_company")),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const validator = String(data.get("validator") ?? "");
    const producer = String(data.get("lineProducer") ?? "");
    const next: Record<string, string> = {};
    if (!kind) next.kind = t.errors.kind;
    if (kind === "external" && !company) next.company = t.errors.company;
    if (!validator) next.validator = t.errors.validator;
    setErrors(next);
    if (Object.keys(next).length > 0 || !kind) return;
    run(() =>
      organizeProduction({
        projectId,
        deliverableId,
        organization: kind,
        companyContactId:
          kind === "external" ? company.replace("contact:", "") : null,
        lineProducerPersonId: producer && producer !== NOBODY ? producer : null,
        quoteValidatorPersonId: validator,
        director,
        dop: kind === "internal" ? dop : "",
      }),
    );
  }

  const count = Object.keys(errors).length;
  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={submit}>
      <ChoiceCards<OrganizationKind>
        name="organization"
        legend={t.legend}
        required
        columns={2}
        value={kind}
        onChange={setKind}
        choices={(["internal", "external"] as const).map((k) => ({
          value: k,
          label: t.kinds[k].label,
          hint: t.kinds[k].body,
        }))}
      />
      {errors.kind && <FormMessage kind="error">{errors.kind}</FormMessage>}
      {kind && (
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-1 text-sm font-medium">{t.roles}</legend>
          <p className="text-sm text-muted-foreground">{t.rolesHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {kind === "external" && (
              <HolderSelect
                id="org-company"
                label={t.fields.company}
                noneLabel={t.fields.nobody}
                value={company}
                members={[]}
                contacts={companies}
                onChange={setCompany}
                hint={t.fields.companyHint}
                required
                error={errors.company}
              />
            )}
            <OptionSelect
              id="org-producer"
              name="lineProducer"
              label={t.fields.lineProducer}
              hint={t.fields.lineProducerHint}
              items={{
                [NOBODY]: t.fields.lineProducerNone,
                ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
              }}
              defaultValue={current.lineProducerId ?? NOBODY}
            />
            <OptionSelect
              id="org-validator"
              name="validator"
              label={t.fields.validator}
              hint={t.fields.validatorHint}
              required
              items={Object.fromEntries(
                members.map((m) => [m.personId, m.name]),
              )}
              defaultValue={current.validatorId ?? defaultValidatorId}
              error={errors.validator}
            />
            <HolderSelect
              id="org-director"
              label={t.fields.director}
              noneLabel={t.fields.nobody}
              value={director}
              current={current.director}
              members={members}
              contacts={contacts}
              onChange={setDirector}
              hint={t.fields.directorHint}
            />
            {kind === "internal" && (
              <HolderSelect
                id="org-dop"
                label={t.fields.dop}
                noneLabel={t.fields.nobody}
                value={dop}
                current={current.dop}
                members={members}
                contacts={contacts}
                onChange={setDop}
                hint={t.fields.dopHint}
              />
            )}
          </div>
        </fieldset>
      )}
      {count > 0 && !errors.kind && (
        <FormMessage kind="error">{t.errors.missing(count)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {current.kind ? t.save : kind ? t.launch[kind] : t.launch.internal}
        </Button>
      </div>
    </form>
  );
}
