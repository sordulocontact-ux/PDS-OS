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
import { toast } from "@/components/ui/toast";

import { useCaptureShortcut } from "@/components/feedback/use-capture-shortcut";
import { FormDialog } from "@/components/ui/form-dialog";
import type { EditedFeedback, FeedbackKind } from "@/lib/feedback/types";
import { feedback } from "@/lib/i18n/fr/feedback";

const fr = { feedback };

// Heavy and rarely shown: loaded on first opening.
const FeedbackForm = dynamic(() =>
  import("@/components/feedback/feedback-form").then((m) => m.FeedbackForm),
);
const ZoneCapture = dynamic(() =>
  import("@/components/feedback/zone-capture").then((m) => m.ZoneCapture),
);

type OpenOptions = {
  screenshot?: File;
  printScreen?: boolean;
  // A feedback prepared by PO: its text, and the page it was drafted from.
  defaults?: { kind: FeedbackKind | null; message: string };
  pagePath?: string | null;
  // Called once it is sent (PO's card then shows it as sent).
  onSent?: () => void;
  // The viewer's own feedback, already sent, to change.
  editing?: EditedFeedback;
};
type Opening = {
  screenshot: File | null;
  // Opened by the Print Screen key: the capture waits in the clipboard.
  printScreen: boolean;
  pagePath: string | null;
  defaults?: OpenOptions["defaults"];
  onSent?: () => void;
  editing?: EditedFeedback;
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

// The feedback window, one for the whole app. A browser never sees a system
// screenshot (⌘⇧4 on a Mac is taken by macOS), so it opens on what it can
// see: the Print Screen key (Windows), the capture then pasted in its form.
// A paste elsewhere never opens it (it goes to the page's drop zones). The
// C key captures a zone of the page instead, then opens the window with it.
// `direct`: the director, whose feedback goes straight to Notion.
export function FeedbackProvider({
  organizationId,
  personId,
  direct = false,
  children,
}: {
  organizationId: string | null;
  personId: string | null;
  direct?: boolean;
  children: React.ReactNode;
}) {
  const dialog = direct
    ? { ...fr.feedback.dialog, ...fr.feedback.directDialog }
    : fr.feedback.dialog;
  const pathname = usePathname();
  const [opening, setOpening] = useState<Opening | null>(null);
  const [capturing, setCapturing] = useState(false);
  // Read by the document listener, which outlives a render.
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
        editing: options?.editing,
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
    document.addEventListener("keyup", onKeyUp);
    return () => document.removeEventListener("keyup", onKeyUp);
  }, [enabled, open]);

  const startCapture = useCallback(() => setCapturing(true), []);
  const stopCapture = useCallback(() => setCapturing(false), []);
  useCaptureShortcut(enabled && !capturing, startCapture);

  return (
    <FeedbackContext.Provider value={open}>
      {children}
      {capturing && (
        <ZoneCapture
          onCaptured={(file) => {
            setCapturing(false);
            open({ screenshot: file });
          }}
          onFailed={() => {
            setCapturing(false);
            toast.error(fr.feedback.capture.failed);
            open();
          }}
          onCancel={stopCapture}
        />
      )}
      {enabled && organizationId && personId && (
        <FormDialog
          open={opening !== null}
          onOpenChange={(next) => !next && setOpening(null)}
          title={opening?.editing ? fr.feedback.mineEdit.title : dialog.title}
          description={
            opening?.editing
              ? fr.feedback.mineEdit.description
              : dialog.description
          }
          closeLabel={dialog.close}
          // One column: a short form, no need for the wide window (13/11/2026).
          size="medium"
        >
          {opening && (
            <FeedbackForm
              organizationId={organizationId}
              personId={personId}
              pagePath={opening.pagePath}
              initialScreenshot={opening.screenshot}
              printScreen={opening.printScreen}
              defaults={opening.defaults}
              direct={direct}
              editing={opening.editing}
              onSent={(notion) => {
                if (opening.editing)
                  toast.success(fr.feedback.mineEdit.success);
                else if (!notion) toast.success(fr.feedback.success);
                else if (notion.status === "synced")
                  toast.success(fr.feedback.notion.synced);
                else
                  toast.error(fr.feedback.notion.error(notion.reason), {
                    duration: 15000,
                  });
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
