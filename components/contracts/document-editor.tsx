"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";

import {
  DocumentEditorToolbar,
  type DocumentMarks,
} from "@/components/contracts/document-editor-toolbar";
import { DocumentFieldPopover } from "@/components/contracts/document-field-popover";
import { usePageCaret } from "@/components/contracts/use-page-caret";
import {
  dropCaretHolders,
  insertChip,
  pasteText,
  placeCaret,
  renderBody,
  replaceExcerpt,
  serialize,
} from "@/components/contracts/templates/editor-dom";
import { Label } from "@/components/ui/label";
import {
  documentCss,
  fieldLabelOf,
  sheetCss,
} from "@/lib/legal/contracts/document-layout";
import type { ContractFieldId } from "@/lib/legal/contracts/fields";
import type { ExcerptAt } from "@/lib/legal/contracts/template-text";
import {
  documentFontHref,
  documentFontOf,
  type DocumentFont,
} from "@/lib/legal/contracts/document-fonts";
import { markedTextOf, pastedFontOf } from "@/lib/legal/contracts/pasted-marks";

export type DocumentEditorHandle = {
  /** Every `excerpt` (where its context says) becomes the value, shown
   * found on the page; how many places. */
  replace(at: ExcerptAt, id: ContractFieldId): number;
  /** Replaces the whole text (an imported file). */
  load(body: string): void;
};

const PAGE = "contract-page";
// The page's own look: the PDF's, from the one source (document-layout.ts).
const PAGE_CSS = `${documentCss(`.${PAGE}`)}${sheetCss(`.${PAGE}`)}
  .${PAGE} .field { cursor: pointer; }
  .${PAGE} .field[data-original] { background: #fff1c2; border-bottom-color: #b98900; color: #5c4400; }`;

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
  busy,
  font = null,
  onChange,
  onFile,
  onPasteContract,
}: {
  ref?: React.Ref<DocumentEditorHandle>;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  // A template: « Insérer une information » in the toolbar.
  fields?: boolean;
  // What is being done to the page (« PO lit le contrat… »).
  busy?: string | null;
  // The contract's typeface (its Word file's), as its PDF prints it.
  font?: DocumentFont | null;
  onChange?: (body: string) => void;
  // A file dropped on the page (a template's source file); else a drop does
  // nothing.
  onFile?: (file: File) => void;
  // A whole contract pasted on an empty page: read like an imported file,
  // with the typeface it was written in.
  onPasteContract?: (body: string, font: DocumentFont | null) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { caret, marks } = usePageCaret(rootRef);
  const [body, setBody] = useState(defaultValue);
  // The value clicked on the page, corrected in its popover.
  const [chip, setChip] = useState<HTMLElement | null>(null);

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

  useImperativeHandle(ref, () => ({
    replace(at, id) {
      const count = replaceExcerpt(rootRef.current!, at, id).length;
      sync();
      return count;
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
    const html = event.clipboardData.getData("text/html");
    const text =
      markedTextOf(html) ?? event.clipboardData.getData("text/plain");
    const wasEmpty = !body.trim();
    pasteText(rootRef.current!, text.replace(/\r\n?/g, "\n"));
    sync();
    if (wasEmpty)
      onPasteContract?.(
        serialize(rootRef.current!),
        documentFontOf(pastedFontOf(html)),
      );
  };

  // The clicked value: another field, its text back, or taken out.
  const change = (edit: (el: HTMLElement) => void) => {
    if (chip?.isConnected) edit(chip);
    setChip(null);
    sync();
  };

  return (
    <div className="flex flex-col gap-2">
      <style href={PAGE} precedence="default">
        {PAGE_CSS}
      </style>
      {font && (
        <link
          rel="stylesheet"
          href={documentFontHref(font)}
          precedence="default"
        />
      )}
      <Label id={`${name}-label`} required>
        {label}
      </Label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DocumentEditorToolbar
          page={rootRef}
          marks={marks}
          onMark={mark}
          onInsert={fields ? insert : undefined}
        />
        <p role="status" className="text-sm text-muted-foreground empty:hidden">
          {busy}
        </p>
      </div>
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
          data-font={font ?? undefined}
          data-empty={body.trim() ? undefined : ""}
          onInput={() => {
            dropCaretHolders(rootRef.current!);
            sync();
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onClick={(event) => {
            const el = (event.target as HTMLElement).closest<HTMLElement>(
              "[data-field]",
            );
            if (fields && el) setChip(el);
          }}
          onDragOver={(event) => {
            if (onFile && event.dataTransfer.types.includes("Files"))
              event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file && onFile) onFile(file);
          }}
          className={`${PAGE} outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
        />
      </div>
      <DocumentFieldPopover
        chip={chip}
        onField={(id) =>
          change((el) => {
            el.dataset.field = id;
            el.textContent = fieldLabelOf(id);
          })
        }
        onRestore={() =>
          change((el) =>
            el.replaceWith(document.createTextNode(el.dataset.original ?? "")),
          )
        }
        onRemove={() => change((el) => el.remove())}
        onClose={() => setChip(null)}
      />
      <input type="hidden" name={name} value={body} />
    </div>
  );
}
