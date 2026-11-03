"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "@/components/ui/toast";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { createAgencySource } from "@/lib/activations/agency/source-actions";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { activations } from "@/lib/i18n/fr/activations";
import type { RankedPerson } from "@/lib/network/ranked-people";
import { listNetworkForRole } from "@/lib/network/role-people-actions";

const fr = { activations, activationAgency };

const t = fr.activationAgency.sources;
type Kind = "google_sheet" | "file" | "manual";

/** « Connecter une source » : a Google Sheets tab, a file deposited at each
 * refresh, or a manual entry ; the agency of the Réseau and its contact. */
export function SourceForm({
  projectId,
  activationId,
  onDone,
}: {
  projectId: string;
  activationId: string;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<Kind>("google_sheet");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const loadAgencies = usePickerLoad(() => listNetworkForRole(["agency"]));

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const label = String(data.get("label") ?? "").trim();
    const url = String(data.get("url") ?? "").trim();
    if (!label) return setError(fr.activationAgency.errors.sourceRequired);
    if (kind === "google_sheet" && !url)
      return setError(fr.activationAgency.errors.urlRequired);
    setError(null);
    startTransition(async () => {
      const result = await createAgencySource({
        projectId,
        activationId,
        label,
        kind,
        url,
        sheetGid: String(data.get("gid") ?? "").trim(),
        agencyContactId: String(data.get("agencyId") ?? "") || null,
        agencyPerson: String(data.get("person") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      toast.success(t.connected);
      onDone();
    });
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <ChoiceCards
        name="kind"
        legend={t.kind}
        required
        value={kind}
        onChange={setKind}
        choices={(["google_sheet", "file", "manual"] as const).map((k) => ({
          value: k,
          label: t.kinds[k],
        }))}
      />
      <Field
        name="label"
        label={t.label}
        hint={t.labelHint}
        required
        maxLength={120}
      />
      {kind === "google_sheet" && (
        <>
          <Field
            name="url"
            type="url"
            label={t.url}
            required
            placeholder="https://docs.google.com/spreadsheets/d/…"
          />
          <Field
            name="gid"
            label={t.gid}
            hint={t.gidHint}
            inputMode="numeric"
            maxLength={12}
          />
        </>
      )}
      <PersonPickerField<RankedPerson>
        refName="agencyId"
        nameName="agencyName"
        legend={t.agency}
        load={loadAgencies}
        defaultRef={null}
        defaultName={null}
        createRoles={["agency"]}
        createKind="organization"
        refOfContact={(id) => id}
        allowNameOnly={false}
        suggest={(o) => o.group !== "network"}
      />
      <Field name="person" label={t.person} maxLength={200} />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.add}
        </Button>
      </div>
    </form>
  );
}
