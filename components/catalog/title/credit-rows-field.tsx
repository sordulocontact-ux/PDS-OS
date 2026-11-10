"use client";

import { IconPlus, IconXmark } from "nucleo-sharp-essential";
import { useRef, useState } from "react";

import { FieldError, FormMessage } from "@/components/auth/form-message";
import { ContributorPersonField } from "@/components/catalog/master-page/contributor-person-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import {
  creditRolesOf,
  engineerToChoose,
} from "@/lib/catalog/master/contributor-groups";
import type { ContributorRole } from "@/lib/catalog/master/rules";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { listNetworkPeople } from "@/lib/network/people-actions";

const fr = { catalog, masterPage };

type Row = {
  key: number;
  name: string;
  contactId: string | null;
  roles: ContributorRole[];
  // Where the roles come from (see ContributorForm).
  origin: "network" | "engineer" | null;
};

const blank = (key: number): Row => ({
  key,
  name: "",
  contactId: null,
  roles: [],
  origin: null,
});

/**
 * The credits of a new title, entered with it (UX test of 09/10/2026:
 * « Crédits absents de « Nouveau titre » : ~10 modales pour 3 titres »): one
 * line per person of the Réseau with all their roles, filled from their
 * fiche. Sent as one JSON field `contributors`. `check()` (called on submit)
 * flags an incomplete line and focuses the first; nothing is flagged before.
 */
export function useCreditRows() {
  const next = useRef(1);
  const [rows, setRows] = useState<Row[]>([blank(0)]);
  const [tried, setTried] = useState(false);
  const incomplete = (row: Row) =>
    row.name.trim() ? row.roles.length === 0 : row.roles.length > 0;
  return {
    rows,
    setRows,
    tried,
    add: () => setRows((all) => [...all, blank(next.current++)]),
    // The last line is emptied rather than removed: the block stays usable.
    remove: (key: number) =>
      setRows((all) =>
        all.length > 1
          ? all.filter((r) => r.key !== key)
          : [blank(next.current++)],
      ),
    incomplete,
    check: () => {
      setTried(true);
      const first = rows.find(incomplete);
      if (!first) return true;
      document
        .getElementById(
          first.name.trim()
            ? `credit-${first.key}-roles`
            : `credit-${first.key}-person`,
        )
        ?.querySelector<HTMLElement>("input, button")
        ?.focus();
      return false;
    },
  };
}

export function CreditRowsField({
  credits,
  error,
}: {
  credits: ReturnType<typeof useCreditRows>;
  // Refused by the server.
  error?: string;
}) {
  const t = fr.catalog.masterForm.credits;
  const roleLabels = fr.masterPage.credits;
  const load = usePickerLoad(() => listNetworkPeople());
  const { rows, setRows, tried, incomplete } = credits;
  const update = (key: number, change: Partial<Row>) =>
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const sent = rows
    .filter((r) => r.name.trim() && r.roles.length > 0)
    .map((r) => ({
      name: r.name.trim(),
      contactId: r.contactId,
      roles: r.roles,
    }));
  const missing = tried ? rows.filter(incomplete).length : 0;

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-1 text-sm font-medium">{t.legend}</legend>
      <p className="-mt-2 text-xs text-muted-foreground">{t.hint}</p>
      <input type="hidden" name="contributors" value={JSON.stringify(sent)} />
      {rows.map((row) => {
        const flagged = tried && incomplete(row);
        return (
          <div
            key={row.key}
            className="grid items-start gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <div id={`credit-${row.key}-person`} className="min-w-0">
              <ContributorPersonField
                fieldPrefix={`credit-${row.key}-`}
                defaultName={null}
                defaultContactId={null}
                roles={row.roles}
                load={load}
                error={
                  flagged && !row.name.trim() ? t.personRequired : undefined
                }
                onPick={(option, name) => {
                  if (!option) {
                    update(row.key, {
                      name,
                      contactId: null,
                      ...(row.origin ? { roles: [], origin: null } : {}),
                    });
                    return;
                  }
                  const change: Partial<Row> = {
                    name: option.label,
                    contactId: option.id,
                  };
                  if (row.roles.length === 0 || row.origin === "network") {
                    const fromNetwork = creditRolesOf(option.roles);
                    if (fromNetwork.length > 0) {
                      change.roles = fromNetwork;
                      change.origin = "network";
                    } else if (engineerToChoose(option.roles)) {
                      change.roles = [];
                      change.origin = "engineer";
                    }
                  }
                  update(row.key, change);
                }}
              />
            </div>
            <div id={`credit-${row.key}-roles`} className="min-w-0">
              <OptionSelect
                multiple
                id={`credit-${row.key}-roles-select`}
                name={`credit-${row.key}-roles`}
                label={roleLabels.fields.roles}
                required
                placeholder={roleLabels.fields.rolesPlaceholder}
                items={roleLabels.roles}
                value={row.roles}
                onValueChange={(next) =>
                  update(row.key, {
                    roles: next as ContributorRole[],
                    origin: null,
                  })
                }
                hint={
                  row.origin === "network"
                    ? roleLabels.fields.rolesFromNetwork
                    : row.origin === "engineer"
                      ? roleLabels.fields.rolesEngineer
                      : undefined
                }
                error={flagged && row.name.trim() ? t.rolesRequired : undefined}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="sm:mt-6"
              aria-label={t.remove(row.name.trim())}
              onClick={() => credits.remove(row.key)}
            >
              <IconXmark aria-hidden />
            </Button>
          </div>
        );
      })}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={credits.add}>
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.add}
        </Button>
      </div>
      {missing > 0 && (
        <FormMessage kind="error">{t.missing(missing)}</FormMessage>
      )}
      <FieldError id="contributors-error">{error}</FieldError>
    </fieldset>
  );
}
