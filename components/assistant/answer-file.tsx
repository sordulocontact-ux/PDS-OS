"use client";

import { IconFile, IconLoader } from "nucleo-sharp-essential";
import { useState } from "react";

import { IconDownload } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { downloadPdf } from "@/components/ui/pdf-export-button";
import type { FileDisplay } from "@/lib/assistant/display";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";

const fr = { assistantShow };

/**
 * A file PO prepared (export_list, make_pdf): its name, what it is, and
 * « Télécharger ». The file is made only when asked, with the viewer's
 * session; a text laid out as a PDF goes in the request's body. The
 * download says when it is being prepared (a PDF takes a few seconds) and
 * when it failed, by toast, as « Exporter en PDF ».
 */
export function AnswerFile({ file }: { file: FileDisplay }) {
  const t = fr.assistantShow.files;
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      await downloadPdf(file.href, file.fileName, t.failed, {
        csv: file.format === "csv",
        init: file.text
          ? {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(file.text),
            }
          : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label={file.label}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
      >
        <IconFile className="size-4" />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="truncate text-sm font-medium">{file.label}</p>
        <p className="text-caption text-muted-foreground">{file.detail}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={busy}
        aria-busy={busy}
        onClick={download}
      >
        {busy ? (
          <IconLoader aria-hidden className="animate-spin" />
        ) : (
          <IconDownload aria-hidden />
        )}
        {busy ? t.preparing : t.download}
      </Button>
    </section>
  );
}
