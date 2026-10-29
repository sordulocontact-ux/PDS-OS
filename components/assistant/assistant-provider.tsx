"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { keepChat, keptChat } from "@/components/assistant/chat-registry";
import type { SavedLink } from "@/components/assistant/draft-forms";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { proposalOf, type DraftProposal } from "@/lib/assistant/drafts";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

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
  /** A draft completed outside the side panel (a feedback sent from its card). */
  markSaved: (toolCallId: string, link: SavedLink) => void;
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
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
 * opens its own), and the side panel where a PO draft is reviewed and saved
 * (docs/ASSISTANT.md § 3 bis). Nothing here is stored: it lives in the tab.
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
  const [launcherOpen, setLauncherOpen] = useState(false);
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
    [saved, launcherOpen, origin],
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
      <Sheet
        open={reviewing !== null}
        onOpenChange={(open) => !open && setReviewing(null)}
      >
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
          {reviewing && (
            <DraftSheetBody
              // A new body per draft: forms start from its values.
              key={reviewing.toolCallId}
              proposal={reviewing.proposal}
              onSaved={onSaved}
              onCancel={() => setReviewing(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </AssistantContext.Provider>
  );
}
