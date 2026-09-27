import { AssistantConversation } from "@/components/assistant/assistant-conversation";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

export const metadata = {
  title: `${fr.assistant.conversation.pageTitle} · ${fr.app.name}`,
};

// The conversation lives in the tab (AssistantProvider, in the layout): the
// page only checks access and shows it.
export default async function AssistantPage() {
  await requireApproved();
  return <AssistantConversation />;
}
