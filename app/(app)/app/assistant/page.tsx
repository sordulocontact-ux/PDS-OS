import { AssistantConversation } from "@/components/assistant/assistant-conversation";
import { listConversations } from "@/lib/assistant/conversations";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.assistant.conversation.pageTitle} · ${fr.app.name}`,
};

// The tab's conversation (AssistantProvider, in the layout) and the
// viewer's history (docs/ASSISTANT.md § 2 ter).
export default async function AssistantPage() {
  const access = await requireApproved();
  const conversations = access.personId
    ? await listConversations(access.personId)
    : [];
  return <AssistantConversation conversations={conversations} />;
}
