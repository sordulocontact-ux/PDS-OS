import { FeedbackList } from "@/components/feedback/feedback-list";
import { FeedbackTopics } from "@/components/feedback/feedback-topics";
import { FeedbackTriage } from "@/components/feedback/feedback-triage";
import {
  FeedbackViewToggle,
  type FeedbackView,
} from "@/components/feedback/feedback-view-toggle";
import { NewFeedbackButton } from "@/components/feedback/new-feedback-button";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { can, type Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { listMyFeedback, loadFeedbackInbox } from "@/lib/feedback/queries";
import { isTopicStatus } from "@/lib/feedback/types";
import { fr } from "@/lib/i18n/fr";
import { notionConfigured } from "@/lib/integrations/notion";

// Feedback about the app. Everyone sends through the feedback window and
// reads their own here; the director (read_feedback) reviews the team's,
// grouped by PO, and sends what matters with a priority.
export default async function FeedbackPage({
  searchParams,
}: PageProps<"/app/feedback">) {
  const access = await requireApproved();
  const t = fr.feedback;
  const { view } = await searchParams;
  const reader = can(access, "read_feedback");

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title={t.title}
        description={reader ? t.subtitleReader : t.subtitle}
        action={<NewFeedbackButton />}
      />
      {reader ? (
        <Inbox
          access={access}
          view={view === "all" || isTopicStatus(view) ? view : "new"}
        />
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

async function Inbox({ access, view }: { access: Access; view: FeedbackView }) {
  const t = fr.feedback;
  const inbox = access.personId
    ? await loadFeedbackInbox(access.personId)
    : {
        error: true,
        topics: { new: [], sent: [], dismissed: [] },
        unfiled: [],
        all: [],
      };
  const counts = {
    new: inbox.topics.new.length + inbox.unfiled.length,
    sent: inbox.topics.sent.length,
    dismissed: inbox.topics.dismissed.length,
  };

  let content: React.ReactNode;
  if (view === "all") {
    content = <FeedbackList items={inbox.all} error={inbox.error} received />;
  } else {
    const topics = (
      <FeedbackTopics
        topics={inbox.topics[view]}
        unfiled={view === "new" ? inbox.unfiled : []}
        error={inbox.error}
        emptyBody={t.emptyView[view]}
        notion={notionConfigured()}
      />
    );
    // New feedback may join a topic of any status: PO files it first.
    content =
      inbox.unfiled.length > 0 ? (
        <FeedbackTriage count={inbox.unfiled.length}>{topics}</FeedbackTriage>
      ) : (
        topics
      );
  }

  return (
    <PageSection id="feedback-received" title={t.received}>
      <FeedbackViewToggle view={view} counts={counts} />
      {content}
    </PageSection>
  );
}
