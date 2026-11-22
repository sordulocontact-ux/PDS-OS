"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { Loaded } from "@/components/ui/loaded";
import { routes } from "@/lib/auth/redirects";
import { loadCallPassages } from "@/lib/calls/passage-actions";
import { passageOf, type Passage } from "@/lib/calls/passages";
import { calls } from "@/lib/i18n/fr/calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { formatTimestamp } from "@/lib/labo/format";
import { cn } from "@/lib/utils";

const fr = { calls, dialogs };

/** The lines, the quoted one marked and brought into view at once. */
function Lines({ passages, quote }: { passages: Passage[]; quote: string }) {
  const at = passageOf(passages, quote);
  const marked = useRef<HTMLLIElement>(null);
  useEffect(() => {
    marked.current?.scrollIntoView({ block: "center" });
  }, []);
  return (
    <ol className="flex flex-col gap-1">
      {passages.map((p, i) => (
        <li
          key={i}
          ref={i === at ? marked : undefined}
          aria-current={i === at ? "true" : undefined}
          className={cn(
            "grid grid-cols-[2.75rem_minmax(0,1fr)] gap-3 rounded-md px-2 py-1.5 text-body-md",
            i === at &&
              "bg-[var(--tone-info-bg)] text-[color:var(--tone-info-fg)]",
          )}
        >
          <span className="pt-0.5 font-mono text-caption text-[color:var(--text-tertiary)] tabular-nums">
            {p.at !== null ? formatTimestamp(p.at) : ""}
          </span>
          <span className="min-w-0 break-words">
            {p.speaker && <span className="font-semibold">{p.speaker} : </span>}
            {p.text}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A passage PO quotes, opened in its call's transcript (Sacha 22/11/2026:
 * « ça ouvre une modale de la transcription et c'est déjà à l'endroit de la
 * phrase »): the whole exchange line by line, who spoke and when, the quoted
 * line marked and scrolled to; « Ouvrir le call » for the rest.
 */
export function TranscriptPassageDialog({
  open,
  onOpenChange,
  callId,
  title,
  quote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  // The call's name and day (« Call · Rivo Blanc · Mirage, 22 nov. »).
  title: string;
  quote: string;
}) {
  const t = fr.calls.transcript;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={fr.dialogs.close}
      size="medium"
    >
      {open && (
        <div className="flex flex-col gap-4">
          <Loaded
            load={() => loadCallPassages(callId)}
            loadingLabel={t.loading}
            errorLabel={t.error}
          >
            {(passages) => <Lines passages={passages} quote={quote} />}
          </Loaded>
          <Link
            href={routes.call(callId)}
            className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          >
            {t.open}
          </Link>
        </div>
      )}
    </FormDialog>
  );
}
