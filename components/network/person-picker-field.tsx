"use client";

import { useEffect, useState } from "react";

import { Field } from "@/components/auth/field";
import { SinglePicker } from "@/components/catalog/single-picker";
import { CreateContactDialog } from "@/components/network/create-contact-dialog";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { NetworkKind, NetworkRole } from "@/lib/network/types";
import { normalizeSearch } from "@/lib/utils/search";

export type PersonOption = { id: string; label: string; detail?: string };

/**
 * Someone a form names (a credit, a share of a title): picked from a list
 * (the Réseau, the title's people), so the row is linked and no namesake is
 * created; or added to the Réseau without leaving the form; or only a name,
 * for someone not known yet. A name given in advance picks the option of
 * that name. Submitted as `refName` (the option's id, "" for a name only)
 * and `nameName` (the name shown). `onPick`: told of each choice the user
 * makes (an option, a name only, or nothing), so a controlled form can fill
 * what it knows of that person.
 */
export function PersonPickerField<T extends PersonOption = PersonOption>({
  refName,
  nameName,
  legend,
  load,
  defaultRef,
  defaultName,
  createRoles,
  createKind = "person",
  refOfContact,
  onPick,
  matchName = true,
  allowNameOnly = true,
  required = false,
  error,
}: {
  refName: string;
  nameName: string;
  legend: string;
  // `fresh`: read again (a contact was just added), not from a cache.
  load: (fresh?: boolean) => Promise<T[]>;
  defaultRef: string | null;
  defaultName: string | null;
  createRoles: NetworkRole[];
  createKind?: NetworkKind;
  // The option id of a contact just added to the Réseau.
  refOfContact: (contactId: string) => string;
  onPick?: (option: T | null, name: string) => void;
  // false: a name given in advance stays a name only (a saved row that was
  // never linked), never matched to its namesake.
  matchName?: boolean;
  // false: the form needs a contact (a party of a contract), so no
  // « Garder seulement le nom ».
  allowNameOnly?: boolean;
  // Shows the « * » after the legend (docs/DESIGN.md § 4).
  required?: boolean;
  error?: string;
}) {
  const t = fr.network.picker;
  const [options, setOptions] = useState<T[] | null>(null);
  const [selected, setSelected] = useState<string | null>(defaultRef);
  const [freeName, setFreeName] = useState(defaultName ?? "");
  const [mode, setMode] = useState<"pick" | "name">(
    defaultName && !defaultRef ? "name" : "pick",
  );
  const [creating, setCreating] = useState<string | null>(null);

  const reload = (select?: string) =>
    load(Boolean(select)).then((list) => {
      setOptions(list);
      if (select) {
        setSelected(select);
        setMode("pick");
        const option = list.find((o) => o.id === select) ?? null;
        onPick?.(option, option?.label ?? "");
      }
      return list;
    });

  useEffect(() => {
    reload().then((list) => {
      if (defaultRef || !defaultName || !matchName) return;
      const key = normalizeSearch(defaultName);
      const match = list.find((o) => normalizeSearch(o.label) === key);
      if (match) {
        setSelected(match.id);
        setMode("pick");
      }
    });
    // Loaded once, when the form opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const picked = options?.find((o) => o.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-2">
      {mode === "pick" ? (
        options === null ? (
          <p className="text-sm text-muted-foreground">{t.loading}</p>
        ) : (
          <SinglePicker
            name={refName}
            legend={legend}
            required={required}
            options={options}
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id);
              const option = options.find((o) => o.id === id) ?? null;
              onPick?.(option, option?.label ?? "");
            }}
            searchLabel={t.searchLabel}
            placeholder={t.placeholder}
            onCreate={(query) => setCreating(query || freeName)}
            createLabel={(query) => (query ? t.createNamed(query) : t.create)}
            noResultLabel={t.noResult}
            allSelectedLabel={t.allSelected}
            removeLabel={t.remove}
            error={error}
          />
        )
      ) : (
        <>
          <input type="hidden" name={refName} value="" />
          <Field
            name={nameName}
            label={legend}
            required
            autoComplete="off"
            maxLength={200}
            value={freeName}
            onChange={(event) => {
              setFreeName(event.target.value);
              onPick?.(null, event.target.value);
            }}
            error={error}
          />
        </>
      )}
      {mode === "pick" && picked && (
        <input type="hidden" name={nameName} value={picked.label} />
      )}
      <div className="flex flex-wrap gap-2">
        {mode === "pick" && !picked && allowNameOnly && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setMode("name")}
          >
            {t.keepName}
          </Button>
        )}
        {mode === "name" && (
          <>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={!freeName.trim()}
              onClick={() => setCreating(freeName.trim())}
            >
              {freeName.trim() ? t.createNamed(freeName.trim()) : t.create}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setMode("pick")}
            >
              {t.search}
            </Button>
          </>
        )}
      </div>
      <CreateContactDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        name={creating ?? ""}
        roles={createRoles}
        kind={createKind}
        onCreated={(id) => {
          setCreating(null);
          void reload(refOfContact(id));
        }}
      />
    </div>
  );
}
