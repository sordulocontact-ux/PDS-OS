"use client";

import {
  FileImport,
  FileImportButton,
} from "@/components/catalog/files/file-import";
import { fr } from "@/lib/i18n/fr";

const t = fr.masterSource;

/** « Les versions audio du titre au Catalogue… » and « Importer une
 * version » (the title's own audio import, manage_catalog). */
export function SourceImport({
  organizationId,
  masterId,
}: {
  organizationId: string | null;
  masterId: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
        {t.catalogNote}
      </p>
      {organizationId && (
        <FileImport
          organizationId={organizationId}
          owner={{ kind: "master", id: masterId }}
          audio={{ defaultState: "demo" }}
        >
          <FileImportButton compact label={t.importVersion} />
        </FileImport>
      )}
    </div>
  );
}
