"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { routes } from "@/lib/auth/redirects";
import { FINANCE_FILE_ACCEPT } from "@/lib/finance/file-rules";
import { PROOF_VIEWS, type ProofView } from "@/lib/finance/proof-view";
import { financeReceipts } from "@/lib/i18n/fr/finance-receipts";

const t = financeReceipts;
const VIEW_LABEL: Record<ProofView, string> = {
  "a-traiter": t.views.open,
  rattaches: t.views.attached,
  tous: t.views.all,
};

/**
 * The tools beside the search (proto, page Justificatifs): « À traiter /
 * Rattachés / Tous » with their counts, « Déposer » as the main button (a file
 * picker; dropping anywhere on the page does the same).
 */
export function ReceiptsToolbar({
  view,
  counts,
  canManage,
  busy,
  onFiles,
}: {
  view: ProofView;
  counts: Record<ProofView, number>;
  canManage: boolean;
  busy: boolean;
  onFiles: (files: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <SegmentedLinks
        label={t.views.label}
        options={PROOF_VIEWS.map((key) => ({
          key,
          href: `${routes.financeReceipts}?vue=${key}`,
          label: (
            <>
              {VIEW_LABEL[key]}
              <span className="text-[color:var(--text-tertiary)] tabular-nums">
                {counts[key]}
              </span>
            </>
          ),
          current: view === key,
        }))}
      />
      {canManage && (
        <>
          {/* The page's main gesture (Sacha 15/11/2026). */}
          <Button disabled={busy} onClick={() => input.current?.click()}>
            <IconPaperclip aria-hidden data-icon="inline-start" />
            {t.drop}
          </Button>
          <input
            ref={input}
            type="file"
            multiple
            accept={FINANCE_FILE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              onFiles(files);
            }}
          />
        </>
      )}
    </>
  );
}
