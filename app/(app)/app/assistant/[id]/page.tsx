import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AssistantConversation } from "@/components/assistant/assistant-conversation";
import {
  getConversation,
  listConversations,
} from "@/lib/assistant/conversations";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.assistant.conversation.pageTitle} · ${fr.app.name}`,
};

// A conversation reopened from the history, where it stopped (docs/
// ASSISTANT.md § 2 ter). One deleted, or someone else's (RLS: none), opens
// PO on a new conversation.
export default async function AssistantConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const access = await requireApproved();
  const [saved, conversations] = await Promise.all([
    getConversation(id),
    access.personId ? listConversations(access.personId) : [],
  ]);
  if (!saved) redirect(routes.assistant);
  // One instance per conversation: going from one to another reopens it.
  return (
    <AssistantConversation
      key={saved.id}
      conversations={conversations}
      saved={saved}
    />
  );
}
