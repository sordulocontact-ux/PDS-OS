"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { downloadPdf } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { saveFormalityValues } from "@/lib/legal/formalities/actions";
import { beforeItems, type Entry } from "@/lib/legal/formalities/before-items";
import {
  SACEM_725_FIELDS,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";
import { splitShareOf } from "@/lib/legal/formalities/prefill";
import { generateFormality } from "@/lib/legal/formalities/step-actions";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import { fileNamePart } from "@/lib/utils/file-name-part";

import { BeforeGenerate } from "./before-generate";
import { DossierSection } from "./dossier-section";
import { useDossierErrors } from "./use-dossier-errors";

const SECTIONS = ["work", "exploitation", "people", "agreements"] as const;
const EDITABLE = [
  "collecting_data",
  "ready_to_generate",
  "document_ready",
  "signatures_pending",
  "ready_to_submit",
  "action_required",
];

/**
 * The SACEM dossier on one page (proto « Projet complet », Déclaration
 * SACEM): every section in place, each field pre-filled from its source
 * and kept as typed, then « Avant de générer » in three columns (Bloquant,
 * À confirmer, Facultatif) and « Générer la version à signer » — refused
 * while something blocks or waits for a confirmation — or « Générer un
 * brouillon », never signed.
 */
export function DossierForm({
  projectId,
  title,
}: {
  projectId: string;
  title: TitleFormality;
}) {
  const t = fr.legalFormalities;
  const b = fr.legalDocuments.bulletin;
  const f = title.formality!;
  // A share left empty in a dossier saved before the split was confirmed is
  // taken from it (UX test of 09/10/2026), « à confirmer » like the others.
  const [initial] = useState(() => {
    let filled = false;
    const withShares = <T extends { phono: string; contact_id?: string }>(
      people: T[],
      roleOf: (person: T) => string,
    ) =>
      people.map((person) => {
        if (person.phono) return person;
        const phono = splitShareOf(
          title.splitShares,
          person.contact_id ?? null,
          roleOf(person),
        );
        if (phono) filled = true;
        return phono ? { ...person, phono } : person;
      });
    const entries: Record<string, Entry> = Object.fromEntries(
      SACEM_725_FIELDS.map((field) => {
        const stored = f.values[field.key];
        const sourced = title.prefill[field.key];
        if (stored) {
          const value =
            field.key === "creators" && Array.isArray(stored.value)
              ? withShares(stored.value as Creator[], (c) => c.quality)
              : field.key === "publishers" && Array.isArray(stored.value)
                ? withShares(stored.value as Publisher[], () => "publisher")
                : stored.value;
          return [field.key, { value, typed: stored.source === "Saisi" }];
        }
        if (sourced) return [field.key, { value: sourced.value, typed: false }];
        return [field.key, { value: null, typed: true }];
      }),
    );
    return { entries, filled };
  });
  const [entries, setEntries] = useState(initial.entries);
  const [refused, setRefused] = useState<string | null>(null);
  const { pending, run } = useLegalAction();
  const { root, errors, markEdited, attempt } = useDossierErrors(
    f.missing,
    Object.fromEntries(Object.entries(entries).map(([k, e]) => [k, e.value])),
    pending,
  );
  const reopening = f.status === "action_required";
  const editable = (key: string) =>
    EDITABLE.includes(f.status) && (!reopening || f.reopened.includes(key));
  const set = (key: string, value: unknown) => {
    setEntries((all) => ({ ...all, [key]: { value, typed: true } }));
    markEdited(key);
    setRefused(null);
  };
  const text = (key: string) =>
    typeof entries[key]?.value === "string"
      ? (entries[key].value as string)
      : "";
  const obj = <T,>(key: string, fallback: T) =>
    (entries[key]?.value as T | null) ?? fallback;

  const items = beforeItems({
    entries,
    sourceOf: (key) =>
      title.prefill[key]?.source ?? f.values[key]?.source ?? null,
    reopened: new Set(
      Object.entries(f.values)
        .filter(([, v]) => v.status === "to_verify")
        .map(([k]) => k),
    ),
    missing: f.missing,
  }).map((item) => ({
    ...item,
    onConfirm:
      item.confirmable && editable(item.key)
        ? () => set(item.key, entries[item.key]?.value)
        : undefined,
  }));
  const blocking = items.filter((i) => i.column === "blocking").length;
  const toConfirm = items.filter((i) => i.column === "toConfirm").length;
  const save = () =>
    saveFormalityValues(projectId, title.masterId, f.id, entries);

  return (
    <div ref={root} className="flex flex-col gap-8">
      {SECTIONS.map((section) => (
        <DossierSection
          key={section}
          section={section}
          title={title}
          errors={errors}
          editable={editable}
          fromSplit={
            initial.filled ||
            (Boolean(title.prefill.phono_from_split) &&
              !entries.creators?.typed)
          }
          text={text}
          obj={obj}
          set={set}
        />
      ))}
      <BeforeGenerate items={items} />
      {EDITABLE.includes(f.status) && (
        <div className="flex flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-6">
          {refused && <FormMessage kind="error">{refused}</FormMessage>}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => {
                attempt();
                if (blocking > 0 || toConfirm > 0)
                  return setRefused(b.notYet(blocking, toConfirm));
                run(
                  async () => {
                    const saved = await save();
                    if (!saved.ok) return saved;
                    return generateFormality(projectId, f.id);
                  },
                  undefined,
                  t.transitions.generated,
                );
              }}
            >
              {pending ? t.page.validating : b.generate}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(save, () => {
                  void downloadPdf(
                    routes.formalityDraftPdf(f.id),
                    b.draftName(fileNamePart(title.title, "Titre")),
                    b.pdfFailed,
                  );
                })
              }
            >
              {b.draft}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
