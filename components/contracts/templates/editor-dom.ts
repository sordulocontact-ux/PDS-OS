// The template editor's DOM: plain text, <br> line breaks and one
// non-editable chip per field. The text a template is saved with is read
// back from it (`serialize`), never kept apart.

import {
  fieldChipClass,
  fieldLabel,
} from "@/components/contracts/templates/field-chip";
import {
  bodySegments,
  excerptStarts,
} from "@/lib/legal/contracts/template-text";

// Typed after a chip so the caret can sit there; never saved.
const CARET_HOLDER = "​";
const BLOCKS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "BLOCKQUOTE"]);

export function createChip(id: string): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.field = id;
  chip.className = fieldChipClass;
  chip.textContent = fieldLabel(id);
  return chip;
}

/** Fills the editor with a template's text, its fields as chips. */
export function renderBody(root: HTMLElement, body: string) {
  root.replaceChildren(
    ...bodySegments(body).map((s) =>
      s.kind === "text" ? document.createTextNode(s.text) : createChip(s.id),
    ),
  );
}

/** The template's text: each chip back to {{id}}, line breaks to \n. */
export function serialize(root: HTMLElement): string {
  let out = "";
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child instanceof Text) out += child.data;
      else if (child instanceof HTMLElement) {
        if (child.dataset.field) out += `{{${child.dataset.field}}}`;
        else if (child.tagName === "BR") out += "\n";
        else {
          if (BLOCKS.has(child.tagName) && out && !out.endsWith("\n"))
            out += "\n";
          walk(child);
        }
      }
    }
  };
  walk(root);
  return out.replaceAll(CARET_HOLDER, "");
}

/** The editable text nodes, a chip's own label left out. */
function textNodes(root: HTMLElement): Text[] {
  root.normalize();
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (!n.parentElement?.closest("[data-field]")) nodes.push(n as Text);
  return nodes;
}

/** Each place `excerpt` is written, whole words only, in document order. */
export function excerptRanges(root: HTMLElement, excerpt: string): Range[] {
  return textNodes(root).flatMap((node) =>
    excerptStarts(node.data, excerpt).map((at) => {
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + excerpt.length);
      return range;
    }),
  );
}

/** Puts a chip in place of every `excerpt`; returns the chips, so the
 * replacement can be undone. */
export function replaceExcerpt(
  root: HTMLElement,
  excerpt: string,
  id: string,
): HTMLElement[] {
  // From the last one: the earlier offsets of a text node stay valid.
  return excerptRanges(root, excerpt)
    .reverse()
    .map((range) => {
      const chip = createChip(id);
      range.deleteContents();
      range.insertNode(chip);
      return chip;
    })
    .reverse();
}

/** Undoes `replaceExcerpt`: the chips still there go back to the text. */
export function restoreChips(
  root: HTMLElement,
  chips: HTMLElement[],
  excerpt: string,
) {
  for (const chip of chips)
    if (chip.isConnected) chip.replaceWith(document.createTextNode(excerpt));
  root.normalize();
}

/** {{id}} typed or pasted as text becomes a chip. */
export function chipify(root: HTMLElement) {
  for (const node of textNodes(root)) {
    const segments = bodySegments(node.data);
    if (!segments.some((s) => s.kind === "field")) continue;
    node.replaceWith(
      ...segments.map((s) =>
        s.kind === "text" ? document.createTextNode(s.text) : createChip(s.id),
      ),
    );
  }
}

/** Inserts a chip at `range` (or at the end) and puts the caret after it. */
export function insertChip(root: HTMLElement, id: string, range: Range | null) {
  const at = range ?? document.createRange();
  if (!range) {
    at.selectNodeContents(root);
    at.collapse(false);
  }
  // Never inside another chip.
  const inside = at.startContainer.parentElement?.closest("[data-field]");
  if (inside) {
    at.setStartAfter(inside);
    at.collapse(true);
  }
  at.deleteContents();
  const chip = createChip(id);
  at.insertNode(chip);
  let next: Text;
  if (chip.nextSibling instanceof Text) next = chip.nextSibling;
  else {
    next = document.createTextNode(CARET_HOLDER);
    chip.after(next);
  }
  const caret = document.createRange();
  caret.setStart(next, next.data.startsWith(CARET_HOLDER) ? 1 : 0);
  caret.collapse(true);
  root.focus({ preventScroll: true });
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(caret);
  chip.scrollIntoView({ block: "nearest" });
}

/** Once something is typed next to it, the caret holder goes (or it would
 * cost an extra Backspace), the caret kept where it was. */
export function dropCaretHolders(root: HTMLElement) {
  const selection = window.getSelection();
  for (const node of textNodes(root)) {
    if (node.data.length < 2 || !node.data.includes(CARET_HOLDER)) continue;
    const caret = selection?.anchorNode === node ? selection.anchorOffset : -1;
    const before = node.data.slice(0, Math.max(caret, 0));
    node.data = node.data.replaceAll(CARET_HOLDER, "");
    if (caret >= 0)
      selection?.collapse(
        node,
        caret - (before.split(CARET_HOLDER).length - 1),
      );
  }
}

/** Marks the excerpts still to decide on, where the browser can. */
export function highlightExcerpts(root: HTMLElement, excerpts: string[]) {
  if (typeof CSS === "undefined" || !("highlights" in CSS)) return;
  const ranges = excerpts.flatMap((e) => excerptRanges(root, e));
  if (ranges.length === 0) CSS.highlights.delete(HIGHLIGHT);
  else CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
}

export const HIGHLIGHT = "template-value";
