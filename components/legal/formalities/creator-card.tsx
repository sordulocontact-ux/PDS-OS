"use client";

import { nestedCardClass } from "@/components/ui/nested-card";
import { cn } from "@/lib/utils";
import { IconXmark } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OptionSelect } from "@/components/projects/option-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import {
  QUALITIES,
  type Creator,
  type Quality,
} from "@/lib/legal/formalities/definition";
import type { CreatorOption } from "@/lib/legal/formalities/party-actions";

const fr = { legalFormalities };

const EMPTY_IDENTITY = {
  last_name: "",
  first_name: "",
  pseudonym: "",
  ipi: "",
};
const PERFORMER = "performer";
type RoleChoice = Quality | typeof PERFORMER;

/** One participant of the work (retour d'Ibé du 02/11/2026): picked in the
 * Réseau (the title's credited people first), which fills their identity,
 * IPI and roles from what PDS OS knows; then what they did — author,
 * composer, both, arranger, adapter, or « interprète uniquement » (no SACEM
 * share). The main artist is put in by PDS OS and their role confirmed by a
 * person. Their shares are typed by category, in « 4. Répartition ». */
export function CreatorCard({
  rowId,
  creator,
  load,
  disabled,
  errors,
  onChange,
  onRemove,
}: {
  rowId: string;
  creator: Creator;
  load: (fresh?: boolean) => Promise<CreatorOption[]>;
  disabled: boolean;
  errors?: {
    last_name?: string;
    first_name?: string;
    roles?: string;
    confirm?: string;
  };
  onChange: (change: Partial<Creator>) => void;
  onRemove: () => void;
}) {
  const t = fr.legalFormalities;
  const chosen: RoleChoice[] = creator.performer_only
    ? [PERFORMER]
    : creator.roles;
  // Any choice of roles confirms the main artist's (never made an author by
  // PDS OS).
  const confirming = creator.main_artist ? { confirmed: true } : {};
  // « Interprète uniquement » excludes every other role, and the reverse.
  const choose = (next: RoleChoice[]) => {
    const performer = next
      .filter((v) => !chosen.includes(v))
      .includes(PERFORMER);
    onChange({
      ...confirming,
      performer_only: performer,
      roles: performer
        ? []
        : QUALITIES.filter((q) => (next as string[]).includes(q)),
      // An interpreter alone signs nothing.
      ...(performer
        ? { signs: false }
        : creator.performer_only
          ? { signs: true }
          : {}),
    });
  };

  return (
    <div className={cn(nestedCardClass, "grid gap-4 sm:grid-cols-3")}>
      <fieldset disabled={disabled} className="contents">
        <div className="flex flex-col gap-3 sm:col-span-3">
          {creator.main_artist && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="info" size="sm">
                {t.roles.mainArtist}
              </StatusBadge>
              <span className="text-body-sm text-muted-foreground">
                {creator.confirmed ? t.roles.confirmed : t.roles.mainArtistHint}
              </span>
            </div>
          )}
          <PersonPickerField<CreatorOption>
            // Remounted when PDS OS fills the main artist's fiche.
            key={creator.contact_id ?? "none"}
            refName={`c-ref-${rowId}`}
            nameName={`c-name-${rowId}`}
            legend={t.creator.person}
            load={load}
            defaultRef={creator.contact_id ?? null}
            defaultName={null}
            createRoles={["songwriter"]}
            refOfContact={(id) => id}
            onPick={(option, name) =>
              onChange(
                option
                  ? {
                      ...option.fill,
                      roles: creator.roles.length
                        ? creator.roles
                        : option.fill.roles,
                      contact_id: option.id,
                    }
                  : // A name only, or the choice undone: nothing of the
                    // previous person is kept.
                    {
                      ...EMPTY_IDENTITY,
                      last_name: name,
                      contact_id: undefined,
                    },
              )
            }
          />
        </div>
      </fieldset>
      <div className="flex flex-col gap-3 sm:col-span-3">
        {/* A menu rather than chips: lighter in a long form (Sacha,
            09/11/2026); several roles ticked in it. */}
        <fieldset disabled={disabled} className="contents">
          <OptionSelect
            multiple
            name={`c-roles-${rowId}`}
            label={t.roles.legend}
            required
            placeholder={t.roles.placeholder}
            hint={t.roles.hint}
            error={errors?.roles}
            items={Object.fromEntries([
              ...QUALITIES.map((q) => [q, t.roles[q]]),
              [PERFORMER, t.roles.performer],
            ])}
            value={chosen}
            onValueChange={(next) => choose(next as RoleChoice[])}
          />
        </fieldset>
        {creator.performer_only && (
          <p className="text-body-sm text-muted-foreground">
            {t.roles.performerNote}
          </p>
        )}
        {creator.main_artist && !creator.confirmed && !disabled && (
          <div className="flex flex-col gap-1">
            {chosen.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="self-start"
                onClick={() => onChange({ confirmed: true })}
              >
                {t.roles.confirm}
              </Button>
            )}
            <FieldError id={`c-confirm-${rowId}-error`}>
              {errors?.confirm}
            </FieldError>
          </div>
        )}
      </div>
      <Field
        name={`c-last-${rowId}`}
        label={t.creator.lastName}
        aria-required
        value={creator.last_name}
        disabled={disabled}
        error={errors?.last_name}
        onChange={(e) => onChange({ last_name: e.target.value })}
      />
      <Field
        name={`c-first-${rowId}`}
        label={t.creator.firstName}
        value={creator.first_name}
        disabled={disabled}
        error={errors?.first_name}
        onChange={(e) => onChange({ first_name: e.target.value })}
      />
      <Field
        name={`c-pseudo-${rowId}`}
        label={t.creator.pseudonym}
        value={creator.pseudonym}
        disabled={disabled}
        onChange={(e) => onChange({ pseudonym: e.target.value })}
      />
      {!creator.performer_only && (
        <Field
          name={`c-ipi-${rowId}`}
          label={t.creator.ipi}
          value={creator.ipi}
          disabled={disabled}
          onChange={(e) => onChange({ ipi: e.target.value })}
        />
      )}
      <div className="flex items-end justify-between gap-2 sm:col-span-2">
        {!creator.performer_only ? (
          <label className="flex h-10 items-center gap-2 text-sm">
            <Checkbox
              checked={creator.signs}
              disabled={disabled}
              onChange={(e) => onChange({ signs: e.target.checked })}
            />
            {t.creator.signs}
          </label>
        ) : (
          <span />
        )}
        {!disabled && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <IconXmark aria-hidden />
            {t.creator.remove}
          </Button>
        )}
      </div>
    </div>
  );
}
