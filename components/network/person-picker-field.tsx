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
 * and `nameName` (the name shown).
 */
export function PersonPickerField({
  refName,
  nameName,
  legend,
  load,
  defaultRef,
  defaultName,
  createRoles,
  createKind = "person",
  refOfContact,
  error,
}: {
  refName: string;
  nameName: string;
  legend: string;
  load: () => Promise<PersonOption[]>;
  defaultRef: string | null;
  defaultName: string | null;
  createRoles: NetworkRole[];
  createKind?: NetworkKind;
  // The option id of a contact just added to the Réseau.
  refOfContact: (contactId: string) => string;
  error?: string;
}) {
  const t = fr.network.picker;
  const [options, setOptions] = useState<PersonOption[] | null>(null);
  const [selected, setSelected] = useState<string | null>(defaultRef);
  const [freeName, setFreeName] = useState(defaultName ?? "");
  const [mode, setMode] = useState<"pick" | "name">(
    defaultName && !defaultRef ? "name" : "pick",
  );
  const [creating, setCreating] = useState<string | null>(null);

  const reload = (select?: string) =>
    load().then((list) => {
      setOptions(list);
      if (select) {
        setSelected(select);
        setMode("pick");
      }
      return list;
    });

  useEffect(() => {
    reload().then((list) => {
      if (defaultRef || !defaultName) return;
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
            options={options}
            selectedId={selected}
            onSelect={setSelected}
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
            onChange={(event) => setFreeName(event.target.value)}
            error={error}
          />
        </>
      )}
      {mode === "pick" && picked && (
        <input type="hidden" name={nameName} value={picked.label} />
      )}
      <div className="flex flex-wrap gap-2">
        {mode === "pick" && !picked && (
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
