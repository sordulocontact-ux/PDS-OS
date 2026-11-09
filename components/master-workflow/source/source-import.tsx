"use client";

import {
  FileImport,
  FileImportButton,
} from "@/components/catalog/files/file-import";
import { masterSource } from "@/lib/i18n/fr/master-source";
import { cn } from "@/lib/utils";

const fr = { masterSource };

const t = fr.masterSource;

/** « Les versions audio du titre au Catalogue… » and « Importer une
 * version » (the title's own audio import, manage_catalog). `first`: the
 * title has no audio yet, the import is the step's gesture — its sentence
 * and the main button (Akili's feedback of 02/11/2026). */
export function SourceImport({
  organizationId,
  masterId,
  first = false,
}: {
  organizationId: string | null;
  masterId: string;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        first
          ? "items-start gap-3"
          : "gap-2 sm:flex-row sm:items-center sm:justify-between",
      )}
    >
      <p
        className={cn(
          "text-[color:var(--text-secondary)]",
          first
            ? "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]"
            : "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)]",
        )}
      >
        {first ? t.noAudio : t.catalogNote}
      </p>
      {organizationId && (
        <FileImport
          organizationId={organizationId}
          owner={{ kind: "master", id: masterId }}
          audio={{ defaultState: "demo" }}
        >
          <FileImportButton compact={!first} label={t.importVersion} />
        </FileImport>
      )}
    </div>
  );
}
