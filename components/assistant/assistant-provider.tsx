"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "@/components/ui/toast";

import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { keepChat, keptChat } from "@/components/assistant/chat-registry";
import type { SavedLink } from "@/components/assistant/draft-forms";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { proposalOf, type DraftProposal } from "@/lib/assistant/drafts";
import { assistant } from "@/lib/i18n/fr/assistant";
import { dialogs } from "@/lib/i18n/fr/dialogs";

const fr = { assistant, dialogs };

// Heavy and rarely shown: the forms load when a draft is opened.
const DraftSheetBody = dynamic(
  () => import("@/components/assistant/draft-sheet-body"),
);

/** Where a conversation opened from a page comes from (MKT-C2-02): the
 * page to go back to and its trail — project, module, section, object. */
export type PoOrigin = { href: string; trail: string[] };

type AssistantContextValue = {
  /** Drafts saved in this tab, by tool call: the card shows the link. */
  saved: Record<string, SavedLink>;
  review: (toolCallId: string, proposal: DraftProposal) => void;
  /** A draft completed outside the review modal (a feedback sent from its card). */
  markSaved: (toolCallId: string, link: SavedLink) => void;
  launcherOpen: boolean;
  /** Opens or closes the window; opened, it listens (Espace Espace). */
  setLauncherOpen: (open: boolean) => void;
  /** Opens the window; `voice: false` = typed, the dictation stays off (a
   * click on the shell's « + » is not a request to speak). */
  openLauncher: (options: { voice: boolean }) => void;
  /** Whether the window listens when it opens. */
  launcherVoice: boolean;
  /** The page the conversation was opened from, if any. */
  origin: PoOrigin | null;
  setOrigin: (origin: PoOrigin | null) => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function useAssistant(): AssistantContextValue {
  const value = useContext(AssistantContext);
  if (!value) throw new Error("useAssistant outside AssistantProvider");
  return value;
}

/**
 * The home PO conversation (one per tab), the Espace Espace window (which
 * opens its own), and the modal where a PO draft is reviewed and saved
 * (docs/ASSISTANT.md § 3 bis). The conversations are saved by
 * /api/assistant in the viewer's history (§ 2 ter), not here.
 */
export function AssistantProvider({
  launcher,
  children,
}: {
  // The Espace Espace window, for a signed-in member only.
  launcher: boolean;
  children: ReactNode;
}) {
  // The tab's conversation (components/assistant/shared-chat.ts) ends with
  // the signed-in shell.
  useEffect(() => () => keepChat(null), []);
  const [saved, setSaved] = useState<Record<string, SavedLink>>({});
  const [launcherOpen, setOpen] = useState(false);
  const [launcherVoice, setLauncherVoice] = useState(true);
  const setLauncherOpen = useCallback((open: boolean) => {
    if (open) setLauncherVoice(true);
    setOpen(open);
  }, []);
  const openLauncher = useCallback(({ voice }: { voice: boolean }) => {
    setLauncherVoice(voice);
    setOpen(true);
  }, []);
  const [origin, setOrigin] = useState<PoOrigin | null>(null);
  const [reviewing, setReviewing] = useState<{
    toolCallId: string;
    proposal: DraftProposal;
  } | null>(null);

  const value = useMemo<AssistantContextValue>(
    () => ({
      saved,
      launcherOpen,
      setLauncherOpen,
      openLauncher,
      launcherVoice,
      origin,
      setOrigin,
      review(toolCallId, proposal) {
        // Never two layers: the window gives way to the panel.
        setLauncherOpen(false);
        setReviewing({ toolCallId, proposal });
      },
      markSaved(toolCallId, link) {
        setSaved((previous) => ({ ...previous, [toolCallId]: link }));
      },
    }),
    [saved, launcherOpen, setLauncherOpen, openLauncher, launcherVoice, origin],
  );

  // The draft after `toolCallId` in the same answer, not saved yet: an
  // artist, its titles and its project proposed together are reviewed one
  // after the other (UX test of 09/10/2026: six forms reopened by hand).
  function nextDraft(toolCallId: string, done: Record<string, SavedLink>) {
    for (const message of keptChat()?.messages ?? []) {
      const drafts = message.parts.flatMap((part) => {
        if (!("toolCallId" in part) || part.state !== "output-available")
          return [];
        const proposal = proposalOf(part.output);
        return proposal ? [{ toolCallId: part.toolCallId, proposal }] : [];
      });
      const at = drafts.findIndex((d) => d.toolCallId === toolCallId);
      if (at < 0) continue;
      return (
        drafts
          .slice(at + 1)
          .find(
            (d) => !done[d.toolCallId] && d.proposal.draft.kind !== "feedback",
          ) ?? null
      );
    }
    return null;
  }

  function onSaved(link: SavedLink) {
    if (!reviewing) return;
    const { toolCallId } = reviewing;
    const done = { ...saved, [toolCallId]: link };
    setSaved(done);
    const next = nextDraft(toolCallId, done);
    setReviewing(next);
    toast.success(
      next
        ? fr.assistant.drafts.savedNext(link.label, next.proposal.title)
        : `${fr.assistant.drafts.saved} : ${link.label}`,
    );
  }

  return (
    <AssistantContext.Provider value={value}>
      {children}
      {launcher && <AssistantLauncher />}
      <Dialog
        open={reviewing !== null}
        onOpenChange={(open) => !open && setReviewing(null)}
      >
        <DialogContent
          side="center"
          closeLabel={fr.dialogs.close}
          className="sm:max-w-[var(--dialog-width-medium)]"
        >
          {reviewing && (
            <DraftSheetBody
              // A new body per draft: forms start from its values.
              key={reviewing.toolCallId}
              proposal={reviewing.proposal}
              onSaved={onSaved}
              onCancel={() => setReviewing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </AssistantContext.Provider>
  );
}
