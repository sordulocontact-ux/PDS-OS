"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

import {
  DocumentEditorToolbar,
  type DocumentMarks,
} from "@/components/contracts/document-editor-toolbar";
import {
  dropCaretHolders,
  highlightExcerpts,
  HIGHLIGHT,
  insertChip,
  pasteText,
  placeCaret,
  renderBody,
  replaceExcerpt,
  restoreChips,
  serialize,
} from "@/components/contracts/templates/editor-dom";
import { Label } from "@/components/ui/label";
import { documentCss, sheetCss } from "@/lib/legal/contracts/document-layout";
import type { ContractFieldId } from "@/lib/legal/contracts/fields";
import { markedTextOf } from "@/lib/legal/contracts/pasted-marks";

export type DocumentEditorHandle = {
  /** Every `excerpt` becomes the value; the blanks are returned for undo. */
  replace(excerpt: string, id: ContractFieldId): HTMLElement[];
  restore(chips: HTMLElement[], excerpt: string): void;
  /** Replaces the whole text (an imported file). */
  load(body: string): void;
};

const PAGE = "contract-page";
// The page's own look: the PDF's, from the one source (document-layout.ts).
const PAGE_CSS = `${documentCss(`.${PAGE}`)}${sheetCss(`.${PAGE}`)}`;

/**
 * A contract written on its page, as its PDF shows it (Sacha 25/11/2026:
 * « qu'on voie directement le contrat en PDF avec les variables », after
 * Ibé's « pas un truc avec les écritures »): the A4 sheet, its articles,
 * real bold and underline, each value as the blank labeled « Nom civil »
 * the PDF prints — nobody reads or types {{…}} or **…**. Enter starts a
 * paragraph, Shift+Enter a line; a text pasted from Word keeps its bold and
 * underline and takes the contract's look. Submitted as the contract's text
 * under `name`.
 */
export function DocumentEditor({
  ref,
  name,
  label,
  defaultValue = "",
  placeholder,
  fields = false,
  highlight,
  onChange,
}: {
  ref?: React.Ref<DocumentEditorHandle>;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  // A template: « Insérer une information » in the toolbar.
  fields?: boolean;
  highlight?: string[];
  onChange?: (body: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const caret = useRef<Range | null>(null);
  const [body, setBody] = useState(defaultValue);
  const [marks, setMarks] = useState<DocumentMarks>({
    bold: false,
    underline: false,
  });

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

  // Where a value goes and which marks the caret is in.
  useEffect(() => {
    const remember = () => {
      const selection = window.getSelection();
      const root = rootRef.current;
      if (!selection?.rangeCount || !root?.contains(selection.anchorNode))
        return;
      caret.current = selection.getRangeAt(0).cloneRange();
      setMarks({
        bold: document.queryCommandState("bold"),
        underline: document.queryCommandState("underline"),
      });
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

  // A button may have taken the focus (keyboard): the caret goes back first.
  const mark = (which: keyof DocumentMarks) => {
    const root = rootRef.current!;
    if (!root.contains(document.activeElement)) placeCaret(root, caret.current);
    document.execCommand(which);
    sync();
  };

  // Once the menu has given the focus back to the page.
  const insert = (id: ContractFieldId) =>
    requestAnimationFrame(() => {
      insertChip(rootRef.current!, id, caret.current);
      sync();
    });

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter") {
      event.preventDefault();
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand(
        event.shiftKey ? "insertLineBreak" : "insertParagraph",
      );
      sync();
    } else if (
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "i"
    ) {
      // A contract has no italic.
      event.preventDefault();
    }
  };

  const onPaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const text =
      markedTextOf(event.clipboardData.getData("text/html")) ??
      event.clipboardData.getData("text/plain");
    pasteText(rootRef.current!, text.replace(/\r\n?/g, "\n"));
    sync();
  };

  return (
    <div className="flex flex-col gap-2">
      <style href={PAGE} precedence="default">
        {PAGE_CSS}
      </style>
      <Label id={`${name}-label`} required>
        {label}
      </Label>
      <DocumentEditorToolbar
        page={rootRef}
        marks={marks}
        onMark={mark}
        onInsert={fields ? insert : undefined}
      />
      <div className="max-h-[70vh] overflow-y-auto overscroll-contain rounded-lg bg-muted p-2 sm:p-6">
        <div
          ref={rootRef}
          role="textbox"
          aria-multiline="true"
          aria-required="true"
          aria-labelledby={`${name}-label`}
          contentEditable
          suppressContentEditableWarning
          spellCheck
          data-placeholder={placeholder}
          data-empty={body.trim() ? undefined : ""}
          onInput={() => {
            dropCaretHolders(rootRef.current!);
            sync();
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onDrop={(event) => event.preventDefault()}
          className={`${PAGE} outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
        />
      </div>
      <input type="hidden" name={name} value={body} />
    </div>
  );
}
