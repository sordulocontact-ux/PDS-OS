"use client";

import { IconFile } from "nucleo-sharp-essential";

import { DocumentSheetStyle } from "@/components/contracts/document-sheet-style";
import { useObjectUrl } from "@/components/ui/use-object-url";
import { contracts } from "@/lib/i18n/fr/contracts";
import type { DocumentFont } from "@/lib/legal/contracts/document-fonts";
import {
  bodyHtml,
  documentCss,
  sheetCss,
} from "@/lib/legal/contracts/document-layout";

const fr = { contracts };

const SHEET = "contract-preview";
// The PDF's look (document-layout.ts) on a sheet that fits the column: the
// text at its real size, narrower margins.
const SHEET_CSS = `${documentCss(`.${SHEET}`)}${sheetCss(`.${SHEET}`)}
  .${SHEET} { min-height: 0; }
  @media (min-width: 40rem) { .${SHEET} { padding: 32px 36px 40px; } }`;

/**
 * The dropped contract, read beside its form (Sacha 26/11/2026: « mettre
 * le contrat à côté de toutes les infos pour le voir »): a PDF in the
 * browser's reader; a Word file as its text on the contract's sheet, in its
 * typeface; a file whose text could not be read, its name.
 */
export function ContractFilePreview({
  file,
  text,
  font,
}: {
  file: File;
  text: string | null;
  font: DocumentFont | null;
}) {
  const t = fr.contracts.creation;
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const url = useObjectUrl(pdf ? file : null);

  return (
    <div className="flex min-h-[60vh] flex-1 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] lg:min-h-0">
      {pdf && url ? (
        <iframe
          src={`${url}#view=FitH&navpanes=0`}
          title={t.preview(file.name)}
          className="size-full border-0"
        />
      ) : text ? (
        <div className="size-full overflow-y-auto overscroll-contain p-3 sm:p-5">
          <DocumentSheetStyle scope={SHEET} css={SHEET_CSS} font={font} />
          <div
            role="document"
            aria-label={t.preview(file.name)}
            data-font={font ?? undefined}
            className={SHEET}
            // The text escaped, then laid out by document-layout.ts.
            dangerouslySetInnerHTML={{ __html: bodyHtml(text) }}
          />
        </div>
      ) : (
        <div className="m-auto flex max-w-xs flex-col items-center gap-2 p-6 text-center">
          <IconFile aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-sm break-all">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {t.previewUnavailable}
          </p>
        </div>
      )}
    </div>
  );
}
