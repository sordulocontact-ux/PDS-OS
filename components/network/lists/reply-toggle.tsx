"use client";

import { IconCheck } from "nucleo-sharp-essential";
import { useOptimistic, useTransition } from "react";

import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { networkLists } from "@/lib/i18n/fr/network-lists";
import { setNetworkListReply } from "@/lib/network/lists-actions";
import type { NetworkListReply } from "@/lib/network/lists-types";
import { networkListReplyTone } from "@/lib/ui/state-tones";

const fr = { networkLists };

/**
 * A person's reply in a list (Ibé's hourglass and green tick): its badge,
 * which switches in one click for who keeps the list up (shown at once,
 * put back if the database refuses). Read only otherwise.
 */
export function ReplyToggle({
  listId,
  contactId,
  name,
  reply,
  canChange,
}: {
  listId: string;
  contactId: string;
  name: string;
  reply: NetworkListReply;
  canChange: boolean;
}) {
  const t = fr.networkLists;
  const [shown, setShown] = useOptimistic(reply);
  const [, startTransition] = useTransition();
  const badge = (
    <StatusBadge tone={networkListReplyTone[shown]} dot={shown === "waiting"}>
      {shown === "replied" && <IconCheck aria-hidden className="size-3.5" />}
      {t.replies[shown]}
    </StatusBadge>
  );
  if (!canChange) return badge;

  const next: NetworkListReply = shown === "replied" ? "waiting" : "replied";
  return (
    <button
      type="button"
      // Above the row's stretched link (DataTableLink).
      className="relative z-10 cursor-pointer rounded-pill outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
      aria-label={t.replyToggle(name, t.replies[next])}
      title={t.replyToggle(name, t.replies[next])}
      onClick={() =>
        startTransition(async () => {
          setShown(next);
          const result = await setNetworkListReply({
            listId,
            contactId,
            reply: next,
          });
          if (!result.ok) toast.error(result.error);
        })
      }
    >
      {badge}
    </button>
  );
}
