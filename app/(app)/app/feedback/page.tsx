import { FeedbackForm } from "@/components/feedback/feedback-form";
import { FeedbackList } from "@/components/feedback/feedback-list";
import { FeedbackTopics } from "@/components/feedback/feedback-topics";
import { FeedbackTriage } from "@/components/feedback/feedback-triage";
import { FeedbackViewToggle } from "@/components/feedback/feedback-view-toggle";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { Card, CardContent } from "@/components/ui/card";
import { can, type Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listMyFeedback, loadFeedbackInbox } from "@/lib/feedback/queries";
import { isAppPath } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";

// Feedback about the app, open to every member: the form, then what was
// already sent. Everyone reads their own; the director (read_feedback)
// reads everyone's, grouped by PO into topics or as sent (?view=all).
export default async function FeedbackPage({
  searchParams,
}: PageProps<"/app/feedback">) {
  const access = await requireApproved();
  const t = fr.feedback;
  const { from, view } = await searchParams;
  const pagePath = typeof from === "string" && isAppPath(from) ? from : null;

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title={t.title} description={t.subtitle} />
      <Card>
        <CardContent>
          <FeedbackForm pagePath={pagePath} />
        </CardContent>
      </Card>
      {can(access, "read_feedback") ? (
        <Received access={access} all={view === "all"} />
      ) : (
        <Mine access={access} />
      )}
    </PageContainer>
  );
}

async function Mine({ access }: { access: Access }) {
  const { items, error } = access.personId
    ? await listMyFeedback(access.personId)
    : { items: [], error: true };
  return (
    <PageSection id="feedback-sent" title={fr.feedback.mine}>
      <FeedbackList items={items} error={error} received={false} />
    </PageSection>
  );
}

async function Received({ access, all }: { access: Access; all: boolean }) {
  const inbox = access.personId
    ? await loadFeedbackInbox(access.personId)
    : { error: true, topics: [], unfiled: [], all: [] };
  const topics = (
    <FeedbackTopics
      topics={inbox.topics}
      unfiled={inbox.unfiled}
      error={inbox.error}
    />
  );

  return (
    <PageSection
      id="feedback-received"
      title={fr.feedback.received}
      action={<FeedbackViewToggle all={all} />}
    >
      {all ? (
        <FeedbackList items={inbox.all} error={inbox.error} received />
      ) : inbox.unfiled.length > 0 ? (
        <FeedbackTriage count={inbox.unfiled.length}>{topics}</FeedbackTriage>
      ) : (
        topics
      )}
    </PageSection>
  );
}
