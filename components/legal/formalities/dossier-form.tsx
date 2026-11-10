"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { downloadPdf } from "@/components/ui/pdf-export-button";
import { routes } from "@/lib/auth/redirects";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import { saveFormalityValues } from "@/lib/legal/formalities/actions";
import { EDITABLE } from "@/lib/legal/formalities/editable";
import {
  FORMALITY_SECTIONS,
  SACEM_725_FIELDS,
} from "@/lib/legal/formalities/definition";
import { fieldStates, type Entry } from "@/lib/legal/formalities/field-states";
import {
  readCreators,
  readPublishers,
} from "@/lib/legal/formalities/participants";
import { generateFormality } from "@/lib/legal/formalities/step-actions";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import { cn } from "@/lib/utils";
import { fileNamePart } from "@/lib/utils/file-name-part";

import { DossierSection } from "./dossier-section";
import { FutureSigners } from "./signatures-list";
import { useDossierAutosave } from "./use-dossier-autosave";
import { useDossierErrors } from "./use-dossier-errors";

const fr = { legalDocuments, legalFormalities };

// Saved as it is filled while no version was generated (Sacha, 10/11/2026).
const AUTOSAVED = ["collecting_data", "ready_to_generate"];

// Codes said on their own field once « Générer » is tried (a participant's
// first name, a publisher's creators…), never as a line apart: a line under
// the section did not say where to fill it (Sacha, 10/11/2026). The lines
// left are what no field answers (five creators, three publishers).
const onAField = (code: string) =>
  /^(creator_|main_artist_|publisher_)/.test(code) || code.endsWith("_total");

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
  // A dossier saved before 09/11/2026 (one quality and one Phono share per
  // creator) is read as participants and shares by category.
  const [initial] = useState(() => {
    const read = (key: string, value: unknown) =>
      key === "creators"
        ? readCreators(value)
        : key === "publishers"
          ? readPublishers(value)
          : value;
    const entries: Record<string, Entry> = Object.fromEntries(
      SACEM_725_FIELDS.map((field) => {
        const stored = f.values[field.key];
        const sourced = title.prefill[field.key];
        if (stored)
          return [
            field.key,
            {
              value: read(field.key, stored.value),
              typed: stored.source === "Saisi",
            },
          ];
        if (sourced)
          return [
            field.key,
            { value: read(field.key, sourced.value), typed: false },
          ];
        return [field.key, { value: null, typed: true }];
      }),
    );
    return { entries };
  });
  const [entries, setEntries] = useState(initial.entries);
  const [refused, setRefused] = useState<string | null>(null);
  const { pending, run } = useLegalAction();
  const autosave = useDossierAutosave({
    projectId,
    formalityId: f.id,
    entries,
    enabled: AUTOSAVED.includes(f.status),
  });
  const sourceOf = (key: string) =>
    title.prefill[key]?.source ?? f.values[key]?.source ?? null;
  const items = fieldStates({
    entries,
    sourceOf,
    reopened: new Set(
      Object.entries(f.values)
        .filter(([, v]) => v.status === "to_verify")
        .map(([k]) => k),
    ),
    missing: f.missing,
  });
  const { root, errors, markEdited, attempt } = useDossierErrors(
    f.missing,
    Object.fromEntries(Object.entries(entries).map(([k, e]) => [k, e.value])),
    pending,
    { items, sourceOf },
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

  const fieldKeys = new Set(SACEM_725_FIELDS.map((x) => x.key));
  const stateOf = (key: string) => items.find((i) => i.key === key) ?? null;
  // A borrowing has its own line in « 1. Œuvre ».
  const othersOf = (section: string) =>
    items.filter(
      (i) =>
        !fieldKeys.has(i.key) &&
        i.section === section &&
        !i.key.startsWith("borrowing:") &&
        !onAField(i.key),
    );
  const toConfirm = items.filter((i) => i.state === "proposed").length;
  const toFill = items.filter((i) => i.state === "missing").length;
  const save = async () => {
    await autosave.settle();
    const saved = await saveFormalityValues(
      projectId,
      title.masterId,
      f.id,
      entries,
    );
    if (saved.ok) autosave.saved();
    return saved;
  };

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
            Boolean(title.prefill.phono_from_split) && !entries.creators?.typed
          }
          text={text}
          obj={obj}
          set={set}
        />
      ))}
      {EDITABLE.includes(f.status) && (
        <div className="flex flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-6">
          {/* Read again just before generating, where it serves (Sacha,
              10/11/2026), not at the head of a dossier still being filled. */}
          {f.signatures.length === 0 && <FutureSigners f={f} />}
          {refused && <FormMessage kind="error">{refused}</FormMessage>}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => {
                attempt();
                if (toFill + toConfirm > 0)
                  return setRefused(b.notYet(toFill, toConfirm));
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
          {autosave.state !== "idle" && (
            <p
              role="status"
              className={cn(
                "text-caption",
                autosave.state === "failed"
                  ? "text-[color:var(--tone-danger-fg)]"
                  : "text-muted-foreground",
              )}
            >
              {t.page.autosave[autosave.state]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
