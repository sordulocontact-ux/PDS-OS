"use client";

import { useEffect, useImperativeHandle, useState, useTransition } from "react";

import type { DocumentEditorHandle } from "@/components/contracts/document-editor";
import { ValueSuggestionRow } from "@/components/contracts/templates/value-suggestion-row";
import { Button } from "@/components/ui/button";
import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { ContractFieldId } from "@/lib/legal/contracts/fields";
import {
  countExcerpt,
  type ExcerptAt,
} from "@/lib/legal/contracts/template-text";
import {
  suggestTemplateValues,
  type TemplateAbout,
  type ValueSuggestion,
} from "@/lib/legal/contracts/template-values";

const fr = { legalContracts };

type Row = ValueSuggestion & { chips: HTMLElement[] | null };

// A blank (« ____ ») is found by its place: two rows may share its text.
const keyOf = (row: ExcerptAt) => `${row.context ?? ""}\u0000${row.excerpt}`;
const countOf = (body: string, row: ExcerptAt) =>
  countExcerpt(body, row.excerpt, row.context);

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
  editor: React.RefObject<DocumentEditorHandle | null>;
  body: string;
  onPending: (excerpts: ExcerptAt[]) => void;
  /** What PO says the template is (name, type, roles, usage). */
  onAbout?: (about: TemplateAbout) => void;
}) {
  const t = fr.legalContracts.templates.values;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The file PO read, when the values come from an import.
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = (rows ?? []).filter((r) => !r.chips && countOf(body, r) > 0);
  const openKey = JSON.stringify(
    open.map(({ excerpt, context }) => ({ excerpt, context })),
  );
  useEffect(() => {
    onPending(JSON.parse(openKey) as ExcerptAt[]);
  }, [openKey, onPending]);

  // Longest first: « Jean Dupont » before « Dupont ».
  const applyAll = (list: Row[]) =>
    [...list]
      .sort((a, b) => b.excerpt.length - a.excerpt.length)
      .map((row) => {
        const chips = editor.current?.replace(row, row.field) ?? [];
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
      setRows(found.map((r) => applied.find((a) => keyOf(a) === keyOf(r))!));
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

  const update = (row: Row, change: Partial<Row>) =>
    setRows((current) =>
      (current ?? []).map((r) =>
        keyOf(r) === keyOf(row) ? { ...r, ...change } : r,
      ),
    );

  const replace = (row: Row) => {
    const chips = editor.current?.replace(row, row.field) ?? [];
    update(row, { chips, count: chips.length });
  };
  const undo = (row: Row) => {
    if (row.chips) editor.current?.restore(row.chips, row.excerpt);
    update(row, { chips: null });
  };
  // A value already replaced moves to its new field in the text too.
  const changeField = (row: Row, field: ContractFieldId) => {
    if (!row.chips) return update(row, { field });
    editor.current?.restore(row.chips, row.excerpt);
    const chips = editor.current?.replace(row, field) ?? [];
    update(row, { field, chips, count: chips.length });
  };
  const ignore = (row: Row) =>
    setRows((current) =>
      (current ?? []).filter((r) => keyOf(r) !== keyOf(row)),
    );
  const replaceAll = () => {
    const applied = applyAll(open);
    setRows((current) =>
      (current ?? []).map(
        (r) => applied.find((a) => keyOf(a) === keyOf(r)) ?? r,
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
              key={keyOf(row)}
              excerpt={row.context ? null : row.excerpt}
              field={row.field}
              replacedCount={row.chips ? row.count : null}
              count={countOf(body, row)}
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
