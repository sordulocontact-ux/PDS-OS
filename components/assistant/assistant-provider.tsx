"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import dynamic from "next/dynamic";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import type { SavedLink } from "@/components/assistant/draft-forms";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { DraftProposal } from "@/lib/assistant/drafts";
import { fr } from "@/lib/i18n/fr";

// Heavy and rarely shown: the forms load when a draft is opened.
const DraftSheetBody = dynamic(
  () => import("@/components/assistant/draft-sheet-body"),
);

type AssistantContextValue = {
  chat: Chat<UIMessage>;
  /** Drafts saved in this tab, by tool call: the card shows the link. */
  saved: Record<string, SavedLink>;
  review: (toolCallId: string, proposal: DraftProposal) => void;
  /** A draft completed outside the side panel (a feedback sent from its card). */
  markSaved: (toolCallId: string, link: SavedLink) => void;
  launcherOpen: boolean;
  setLauncherOpen: (open: boolean) => void;
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
  const [chat] = useState(
    () =>
      new Chat<UIMessage>({
        transport: new DefaultChatTransport({ api: "/api/assistant" }),
      }),
  );
  const [saved, setSaved] = useState<Record<string, SavedLink>>({});
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [reviewing, setReviewing] = useState<{
    toolCallId: string;
    proposal: DraftProposal;
  } | null>(null);

  const value = useMemo<AssistantContextValue>(
    () => ({
      chat,
      saved,
      launcherOpen,
      setLauncherOpen,
      review(toolCallId, proposal) {
        // Never two layers: the window gives way to the panel.
        setLauncherOpen(false);
        setReviewing({ toolCallId, proposal });
      },
      markSaved(toolCallId, link) {
        setSaved((previous) => ({ ...previous, [toolCallId]: link }));
      },
    }),
    [chat, saved, launcherOpen],
  );

  function onSaved(link: SavedLink) {
    if (!reviewing) return;
    const { toolCallId } = reviewing;
    setSaved((previous) => ({ ...previous, [toolCallId]: link }));
    setReviewing(null);
    toast.success(`${fr.assistant.drafts.saved} : ${link.label}`);
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
