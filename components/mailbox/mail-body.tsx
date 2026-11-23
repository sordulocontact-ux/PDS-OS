"use client";

import { useEffect, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Skeleton } from "@/components/ui/skeleton";
import { mailbox } from "@/lib/i18n/fr/mailbox";
import { readMailboxBody } from "@/lib/mailbox/read-actions";

const fr = { mailbox };

type Body = { id: string; text: string } | { id: string; error: string };

/**
 * The text of a mail, loaded when its panel opens. Plain text only, never
 * the mail's HTML, and a mail's words are data: shown, never run.
 */
export function MailBody({ id }: { id: string }) {
  const t = fr.mailbox.sheet;
  const [body, setBody] = useState<Body | null>(null);

  useEffect(() => {
    let cancelled = false;
    readMailboxBody(id)
      .then((result) => {
        if (cancelled) return;
        setBody(
          result.ok ? { id, text: result.text } : { id, error: result.error },
        );
      })
      .catch(() => {
        if (!cancelled) setBody({ id, error: t.bodyError });
      });
    return () => {
      cancelled = true;
    };
  }, [id, t.bodyError]);

  // A body of another mail (the panel moved on) is a body not loaded yet.
  const current = body?.id === id ? body : null;
  if (!current)
    return (
      <div
        role="status"
        aria-label={t.bodyLoading}
        className="flex flex-col gap-2"
      >
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  if ("error" in current)
    return <FormMessage kind="error">{current.error}</FormMessage>;
  if (!current.text.trim())
    return <p className="text-[color:var(--text-secondary)]">{t.bodyEmpty}</p>;
  return <p className="break-words whitespace-pre-wrap">{current.text}</p>;
}
