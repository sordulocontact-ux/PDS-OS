"use client";

import { useState } from "react";

import { IconDisc } from "@/components/icons";
import { OptionSelect } from "@/components/projects/option-select";
import { DocumentCard } from "@/components/ui/document-card";
import { catalog } from "@/lib/i18n/fr/catalog";
import { masterSource } from "@/lib/i18n/fr/master-source";
import type { SourceVersion } from "@/lib/master-workflow/source-step";
import { formatShortDay } from "@/lib/utils/day";

import { SourceAudioFile } from "./source-audio";

const fr = { catalog, masterSource };

const t = fr.masterSource;

/**
 * The version the mix starts from: shown as the document it is (the same
 * `DocumentCard` as the newer source and the mix versions), to listen to
 * on the spot — never a lone radio already ticked (Sacha, 09/11/2026). The
 * newest is chosen; « Partir d'une autre version » only when the Catalogue
 * has others, then « Importer une version » when the right one is missing:
 * all about the version in one place, the submit alone below (Sacha,
 * 09/11/2026).
 */
export function SourceVersionPick({
  id,
  candidates,
  value,
  onChange,
  imports,
}: {
  id: string;
  // Newest first: the first is the detected one.
  candidates: SourceVersion[];
  value: string;
  onChange: (fileId: string) => void;
  imports?: React.ReactNode;
}) {
  // Uncontrolled menu: its first value only, so it never remounts.
  const [initial] = useState(value);
  const index = Math.max(
    0,
    candidates.findIndex((c) => c.id === value),
  );
  const chosen = candidates[index];
  // « v3 »: its rank among the title's versions, oldest first.
  const rank = (i: number) => candidates.length - i;
  if (!chosen) return null;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold">{index === 0 ? t.detected : t.chosen}</h3>
      <DocumentCard
        name={chosen.fileName}
        icon={IconDisc}
        line={t.versionMeta(
          rank(index),
          fr.catalog.audioStates[chosen.audioState],
          chosen.addedBy,
          formatShortDay(chosen.createdAt),
          index === 0,
        )}
      >
        {chosen.listenUrl && (
          <div className="p-3.5">
            <SourceAudioFile
              name={chosen.fileName}
              listenUrl={chosen.listenUrl}
              downloadUrl={chosen.downloadUrl}
            />
          </div>
        )}
      </DocumentCard>
      {candidates.length > 1 && (
        <OptionSelect
          id={`source-version-${id}`}
          name={`source-${id}`}
          label={t.otherVersion}
          items={Object.fromEntries(
            candidates.map((c, i) => [
              c.id,
              t.versionOption(
                rank(i),
                fr.catalog.audioStates[c.audioState],
                c.fileName,
              ),
            ]),
          )}
          defaultValue={initial}
          onValueChange={onChange}
        />
      )}
      {imports}
    </div>
  );
}
