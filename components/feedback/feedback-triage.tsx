"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { triageFeedback } from "@/lib/feedback/actions";
import { fr } from "@/lib/i18n/fr";

// Before the director reads the topics, PO files the new feedback (one call
// per opening). While it works, the list waits behind a status line; then
// the page reloads its data. If PO fails, the list shows at once with the
// new feedback still waiting, and a retry.
export function FeedbackTriage({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  const t = fr.feedback.triage;
  const router = useRouter();
  // The reason shown when PO failed: the quota's sentence, else the generic one.
  const [failed, setFailed] = useState<string | null>(null);
  const [, startRefresh] = useTransition();
  const started = useRef(false);

  const run = () =>
    triageFeedback().then(
      (result) => {
        if (result.ok) startRefresh(() => router.refresh());
        else setFailed(result.error ?? t.failed);
      },
      () => setFailed(t.failed),
    );

  useEffect(() => {
    // Once per opening, even when React mounts effects twice in development.
    if (started.current) return;
    started.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <FormMessage kind="error" className="flex-1">
            {failed}
          </FormMessage>
          <Button
            variant="outline"
            onClick={() => {
              setFailed(null);
              void run();
            }}
          >
            {t.retry}
          </Button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <p
      role="status"
      aria-busy
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-muted-foreground"
    >
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full bg-current motion-safe:animate-pulse"
      />
      {t.running(count)}
    </p>
  );
}
