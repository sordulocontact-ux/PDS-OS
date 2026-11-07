"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  reviewFeedbackTopic,
  syncFeedbackTopicToNotion,
} from "@/lib/feedback/actions";
import {
  awaitsNotion,
  FEEDBACK_PRIORITIES,
  type FeedbackPriority,
  type FeedbackTopic,
  type TopicAction,
} from "@/lib/feedback/types";
import { feedback } from "@/lib/i18n/fr/feedback";

const fr = { feedback };

// Rarely opened: loaded on first use.
const TopicEditForm = dynamic(() =>
  import("@/components/feedback/topic-edit-form").then((m) => m.TopicEditForm),
);

// The director's decision on a topic. Before sending (to review or
// dismissed): edit its text, alone or with PO. To review: send it with a
// priority (one menu, one click) or dismiss it. Sent: change its priority.
// Dismissed: bring it back to review.
// Sent, and Notion configured: its page, and a button to publish it again
// when it failed or new feedback joined since (the card's main action).
export function TopicActions({
  topic,
  notion,
}: {
  topic: FeedbackTopic;
  notion: boolean;
}) {
  const t = fr.feedback;
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const run = (action: TopicAction, priority?: FeedbackPriority) =>
    startTransition(async () => {
      const result = await reviewFeedbackTopic(topic.id, action, priority);
      if (!result.ok) toast.error(t.actions.failed);
      else if (result.notion?.status === "synced")
        toast.success(t.notion.synced);
      else if (result.notion)
        toast.error(t.notion.failed(result.notion.reason), { duration: 15000 });
    });

  const publish = () =>
    startTransition(async () => {
      const { notion: result } = await syncFeedbackTopicToNotion(topic.id);
      if (result.status === "synced") toast.success(t.notion.synced);
      else toast.error(t.notion.error(result.reason), { duration: 15000 });
    });

  const priorityMenu = (label: string, action: "send" | "prioritize") => (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        render={
          <Button
            size="sm"
            variant={action === "send" ? "default" : "outline"}
            aria-busy={pending || undefined}
          />
        }
      >
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {FEEDBACK_PRIORITIES.map((priority) => (
          <DropdownMenuItem
            key={priority}
            disabled={topic.priority === priority}
            onClick={() => run(action, priority)}
          >
            {t.actions.sendWith(t.priorities[priority])}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {topic.status !== "sent" && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing(true)}
          >
            {t.actions.edit}
          </Button>
          <FormDialog
            open={editing}
            onOpenChange={setEditing}
            title={t.edit.title}
            description={t.edit.description}
            closeLabel={t.edit.close}
          >
            <TopicEditForm
              topic={topic}
              onSaved={() => {
                toast.success(t.edit.saved);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </FormDialog>
        </>
      )}
      {topic.status === "new" && (
        <>
          {priorityMenu(t.actions.send, "send")}
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run("dismiss")}
          >
            {t.actions.dismiss}
          </Button>
        </>
      )}
      {topic.status === "sent" &&
        priorityMenu(t.actions.changePriority, "prioritize")}
      {notion && awaitsNotion(topic) && (
        <Button
          size="sm"
          variant="default"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={publish}
        >
          {topic.notionError
            ? t.notion.retry
            : topic.notionSynced
              ? t.notion.update
              : t.notion.send}
        </Button>
      )}
      {topic.status === "sent" && topic.notionUrl && (
        <a
          href={topic.notionUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium underline underline-offset-4"
        >
          {t.notion.open}
        </a>
      )}
      {topic.status === "dismissed" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run("reopen")}
        >
          {t.actions.reopen}
        </Button>
      )}
    </div>
  );
}
