"use client";

import { PersonPickerField } from "@/components/network/person-picker-field";
import { OptionSelect } from "@/components/projects/option-select";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FactRow } from "@/components/ui/fact-row";
import { fr } from "@/lib/i18n/fr";
import type { CreatorDraft, PublishingMode } from "@/lib/legal/splits/draft";
import type { SplitPersonOption } from "@/lib/legal/splits/party-actions";

const MODES: PublishingMode[] = ["house", "other", "none"];

/** Who publishes one creator's share (JUR-01): PDS Éditions, another
 * publisher picked in the Réseau (possibly coedited by PDS Éditions), or
 * none — proposed from what PDS OS knows, with its source, never guessed. */
export function SplitPublishingRow({
  creator,
  load,
  errors,
  onChange,
}: {
  creator: CreatorDraft;
  load: (fresh?: boolean) => Promise<SplitPersonOption[]>;
  errors: { mode?: string; publisher?: string } | null;
  onChange: (change: Partial<CreatorDraft>) => void;
}) {
  const t = fr.legalSplits.editor;
  const name = creator.name || t.thisCreator;
  const badge =
    creator.mode === "other"
      ? creator.coedition
        ? t.modeBadges.coedition
        : t.modeBadges.other
      : creator.mode
        ? t.modeBadges[creator.mode]
        : null;
  return (
    <FactRow
      label={name}
      value={
        <OptionSelect
          // A choice filled by picking the person shows at once.
          key={creator.mode ?? "none"}
          name={`mode-${creator.key}`}
          label={t.modeLabel(creator.name)}
          hideLabel
          required
          placeholder={t.modePlaceholder}
          items={Object.fromEntries(MODES.map((m) => [m, t.modes[m]]))}
          defaultValue={creator.mode}
          error={errors?.mode}
          onValueChange={(value) =>
            onChange({ mode: value as PublishingMode, source: null })
          }
        />
      }
      source={creator.source ? t.proposed(creator.source) : undefined}
      state={
        badge
          ? { tone: creator.mode === "none" ? "neutral" : "info", label: badge }
          : undefined
      }
      below={
        creator.mode === "other" && (
          <>
            <PersonPickerField<SplitPersonOption>
              refName={`publisher-${creator.key}`}
              nameName={`publisher-name-${creator.key}`}
              legend={t.publisher}
              required
              load={load}
              defaultRef={
                creator.publisher
                  ? `contact:${creator.publisher.contactId}`
                  : null
              }
              defaultName={null}
              allowNameOnly={false}
              createRoles={["publisher"]}
              createKind="organization"
              refOfContact={(id) => `contact:${id}`}
              onPick={(option) =>
                onChange({
                  publisher: option?.contactId
                    ? { contactId: option.contactId, name: option.label }
                    : null,
                })
              }
              error={errors?.publisher}
            />
            <CheckboxField
              label={t.coedition(creator.publisher?.name ?? null)}
              checked={creator.coedition}
              onChange={(checked) => onChange({ coedition: checked })}
            />
          </>
        )
      }
    />
  );
}
