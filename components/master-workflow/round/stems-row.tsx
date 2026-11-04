"use client";

import { useRouter } from "next/navigation";

import {
  FileImport,
  useFileImportPick,
} from "@/components/catalog/files/file-import";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { masterRound } from "@/lib/i18n/fr/master-round";

const fr = { masterRound };

const t = fr.masterRound.before;

/**
 * « Pistes séparées · Manquant » for one title, before the mix is sent:
 * the whole row picks files and files them as the title's stems in the
 * Catalogue (« Fichiers de travail »), no button beside it. Without
 * manage_catalog (`organizationId` null), the row only says what is missing.
 */
export function MissingStemsRow({
  organizationId,
  masterId,
  title,
}: {
  organizationId: string | null;
  masterId: string;
  title: string;
}) {
  const router = useRouter();
  if (!organizationId) return <Row title={title} />;
  return (
    <FileImport
      organizationId={organizationId}
      owner={{ kind: "master", id: masterId }}
      view="stems"
      categories={["stems"]}
      basePath={`/app/catalog/masters/${masterId}/files`}
      onAdded={() => router.refresh()}
    >
      <PickRow title={title} />
    </FileImport>
  );
}

function PickRow({ title }: { title: string }) {
  const pick = useFileImportPick();
  return <Row title={title} onClick={pick} />;
}

function Row({ title, onClick }: { title: string; onClick?: () => void }) {
  return (
    <FactRowFrame
      label={t.stems}
      value={t.stemsNone(title)}
      state={{ tone: "warning", label: t.missing }}
      onClick={onClick}
      hrefLabel={onClick ? t.stemsAdd(title) : undefined}
    />
  );
}
