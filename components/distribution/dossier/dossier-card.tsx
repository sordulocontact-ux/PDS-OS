import { IconFile } from "nucleo-sharp-essential";

import { ParamField } from "@/components/distribution/params/param-field";
import { AudioFile } from "@/components/ui/audio-file";
import { CopyButton } from "@/components/ui/copy-button";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import type {
  DossierField,
  DossierSection,
} from "@/lib/distribution/delivery-file";
import type { ParamKey, ParamsData } from "@/lib/distribution/params-view";
import type { ReadinessItem } from "@/lib/distribution/readiness";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.dossier;
const d = fr.distribution.dossier;

// The delivery file's fields that are the distribution's own parameters.
const PARAM_OF: Record<string, ParamKey> = {
  territories: "territories",
  priceTier: "priceTier",
  preorder: "preorder",
  prelisten: "prelisten",
  notes: "notes",
  cover: "cover",
};

export type DossierCardProps = {
  projectId: string;
  projectTitle: string;
  number: number;
  stateLine: string;
  pill: { tone: Tone; label: string };
  sections: DossierSection[];
  // Readiness items, for the audio files (master final) of the tracks.
  items: ReadinessItem[];
  params: ParamsData;
  releaseSource: string | null;
  // « Changé à la source depuis la Vn » (warning when the dossier no
  // longer matches a validated version).
  change?: { tone: "info" | "warning"; text: string } | null;
  // edit: parameters with « Modifier »; read: on the evidence; copy: each
  // value with « Copier » (the deposit).
  mode: "edit" | "read" | "copy";
};

/**
 * The delivery file as a document in head of its step (VISION-UX rule 18,
 * proto `dossierCard`): « Dossier de livraison · Vn », its state and « Exporter
 * en PDF », what changed at the source, then the sections typed into The
 * Orchard — Sortie, Pistes, Visuel, Territoires et droits, Prix et dates,
 * Notes — each value with its source; the distribution's own parameters
 * modifiable until the submission.
 */
export function DossierCard(props: DossierCardProps) {
  const { sections, mode } = props;
  return (
    <section className="flex flex-col gap-3.5 rounded-2xl border border-[color:var(--border-default)] bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <IconFile
          aria-hidden
          className="size-5 text-[color:var(--text-secondary)]"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="font-semibold">{t.document(props.number)}</b>
          <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
            {props.stateLine}
          </span>
        </span>
        <StatusBadge tone={props.pill.tone}>{props.pill.label}</StatusBadge>
        {mode !== "copy" && (
          <PdfExportButton
            href={routes.projectDistributionDossierPdf(props.projectId)}
            fileName={t.pdfFileName(props.projectTitle, props.number)}
            label={t.pdf}
            pendingLabel={t.pdfPending}
            failedLabel={t.pdfFailed}
            variant="outline"
          />
        )}
      </div>
      {props.change && (
        <ToneCallout tone={props.change.tone}>{props.change.text}</ToneCallout>
      )}
      {sections.map((section) => (
        <div key={section.key} className="flex flex-col gap-2">
          <h3 className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] font-semibold tracking-wide text-[color:var(--text-tertiary)] uppercase">
            {section.title}
          </h3>
          {section.groups.map((group) => (
            <FactRows key={group.key}>
              {group.title && (
                <p className="border-b border-[color:var(--border-hairline)] px-3.5 py-2 text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] font-semibold">
                  {group.title}
                </p>
              )}
              {group.fields.map((field) =>
                // A title's release (lot 15): its cover is the title's, read
                // in the Catalogue — not a parameter to choose.
                PARAM_OF[field.key] &&
                !(field.key === "cover" && props.params.coverFromTitle) ? (
                  <ParamField
                    key={field.key}
                    data={
                      mode === "edit"
                        ? props.params
                        : { ...props.params, canEdit: false }
                    }
                    field={PARAM_OF[field.key]}
                    inDossier
                  />
                ) : (
                  <DossierRow
                    key={`${field.key}-${field.label}`}
                    field={field}
                    label={field.label}
                    props={props}
                  />
                ),
              )}
            </FactRows>
          ))}
        </div>
      ))}
    </section>
  );
}

function DossierRow({
  field,
  label,
  props,
}: {
  field: DossierField;
  label: string;
  props: DossierCardProps;
}) {
  const media = props.items.find((i) => i.key === field.key)?.media;
  const isAudio = field.key.startsWith("final-");
  const source =
    field.key === "releaseDate"
      ? props.releaseSource
      : field.key === "format"
        ? t.sources.format
        : field.key === "upc" && !field.value
          ? t.sources.notBlocking
          : isAudio && field.value
            ? field.value
            : d.origins[field.origin];
  const value =
    field.key === "upc" && !field.value
      ? t.sources.upcLater
      : isAudio
        ? (media?.fileName ?? field.value)
        : field.value;
  const missing = field.value === null && field.key !== "upc";
  return (
    <FactRow
      label={label}
      value={value ?? undefined}
      source={source}
      state={missing ? { tone: "warning", label: t.missing } : null}
      side={
        props.mode === "copy" &&
        value &&
        !missing &&
        field.key !== "upc" &&
        !isAudio ? (
          <CopyButton
            value={value}
            label={t.copy}
            copiedLabel={t.copied(value)}
            icon={null}
            variant="outline"
            size="sm"
          />
        ) : null
      }
      below={
        isAudio && media ? (
          <AudioFile
            label={fr.distribution.readiness.listen(media.fileName)}
            listenUrl={media.listenUrl}
            downloadUrl={media.downloadUrl}
          />
        ) : undefined
      }
    />
  );
}
