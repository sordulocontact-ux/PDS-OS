"use client";

import { IconFile } from "nucleo-sharp-essential";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { GmailMemo } from "@/lib/deals/gmail-memos";
import { dealGmailMemos, fileGmailMemo } from "@/lib/deals/gmail-memo-actions";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { formatInstantDay } from "@/lib/utils/instant";

const t = dealMemos.gmail;

// « Léa Martin <lea@label.fr> » → « Léa Martin ».
const nameOf = (from: string) =>
  from
    .replace(/<[^>]*>/, "")
    .replace(/"/g, "")
    .trim() || from.replace(/[<>]/g, "").trim();

/**
 * The deal memo the label sent to the negotiator's own address (Sacha
 * 23/11/2026), found in her Gmail after the page shows (never stored): one
 * card per mail, « Ranger dans le deal » copies its PDFs into the deal as
 * the memo « À valider ». Nothing found, nothing shown.
 */
export function DealGmailMemos({ dealId }: { dealId: string }) {
  const [memos, setMemos] = useState<GmailMemo[]>([]);
  const file = useWriteSubmit(undefined, t.filed);
  useEffect(() => {
    let live = true;
    dealGmailMemos(dealId)
      .then((found) => live && setMemos(found))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [dealId]);
  if (memos.length === 0) return null;
  return (
    <div className="flex w-full flex-col gap-2">
      {memos.map((m) => (
        <DocumentCard
          key={m.key}
          icon={IconFile}
          name={m.files.map((f) => f.name).join(", ")}
          line={t.found(nameOf(m.from), formatInstantDay(m.receivedAt))}
          action={
            <Button
              size="sm"
              disabled={file.pending}
              aria-busy={file.pending || undefined}
              onClick={() =>
                file.run(async () => {
                  const result = await fileGmailMemo(
                    dealId,
                    m.account,
                    m.messageId,
                  );
                  if (result.ok)
                    setMemos((all) => all.filter((x) => x.key !== m.key));
                  return result;
                })
              }
            >
              {file.pending ? t.filing : t.file}
            </Button>
          }
        />
      ))}
      {file.error && (
        <p className="text-[length:var(--type-caption)] text-[color:var(--tone-danger-fg)]">
          {file.error}
        </p>
      )}
    </div>
  );
}
