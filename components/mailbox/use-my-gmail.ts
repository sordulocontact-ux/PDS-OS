"use client";

import { useEffect, useState } from "react";

import { loadMyGmail } from "@/lib/mailbox/gmail-actions";
import type { MailboxMessage } from "@/lib/mailbox/types";

export type MyGmail =
  | { state: "off" }
  | { state: "loading" }
  | { state: "ready"; messages: MailboxMessage[]; failed: string[] };

/**
 * The member's own Gmail, asked once the page shows (Sacha 23/11/2026: the
 * page must not wait for Gmail): `off` without a Gmail account connected.
 */
export function useMyGmail(enabled: boolean): MyGmail {
  const [gmail, setGmail] = useState<MyGmail>(
    enabled ? { state: "loading" } : { state: "off" },
  );
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadMyGmail()
      .then((result) => {
        if (!cancelled) setGmail({ state: "ready", ...result });
      })
      .catch(() => {
        if (!cancelled)
          setGmail({ state: "ready", messages: [], failed: ["Gmail"] });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return gmail;
}
