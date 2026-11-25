// The DOM of the contract editor (DocumentEditor): the contract's page as
// its PDF lays it out (document-layout.ts) — paragraphs, real bold and
// underline, each value a blank labeled « Nom civil » the caret never
// enters. The text a contract is saved with (paragraphs split by an empty
// line, **bold**, __underline__, {{id}}) is read back from it (`serialize`),
// never kept apart.

import {
  fieldLabelOf,
  templateBodyHtml,
} from "@/lib/legal/contracts/document-layout";
import { isBold, isUnderline } from "@/lib/legal/contracts/pasted-marks";
import { excerptStarts } from "@/lib/legal/contracts/template-text";

// Typed after a blank so the caret can sit there; never saved.
const CARET_HOLDER = "\u200b";
// Where the caret goes back after a paste lays the page out again.
const CARET_MARK = "\ue000";
// A pasted line break while it is written: Chrome would make each one a
// paragraph.
const LINE_MARK = "\ue001";
const BLOCKS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "BLOCKQUOTE"]);

const EMPTY_PAGE = "<p><br></p>";

const isText = (node: Node | null): node is Text =>
  node?.nodeType === Node.TEXT_NODE;

export function createChip(id: string): HTMLSpanElement {
  const chip = document.createElement("span");
  chip.contentEditable = "false";
  chip.dataset.field = id;
  chip.className = "field";
  chip.textContent = fieldLabelOf(id);
  return chip;
}

/** Fills the page with a contract's text, laid out as its PDF. */
export function renderBody(root: HTMLElement, body: string) {
  root.innerHTML = templateBodyHtml(body, { editable: true }) || EMPTY_PAGE;
  // The layout joins its paragraphs with a line break: not a place to type.
  for (const node of [...root.childNodes])
    if (isText(node) && !node.data.trim()) node.remove();
}

/** One line of a mark: its spaces stay outside (« **NOVA** »). */
function wrapMark(inner: string, mark: string): string {
  return inner
    .split("\n")
    .map((line) => {
      const core = line.trim();
      if (!core) return line;
      const at = line.indexOf(core);
      return `${line.slice(0, at)}${mark}${core}${mark}${line.slice(at + core.length)}`;
    })
    .join("\n");
}

/** A paragraph's content as text: blanks back to {{id}}, line breaks to
 * \n, the bold and underline people chose as marks — what the layout makes
 * bold by itself (`data-auto`) as plain text. */
function inlineText(node: Node): string {
  if (isText(node)) return node.data;
  if (!(node instanceof HTMLElement)) return "";
  if (node.dataset.field) return `{{${node.dataset.field}}}`;
  if (node.tagName === "BR") return "\n";
  const inner = [...node.childNodes].map(inlineText).join("");
  // An article's number and its heading: « 1. » then a space.
  if (node.classList.contains("tab")) return ` ${inner}`;
  if (BLOCKS.has(node.tagName)) return `${inner}\n`;
  if (node.hasAttribute("data-auto")) return inner;
  let out = inner;
  if (isUnderline(node)) out = wrapMark(out, "__");
  if (isBold(node)) out = wrapMark(out, "**");
  return out;
}

/** The contract's text, as it is saved. */
export function serialize(root: HTMLElement, keepCaretMark = false): string {
  const paragraphs: string[] = [];
  let loose = "";
  for (const child of root.childNodes) {
    if (child instanceof HTMLElement && BLOCKS.has(child.tagName)) {
      paragraphs.push(loose);
      loose = "";
      paragraphs.push(inlineText(child));
    } else loose += inlineText(child);
  }
  paragraphs.push(loose);
  const text = paragraphs
    .map((p) => p.replaceAll(CARET_HOLDER, "").replace(/\n+$/, ""))
    .filter((p) => p.replaceAll(CARET_MARK, "").trim() !== "")
    .join("\n\n");
  return keepCaretMark ? text : text.replaceAll(CARET_MARK, "");
}

/** The editable text nodes, a blank's own label left out. */
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

/** Puts a blank in place of every `excerpt`; returns the blanks, so the
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

/** Undoes `replaceExcerpt`: the blanks still there go back to the text. */
export function restoreChips(
  root: HTMLElement,
  chips: HTMLElement[],
  excerpt: string,
) {
  for (const chip of chips)
    if (chip.isConnected) chip.replaceWith(document.createTextNode(excerpt));
  root.normalize();
}

/** Puts the caret in the page at `range`, or at its end. */
export function placeCaret(root: HTMLElement, range: Range | null) {
  const at = range && root.contains(range.startContainer) ? range : null;
  const caret = at ?? document.createRange();
  if (!at) {
    caret.selectNodeContents(root.lastElementChild ?? root);
    caret.collapse(false);
  }
  root.focus({ preventScroll: true });
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(caret);
}

/** Inserts a blank at `range` (or at the end) and puts the caret after it. */
export function insertChip(root: HTMLElement, id: string, range: Range | null) {
  const at =
    range && root.contains(range.startContainer)
      ? range
      : document.createRange();
  if (at !== range) {
    at.selectNodeContents(root.lastElementChild ?? root);
    at.collapse(false);
  }
  // Never inside another blank.
  const inside = at.startContainer.parentElement?.closest("[data-field]");
  if (inside) {
    at.setStartAfter(inside);
    at.collapse(true);
  }
  at.deleteContents();
  const chip = createChip(id);
  at.insertNode(chip);
  let next: Text;
  if (isText(chip.nextSibling)) next = chip.nextSibling;
  else {
    next = document.createTextNode(CARET_HOLDER);
    chip.after(next);
  }
  // A <br> kept the empty paragraph open: the blank does now.
  if (
    next.nextSibling instanceof HTMLBRElement &&
    !next.nextSibling.nextSibling
  )
    next.nextSibling.remove();
  const caret = document.createRange();
  caret.setStart(next, next.data.startsWith(CARET_HOLDER) ? 1 : 0);
  caret.collapse(true);
  placeCaret(root, caret);
  chip.scrollIntoView({ block: "nearest" });
}

/**
 * A pasted text (from Word, its bold and underline as marks): written at
 * the caret, then the page laid out again so its paragraphs, articles and
 * {{id}} take the contract's look; the caret goes back after it.
 */
export function pasteText(root: HTMLElement, text: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount || !root.contains(selection.anchorNode))
    placeCaret(root, null);
  document.execCommand(
    "insertText",
    false,
    `${text.replaceAll("\n", LINE_MARK)}${CARET_MARK}`,
  );
  renderBody(root, serialize(root, true).replaceAll(LINE_MARK, "\n"));
  for (const node of textNodes(root)) {
    const at = node.data.indexOf(CARET_MARK);
    if (at === -1) continue;
    node.deleteData(at, 1);
    const caret = document.createRange();
    caret.setStart(node, at);
    caret.collapse(true);
    placeCaret(root, caret);
    return;
  }
  placeCaret(root, null);
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
