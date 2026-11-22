"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

import {
  chipify,
  dropCaretHolders,
  highlightExcerpts,
  HIGHLIGHT,
  insertChip,
  renderBody,
  replaceExcerpt,
  restoreChips,
  serialize,
} from "@/components/contracts/templates/editor-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { markedTextOf } from "@/lib/legal/contracts/pasted-marks";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import {
  CONTRACT_FIELD_GROUPS,
  type ContractFieldId,
} from "@/lib/legal/contracts/fields";

const fr = { legalContracts };

export type TemplateEditorHandle = {
  /** Every `excerpt` becomes the field; the chips are returned for undo. */
  replace(excerpt: string, id: ContractFieldId): HTMLElement[];
  restore(chips: HTMLElement[], excerpt: string): void;
  /** Replaces the whole text (an imported file). */
  load(body: string): void;
};

/**
 * The text of a template, its values shown as chips (« Nom civil ») and
 * inserted from the buttons above, where the caret is: nobody types
 * {{personne.nom_civil}}. Submitted as text under `name`.
 */
export function TemplateBodyEditor({
  ref,
  name,
  defaultValue = "",
  highlight,
  onChange,
}: {
  ref?: React.Ref<TemplateEditorHandle>;
  name: string;
  defaultValue?: string;
  highlight?: string[];
  onChange?: (body: string) => void;
}) {
  const t = fr.legalContracts.templates.editor;
  const rootRef = useRef<HTMLDivElement>(null);
  const caret = useRef<Range | null>(null);
  const [body, setBody] = useState(defaultValue);

  const sync = () => {
    const next = serialize(rootRef.current!);
    setBody(next);
    onChange?.(next);
  };

  // The form is mounted at each opening: the text is set once.
  useEffect(() => {
    renderBody(rootRef.current!, defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Where a button inserts: the last caret in the text.
  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection();
      const root = rootRef.current;
      if (selection?.rangeCount && root?.contains(selection.anchorNode))
        caret.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", remember);
    return () => document.removeEventListener("selectionchange", remember);
  }, []);

  useEffect(() => {
    highlightExcerpts(rootRef.current!, highlight ?? []);
  }, [highlight, body]);
  useEffect(() => () => void globalThis.CSS?.highlights?.delete(HIGHLIGHT), []);

  useImperativeHandle(ref, () => ({
    replace(excerpt, id) {
      const chips = replaceExcerpt(rootRef.current!, excerpt, id);
      sync();
      return chips;
    },
    restore(chips, excerpt) {
      restoreChips(rootRef.current!, chips, excerpt);
      sync();
    },
    load(next) {
      renderBody(rootRef.current!, next);
      caret.current = null;
      sync();
    },
  }));

  const insert = (id: ContractFieldId) => {
    const root = rootRef.current!;
    const range =
      caret.current && root.contains(caret.current.startContainer)
        ? caret.current
        : null;
    insertChip(root, id, range);
    sync();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      document.execCommand("insertLineBreak");
    } else if (
      (event.metaKey || event.ctrlKey) &&
      ["b", "i", "u"].includes(event.key.toLowerCase())
    ) {
      // Plain text, its bold and underline as marks the contract prints
      // (« **gras** », « __souligné__ »); no italic.
      event.preventDefault();
      const key = event.key.toLowerCase();
      if (key === "i") return;
      const mark = key === "b" ? "**" : "__";
      const selected = window.getSelection()?.toString() ?? "";
      document.execCommand("insertText", false, `${mark}${selected}${mark}`);
      sync();
    }
  };

  const onPaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    // From Word, its bold and underline kept as marks.
    const text =
      markedTextOf(event.clipboardData.getData("text/html")) ??
      event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text.replace(/\r\n?/g, "\n"));
    chipify(rootRef.current!);
    sync();
  };

  return (
    <div className="flex flex-col gap-2">
      <Label id={`${name}-label`} required>
        {t.label}
      </Label>
      <div
        role="group"
        aria-label={t.insert}
        className="flex flex-col gap-2 rounded-lg bg-[var(--surface-soft)] p-2.5"
      >
        <p className="text-sm text-muted-foreground">{t.insertHint}</p>
        <p className="text-sm text-muted-foreground">{t.marksHint}</p>
        {Object.entries(CONTRACT_FIELD_GROUPS).map(([group, ids]) => (
          <div
            key={group}
            className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3"
          >
            <span className="w-20 shrink-0 text-sm text-muted-foreground">
              {t.groups[group as keyof typeof t.groups]}
            </span>
            <ul className="flex flex-wrap gap-1.5">
              {ids.map((id) => (
                <li key={id}>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    // Keeps the caret in the text.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insert(id)}
                  >
                    {fr.legalContracts.fields[id]}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative">
        <div
          ref={rootRef}
          role="textbox"
          aria-multiline="true"
          aria-required="true"
          aria-labelledby={`${name}-label`}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          onInput={() => {
            dropCaretHolders(rootRef.current!);
            sync();
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onDrop={(event) => event.preventDefault()}
          className="max-h-[60vh] min-h-56 w-full overflow-y-auto overscroll-contain rounded-lg border border-input bg-card px-2.5 py-2 text-base leading-relaxed break-words whitespace-pre-wrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        {!body.trim() && (
          <p className="pointer-events-none absolute inset-x-2.5 top-2 text-base text-muted-foreground md:text-sm">
            {t.placeholder}
          </p>
        )}
      </div>
      <input type="hidden" name={name} value={body} />
    </div>
  );
}
