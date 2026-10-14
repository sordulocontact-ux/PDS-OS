"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { HolderSelect } from "@/components/production/holder-select";
import { ProviderLinkButton } from "@/components/production/post/provider-link-button";
import type { ProviderLinkState } from "@/lib/production/post/types";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import {
  addLocationConsult,
  removeLocationConsult,
} from "@/lib/production/locations/actions";
import {
  LOCATION_ROLES,
  type LocationConsult,
  type LocationRole,
} from "@/lib/production/locations/types";
import type { NetworkOption } from "@/lib/production/sheet";

const t = fr.productionLocations.consults;
const roles = fr.productionLocations.roles;

/** Who is consulted on the places, with their role and whether they have
 * answered on every candidate (PROD-012). */
export function LocationConsults({
  projectId,
  sheetId,
  consults,
  awaitedIds,
  canOrganize,
  members,
  contacts,
  links,
}: {
  projectId: string;
  sheetId: string;
  // A Réseau contact gives an opinion through their link (PROD-012).
  links: Record<string, ProviderLinkState>;
  consults: LocationConsult[];
  awaitedIds: string[];
  canOrganize: boolean;
  members: Member[];
  contacts: NetworkOption[];
}) {
  const [pending, startTransition] = useTransition();
  const remove = (consultId: string) =>
    startTransition(async () => {
      const result = await removeLocationConsult({ projectId, consultId });
      if (result.ok) toast.success(t.removed);
      else toast.error(result.error);
    });
  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="location-consults"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h3 id="location-consults" className="text-sm font-semibold">
            {t.title}
          </h3>
          <p className="text-xs text-muted-foreground">{t.hint}</p>
        </div>
        {canOrganize && (
          <DialogButton
            label={t.add}
            variant="outline"
            title={t.addTitle}
            description={t.addDescription}
          >
            {(close) => (
              <ConsultForm
                projectId={projectId}
                sheetId={sheetId}
                members={members}
                contacts={contacts}
                onDone={close}
              />
            )}
          </DialogButton>
        )}
      </div>
      {consults.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {consults.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <span className="font-medium">{c.holder.name}</span>
              <span className="text-muted-foreground">{roles[c.role]}</span>
              <StatusBadge
                tone={awaitedIds.includes(c.id) ? "warning" : "success"}
                size="sm"
              >
                {awaitedIds.includes(c.id) ? t.awaited : t.answered}
              </StatusBadge>
              {canOrganize && c.holder.kind === "contact" && (
                <ProviderLinkButton
                  projectId={projectId}
                  sheetId={sheetId}
                  holder={c.holder}
                  link={links[c.holder.id] ?? null}
                />
              )}
              {canOrganize && (
                <Button
                  size="xs"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => remove(c.id)}
                >
                  {t.remove}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ConsultForm({
  projectId,
  sheetId,
  members,
  contacts,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const [holder, setHolder] = useState("");
  const [role, setRole] = useState<LocationRole>("artistic");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.added);
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setMissing(!holder);
        if (!holder) return;
        run(() => addLocationConsult({ projectId, sheetId, holder, role }));
      }}
    >
      <HolderSelect
        id="location-consult-who"
        label={t.who}
        noneLabel={t.whoNone}
        required
        error={missing ? t.missingWho : undefined}
        value={holder}
        members={members}
        contacts={contacts}
        onChange={setHolder}
      />
      <ChoiceCards
        name="location-consult-role"
        legend={t.role}
        value={role}
        onChange={setRole}
        choices={LOCATION_ROLES.map((r) => ({ value: r, label: roles[r] }))}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.add}
        onCancel={onDone}
      />
    </form>
  );
}
