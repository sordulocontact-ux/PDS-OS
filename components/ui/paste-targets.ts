/**
 * Files pasted (⌘V / Ctrl+V) into the drop zones of the page. One window
 * listener for all of them; each paste goes to a single zone: the one that
 * holds the focus, else the one under the pointer, else the last one
 * touched, else the first of the page. Only zones of the same layer as the
 * focus count (inside the open dialog, or on the page when none is), and a
 * paste already taken (the feedback form) or a text pasted into a text field
 * is left alone. The caller checks the files, as for a drop.
 */

type PasteTarget = {
  element: HTMLElement;
  enabled: () => boolean;
  receive: (files: File[]) => void;
  touched: number;
};

const targets = new Set<PasteTarget>();
const LAYER = '[role="dialog"], [role="alertdialog"]';

const layerOf = (element: Element) => element.closest(LAYER);

const isTextField = (element: Element) =>
  element instanceof HTMLTextAreaElement ||
  (element instanceof HTMLInputElement && element.type !== "file") ||
  (element instanceof HTMLElement && element.isContentEditable);

const domOrder = (a: PasteTarget, b: PasteTarget) =>
  a.element.compareDocumentPosition(b.element) &
  Node.DOCUMENT_POSITION_FOLLOWING
    ? -1
    : 1;

function onPaste(event: ClipboardEvent) {
  const data = event.clipboardData;
  if (event.defaultPrevented || !data) return;
  const files = [...data.files];
  if (files.length === 0) return;
  const focus = event.target instanceof Element ? event.target : document.body;
  // Cells copied from a sheet carry a picture too: the text wins in a field.
  if (isTextField(focus) && data.types.includes("text/plain")) return;

  const layer = layerOf(focus);
  const candidates = [...targets]
    .filter(
      (t) =>
        t.element.isConnected && t.enabled() && layerOf(t.element) === layer,
    )
    .sort(domOrder);
  const lastTouched = candidates.reduce<PasteTarget | undefined>(
    (best, t) => (t.touched > (best?.touched ?? 0) ? t : best),
    undefined,
  );
  const target =
    candidates.find((t) => t.element.contains(focus)) ??
    candidates.find((t) => t.element.matches(":hover")) ??
    lastTouched ??
    candidates[0];
  if (!target) return;
  event.preventDefault();
  target.receive(files);
}

/** Makes `element` take pasted files; returns the cleanup. */
export function registerPasteTarget(
  element: HTMLElement,
  options: Pick<PasteTarget, "enabled" | "receive">,
) {
  const target: PasteTarget = { element, ...options, touched: 0 };
  const touch = () => {
    target.touched = Date.now();
  };
  element.addEventListener("pointerenter", touch);
  element.addEventListener("focusin", touch);
  if (targets.size === 0) window.addEventListener("paste", onPaste);
  targets.add(target);

  return () => {
    element.removeEventListener("pointerenter", touch);
    element.removeEventListener("focusin", touch);
    targets.delete(target);
    if (targets.size === 0) window.removeEventListener("paste", onPaste);
  };
}
