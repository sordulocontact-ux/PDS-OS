"use client";

import { useEffect, useImperativeHandle, useState, useTransition } from "react";

import type { TemplateEditorHandle } from "@/components/contracts/templates/template-body-editor";
import { ValueSuggestionRow } from "@/components/contracts/templates/value-suggestion-row";
import { Button } from "@/components/ui/button";
import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { ContractFieldId } from "@/lib/legal/contracts/fields";
import { countExcerpt } from "@/lib/legal/contracts/template-text";
import {
  suggestTemplateValues,
  type TemplateAbout,
  type ValueSuggestion,
} from "@/lib/legal/contracts/template-values";

const fr = { legalContracts };

type Row = ValueSuggestion & { chips: HTMLElement[] | null };

export type ValueSuggestionsHandle = {
  /** An imported contract: PO reads it and what he finds is replaced at
   * once, each value still undoable or moved to another field. */
  analyze(text: string, fileName: string): void;
  clear(): void;
};

/**
 * « Repérer les valeurs »: in a contract already filled in, what the code
 * and PO take for a value to fill. Pasted text: marked, then « Remplacer »
 * or « Ignorer » one by one. Imported file: replaced straight away
 * (Sacha, 07/10/2026), « Annuler » or another field to correct PO.
 */
export function ValueSuggestions({
  ref,
  editor,
  body,
  onPending,
  onAbout,
}: {
  ref?: React.Ref<ValueSuggestionsHandle>;
  editor: React.RefObject<TemplateEditorHandle | null>;
  body: string;
  onPending: (excerpts: string[]) => void;
  /** What PO says the template is (name, type, roles, usage). */
  onAbout?: (about: TemplateAbout) => void;
}) {
  const t = fr.legalContracts.templates.values;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The file PO read, when the values come from an import.
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = (rows ?? []).filter(
    (r) => !r.chips && countExcerpt(body, r.excerpt) > 0,
  );
  const openKey = open.map((r) => r.excerpt).join("\n");
  useEffect(() => {
    onPending(openKey ? openKey.split("\n") : []);
  }, [openKey, onPending]);

  // Longest first: « Jean Dupont » before « Dupont ».
  const applyAll = (list: Row[]) =>
    [...list]
      .sort((a, b) => b.excerpt.length - a.excerpt.length)
      .map((row) => {
        const chips = editor.current?.replace(row.excerpt, row.field) ?? [];
        return { ...row, chips, count: chips.length };
      });

  const find = (text: string, apply: boolean) =>
    startTransition(async () => {
      const result = await suggestTemplateValues(text);
      if (!result.ok) {
        setRows(null);
        return setNotice(result.error);
      }
      const found: Row[] = result.suggestions.map((s) => ({
        ...s,
        chips: null,
      }));
      if (result.about) onAbout?.(result.about);
      const applied = apply ? applyAll(found) : found;
      // Back in reading order once applied.
      setRows(found.map((r) => applied.find((a) => a.excerpt === r.excerpt)!));
      setNotice(
        result.quota ??
          (result.partial
            ? t.partial
            : result.suggestions.length === 0
              ? t.none
              : null),
      );
    });

  useImperativeHandle(ref, () => ({
    analyze(text, name) {
      // The text was replaced: earlier rows point at nothing.
      setFileName(name);
      setRows(null);
      setNotice(null);
      find(text, true);
    },
    clear() {
      setFileName(null);
      setRows(null);
      setNotice(null);
    },
  }));

  const update = (excerpt: string, change: Partial<Row>) =>
    setRows((current) =>
      (current ?? []).map((r) =>
        r.excerpt === excerpt ? { ...r, ...change } : r,
      ),
    );

  const replace = (row: Row) => {
    const chips = editor.current?.replace(row.excerpt, row.field) ?? [];
    update(row.excerpt, { chips, count: chips.length });
  };
  const undo = (row: Row) => {
    if (row.chips) editor.current?.restore(row.chips, row.excerpt);
    update(row.excerpt, { chips: null });
  };
  // A value already replaced moves to its new field in the text too.
  const changeField = (row: Row, field: ContractFieldId) => {
    if (!row.chips) return update(row.excerpt, { field });
    editor.current?.restore(row.chips, row.excerpt);
    const chips = editor.current?.replace(row.excerpt, field) ?? [];
    update(row.excerpt, { field, chips, count: chips.length });
  };
  const ignore = (row: Row) =>
    setRows((current) =>
      (current ?? []).filter((r) => r.excerpt !== row.excerpt),
    );
  const replaceAll = () => {
    const applied = applyAll(open);
    setRows((current) =>
      (current ?? []).map(
        (r) => applied.find((a) => a.excerpt === r.excerpt) ?? r,
      ),
    );
  };

  return (
    <section
      aria-busy={pending || undefined}
      className="flex flex-col gap-3 rounded-lg bg-[var(--surface-soft)] p-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-sm font-medium break-words">
            {fileName ? t.fromFile(fileName) : t.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {fileName ? t.fromFileDescription : t.description}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={() => {
            // The values already replaced stay chips in the text.
            setFileName(null);
            find(body, false);
          }}
        >
          {pending ? t.finding : rows ? t.findAgain : t.find}
        </Button>
      </div>
      {pending && fileName && (
        <LoadingRegion label={t.finding}>
          <SkeletonRows count={4} />
        </LoadingRegion>
      )}
      {notice && (
        <ToneCallout
          tone={rows && rows.length > 0 ? "warning" : "neutral"}
          role="status"
        >
          {notice}
        </ToneCallout>
      )}
      {rows && rows.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--border-hairline)]">
          {rows.map((row) => (
            <ValueSuggestionRow
              key={row.excerpt}
              excerpt={row.excerpt}
              field={row.field}
              replacedCount={row.chips ? row.count : null}
              count={countExcerpt(body, row.excerpt)}
              onField={(field) => changeField(row, field)}
              onReplace={() => replace(row)}
              onUndo={() => undo(row)}
              onIgnore={() => ignore(row)}
            />
          ))}
        </ul>
      )}
      {open.length > 1 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-end"
          onClick={replaceAll}
        >
          {t.replaceAll(open.length)}
        </Button>
      )}
    </section>
  );
}
