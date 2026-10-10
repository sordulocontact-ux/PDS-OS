"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import {
  deleteCallItem,
  reviewCallItem,
} from "@/lib/production/preprod/actions-items";
import type { CallItem } from "@/lib/production/preprod/types";
import { callItemStatusTone } from "@/lib/ui/state-tones";

import { CallItemForm } from "./call-item-form";
import { RecordMenu } from "./record-menu";

const t = fr.productionPreprod.call;

/**
 * One point of the technical call: its wording, where it comes from (the
 * report's verbatim passage, or « Saisi ») and who decided. A proposal of PO
 * is confirmed or rejected by a person; a rejected one can come back.
 */
export function CallItemRow({
  projectId,
  item,
  topics,
  canOrganize,
  date,
}: {
  projectId: string;
  item: CallItem;
  // The topics a point may be filed under (the form's choices).
  topics: string[];
  canOrganize: boolean;
  // When the decision was taken, formatted by the server.
  date: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const review = (status: "confirmed" | "rejected" | "proposed") =>
    startTransition(async () => {
      const result = await reviewCallItem({
        projectId,
        itemId: item.id,
        status,
      });
      if (!result.ok) toast.error(result.error);
      else
        toast.success(
          {
            confirmed: t.confirmed,
            rejected: t.rejected,
            proposed: t.restored,
          }[status],
        );
    });
  const origin = [
    item.source === "call_report" && item.sourceQuote
      ? t.quote(item.sourceQuote)
      : t.manual,
    item.status !== "proposed" && item.reviewedBy && date
      ? fr.productionPreprod.by(item.reviewedBy, date)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm font-medium break-words">{item.body}</p>
        <p className="text-xs break-words text-muted-foreground">{origin}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.status !== "confirmed" && (
          <StatusBadge tone={callItemStatusTone[item.status]} size="sm">
            {t.statuses[item.status]}
          </StatusBadge>
        )}
        {canOrganize && item.status === "proposed" && (
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => review("rejected")}
            >
              {t.reject}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => review("confirmed")}
            >
              {t.confirm}
            </Button>
          </>
        )}
        {canOrganize && item.status === "rejected" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => review("proposed")}
          >
            {t.restore}
          </Button>
        )}
        {canOrganize && (
          <RecordMenu
            label={item.body.slice(0, 60)}
            edit={{
              title: t.editTitle,
              description: t.formDescription,
              form: (close) => (
                <CallItemForm
                  projectId={projectId}
                  sheetId={null}
                  item={item}
                  topics={topics}
                  onDone={close}
                />
              ),
            }}
            remove={{
              title: t.deleteTitle,
              body: t.deleteBody,
              done: t.deleted,
              run: () => deleteCallItem({ projectId, itemId: item.id }),
            }}
          />
        )}
      </div>
    </li>
  );
}
