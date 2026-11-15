"use client";

import {
  IconImages2,
  IconPaperclip,
  IconUnorderedList,
} from "nucleo-sharp-essential";
import { useRef } from "react";

import type { ReceiptsLayout } from "@/components/finance/receipts/use-receipts-layout";
import { Button } from "@/components/ui/button";
import {
  SegmentedControl,
  SegmentedLinks,
} from "@/components/ui/segmented-control";
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
 * Rattachés / Tous » with their counts, grid or list, « Déposer » (a file
 * picker; dropping anywhere on the page does the same).
 */
export function ReceiptsToolbar({
  view,
  counts,
  layout,
  onLayout,
  canManage,
  busy,
  onFiles,
}: {
  view: ProofView;
  counts: Record<ProofView, number>;
  layout: ReceiptsLayout;
  onLayout: (layout: ReceiptsLayout) => void;
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
      <SegmentedControl<ReceiptsLayout>
        aria-label={t.layout.label}
        value={layout}
        onChange={(next) => next && onLayout(next)}
        options={[
          {
            value: "grid",
            label: (
              <>
                <IconImages2 aria-hidden className="size-4" />
                <span className="sr-only">{t.layout.grid}</span>
              </>
            ),
          },
          {
            value: "list",
            label: (
              <>
                <IconUnorderedList aria-hidden className="size-4" />
                <span className="sr-only">{t.layout.list}</span>
              </>
            ),
          },
        ]}
      />
      {canManage && (
        <>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
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
