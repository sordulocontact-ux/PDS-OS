"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { downloadPdf } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { saveFormalityValues } from "@/lib/legal/formalities/actions";
import {
  FORMALITY_SECTIONS,
  SACEM_725_FIELDS,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";
import { fieldStates, type Entry } from "@/lib/legal/formalities/field-states";
import { splitShareOf } from "@/lib/legal/formalities/prefill";
import { generateFormality } from "@/lib/legal/formalities/step-actions";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import { fileNamePart } from "@/lib/utils/file-name-part";

import { DossierSection } from "./dossier-section";
import { useDossierErrors } from "./use-dossier-errors";

const EDITABLE = [
  "collecting_data",
  "ready_to_generate",
  "document_ready",
  "signatures_pending",
  "ready_to_submit",
  "action_required",
];

/**
 * The SACEM bulletin on one page (recette Juridique V1, JUR-02 and JUR-03,
 * proto Juridique v3): five numbered sections, each field pre-filled from
 * its source, kept as typed and saying where it stands on its line; then
 * « Générer la version à signer » — refused, with the count, while
 * something misses or waits for a confirmation — or « Générer un
 * brouillon », marked « ne pas signer ».
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

  const items = fieldStates({
    entries,
    sourceOf: (key) =>
      title.prefill[key]?.source ?? f.values[key]?.source ?? null,
    reopened: new Set(
      Object.entries(f.values)
        .filter(([, v]) => v.status === "to_verify")
        .map(([k]) => k),
    ),
    missing: f.missing,
  });
  const fieldKeys = new Set(SACEM_725_FIELDS.map((x) => x.key));
  const stateOf = (key: string) => items.find((i) => i.key === key) ?? null;
  // A borrowing has its own line in « 1. Œuvre ».
  const othersOf = (section: string) =>
    items.filter(
      (i) =>
        !fieldKeys.has(i.key) &&
        i.section === section &&
        !i.key.startsWith("borrowing:"),
    );
  const open = items.filter((i) => i.state !== "optional").length;
  const save = () =>
    saveFormalityValues(projectId, title.masterId, f.id, entries);

  // JUR-03: a change after generation makes a new version; the signatures
  // already given stop counting.
  const generated = ["document_ready", "signatures_pending", "ready_to_submit"];
  // The signatures read are the current version's.
  const signed = f.signatures.filter((x) => x.status === "signed").length;

  return (
    <div ref={root} className="flex flex-col gap-3.5">
      {generated.includes(f.status) && (
        <ToneCallout tone="warning">{t.page.editWarning(signed)}</ToneCallout>
      )}
      {FORMALITY_SECTIONS.map((section) => (
        <DossierSection
          key={section}
          projectId={projectId}
          section={section}
          title={title}
          errors={errors}
          editable={editable}
          stateOf={stateOf}
          others={othersOf(section)}
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
      {EDITABLE.includes(f.status) && (
        <div className="flex flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-6">
          {refused && <FormMessage kind="error">{refused}</FormMessage>}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => {
                attempt();
                if (open > 0) return setRefused(b.notYet(open));
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
          <p className="text-caption text-muted-foreground">{b.draftNote}</p>
        </div>
      )}
    </div>
  );
}
