"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { FormDialog } from "@/components/ui/form-dialog";
import type { FeedbackKind } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

// Heavy and rarely shown: loaded on first opening.
const FeedbackForm = dynamic(() =>
  import("@/components/feedback/feedback-form").then((m) => m.FeedbackForm),
);

type OpenOptions = {
  screenshot?: File;
  printScreen?: boolean;
  // A feedback prepared by PO: its text, and the page it was drafted from.
  defaults?: { kind: FeedbackKind | null; message: string };
  pagePath?: string | null;
  // Called once it is sent (PO's card then shows it as sent).
  onSent?: () => void;
};
type Opening = {
  screenshot: File | null;
  // Opened by the Print Screen key: the capture waits in the clipboard.
  printScreen: boolean;
  pagePath: string | null;
  defaults?: OpenOptions["defaults"];
  onSent?: () => void;
};

const FeedbackContext = createContext<((options?: OpenOptions) => void) | null>(
  null,
);

/** Opens the feedback window from anywhere in the app. */
export function useOpenFeedback() {
  const open = useContext(FeedbackContext);
  if (!open) throw new Error("useOpenFeedback outside FeedbackProvider");
  return open;
}

function imageOf(event: ClipboardEvent): File | undefined {
  return [...(event.clipboardData?.files ?? [])].find((file) =>
    file.type.startsWith("image/"),
  );
}

// The feedback window, one for the whole app. A browser never sees a system
// screenshot (⌘⇧4 on a Mac is taken by macOS), so it opens on what it can
// see: the Print Screen key (Windows), and a screenshot pasted anywhere in
// the app (⌘V / Ctrl+V), which it then carries. Pastes inside the window go
// to its own form; `data-paste-ignore` opts a zone out.
export function FeedbackProvider({
  organizationId,
  personId,
  children,
}: {
  organizationId: string | null;
  personId: string | null;
  children: React.ReactNode;
}) {
  const t = fr.feedback.dialog;
  const pathname = usePathname();
  const [opening, setOpening] = useState<Opening | null>(null);
  // Read by the document listeners, which outlive a render.
  const isOpen = useRef(false);
  useEffect(() => {
    isOpen.current = opening !== null;
  }, [opening]);

  const open = useCallback(
    (options?: OpenOptions) =>
      setOpening({
        screenshot: options?.screenshot ?? null,
        printScreen: options?.printScreen ?? false,
        pagePath: options?.pagePath !== undefined ? options.pagePath : pathname,
        defaults: options?.defaults,
        onSent: options?.onSent,
      }),
    [pathname],
  );

  const enabled = Boolean(organizationId && personId);
  useEffect(() => {
    if (!enabled) return;
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen" && !isOpen.current)
        open({ printScreen: true });
    };
    const onPaste = (event: ClipboardEvent) => {
      const image = imageOf(event);
      if (!image || isOpen.current) return;
      if ((event.target as Element | null)?.closest?.("[data-paste-ignore]"))
        return;
      event.preventDefault();
      open({ screenshot: image });
    };
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("paste", onPaste);
    };
  }, [enabled, open]);

  return (
    <FeedbackContext.Provider value={open}>
      {children}
      {enabled && organizationId && personId && (
        <FormDialog
          open={opening !== null}
          onOpenChange={(next) => !next && setOpening(null)}
          title={t.title}
          description={t.description}
          closeLabel={t.close}
        >
          {opening && (
            <FeedbackForm
              organizationId={organizationId}
              personId={personId}
              pagePath={opening.pagePath}
              initialScreenshot={opening.screenshot}
              printScreen={opening.printScreen}
              defaults={opening.defaults}
              onSent={() => {
                toast.success(fr.feedback.success);
                opening.onSent?.();
                setOpening(null);
              }}
              onCancel={() => setOpening(null)}
            />
          )}
        </FormDialog>
      )}
    </FeedbackContext.Provider>
  );
}
