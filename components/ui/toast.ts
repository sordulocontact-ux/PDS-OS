import type { ReactNode } from "react";

/**
 * The app's toasts, without a library (docs/DESIGN.md § 4, « Toast »).
 * `toast()` can be called from any client code; `Toaster` (mounted once in
 * the root layout) reads this store and shows the stack.
 */

export type ToastTone = "default" | "success" | "error" | "warning" | "info";
export type ToastAction = { label: string; onClick: () => void };
export type ToastOptions = {
  /** Same id = the same toast, updated in place (a notification shown twice). */
  id?: string | number;
  /** Second line; line breaks are kept. */
  description?: ReactNode;
  /** In ms; `Infinity` keeps it until it is closed. */
  duration?: number;
  /** One gesture next to the text (« Annuler », « Ouvrir »); clicking it closes the toast. */
  action?: ToastAction;
};
/** How a toast leaves: down (the front one), sideways (swiped), or a fade. */
export type ToastExit = "fall" | "swipe" | "fade";
export type ToastItem = {
  id: string;
  tone: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  action?: ToastAction;
  duration: number;
  /** Bumped when the same toast is shown again: its timer starts over. */
  version: number;
  exit: ToastExit | null;
};

/** At most three on screen: the oldest fades out. */
export const TOASTS_VISIBLE = 3;
/** Matches the exit transition of `.toast-card` (app/globals.css). */
const EXIT_MS = 220;
/** An error is read, not glanced at; a gesture needs time to be reached. */
const DURATIONS: Record<ToastTone, number> = {
  default: 4000,
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};
const WITH_ACTION = 8000;

// Newest first.
let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let counter = 0;
const NONE: ToastItem[] = [];

function emit(next: ToastItem[]) {
  items = next;
  listeners.forEach((listener) => listener());
}

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export const readToasts = () => items;
export const readNoToasts = () => NONE;

function leave(ids: string[], how: ToastExit) {
  if (ids.length === 0) return;
  emit(
    items.map((item) =>
      ids.includes(item.id) && !item.exit ? { ...item, exit: how } : item,
    ),
  );
  setTimeout(() => {
    emit(items.filter((item) => !(ids.includes(item.id) && item.exit)));
  }, EXIT_MS);
}

function show(tone: ToastTone, title: ReactNode, options: ToastOptions = {}) {
  const { description, action } = options;
  const duration =
    options.duration ??
    Math.max(DURATIONS[tone], action ? WITH_ACTION : 0);
  const key = options.id === undefined ? undefined : String(options.id);
  // The same id, or the same words still on screen (a double click): that
  // toast comes back to the front, never a second copy.
  const same = items.find(
    (item) =>
      !item.exit &&
      (key !== undefined
        ? item.id === key
        : typeof title === "string" &&
          item.title === title &&
          item.tone === tone &&
          item.description === description),
  );
  if (same) {
    const updated: ToastItem = {
      ...same,
      tone,
      title,
      description,
      action,
      duration,
      version: same.version + 1,
    };
    emit([updated, ...items.filter((item) => item !== same)]);
    return same.id;
  }
  const id = key ?? `toast-${++counter}`;
  emit([
    { id, tone, title, description, action, duration, version: 0, exit: null },
    // A toast of the same id still leaving: replaced at once.
    ...items.filter((item) => item.id !== id),
  ]);
  const overflow = items
    .filter((item) => !item.exit)
    .slice(TOASTS_VISIBLE)
    .map((item) => item.id);
  leave(overflow, "fade");
  return id;
}

/** Closes one toast, or all of them without an id. */
export function dismissToast(id?: string, how: ToastExit = "fall") {
  leave(
    id === undefined
      ? items.filter((item) => !item.exit).map((item) => item.id)
      : [id],
    how,
  );
}

type Show = (title: ReactNode, options?: ToastOptions) => string;
const tone =
  (name: ToastTone): Show =>
  (title, options) =>
    show(name, title, options);

export const toast = Object.assign(tone("default"), {
  message: tone("default"),
  success: tone("success"),
  error: tone("error"),
  warning: tone("warning"),
  info: tone("info"),
  dismiss: (id?: string | number) =>
    dismissToast(id === undefined ? undefined : String(id)),
});
