"use client";

import { useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { CoverThumb } from "@/components/distribution/params/cover-thumb";
import {
  NotesEditor,
  patchOf,
  TerritoriesEditor,
  TierEditor,
  YesNoEditor,
} from "@/components/distribution/params/param-editors";
import { Button } from "@/components/ui/button";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { PickList } from "@/components/ui/pick-list";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { updateDistributionParams } from "@/lib/distribution/params-actions";
import {
  paramValue,
  type ParamKey,
  type ParamsData,
} from "@/lib/distribution/params-view";
import { setDistributionValidator } from "@/lib/distribution/validation-actions";
import { fr } from "@/lib/i18n/fr";
import { formatDay } from "@/lib/utils/day";

const t = fr.distributionJourney.params;

/** The source under a row's value, when nobody changed it. */
function sourceOf(data: ParamsData, key: ParamKey, inDossier: boolean) {
  if (inDossier)
    return key === "cover" ? t.sources.coverChosen : t.sources.saved;
  switch (key) {
    case "territories":
      return t.sources.territories;
    case "preorder":
      return data.params.preorder === null
        ? (data.preorderProposal?.source ?? null)
        : t.sources.saved;
    case "cover":
      return data.cover?.chosen
        ? t.sources.coverChosen
        : t.sources.coverGuessed;
    case "validator":
      return data.validator?.proposed
        ? t.sources.validatorProposed
        : t.sources.validatorChosen;
    case "notes":
      return t.sources.notes;
    default:
      return null;
  }
}

/**
 * One parameter of the distribution (proto `parFact`): its value and its
 * source, « Modifié par … » once changed; « Modifier » / « Renseigner » opens
 * its field on place, « Changer » its list (pochette, validateur). In red
 * with its reason after a first « Confirmer » when it is still missing.
 */
export function ParamField({
  data,
  field,
  missing,
  inDossier = false,
}: {
  data: ParamsData;
  field: ParamKey;
  // Said in red (after a first try).
  missing?: string | null;
  // In the delivery file: the dossier's own source line.
  inDossier?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [fieldError, setFieldError] = useState<string>();
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    setEditing(false);
    setFieldError(undefined);
    requestAnimationFrame(() => button.current?.focus());
  };
  const { pending, error, run } = useWriteSubmit(close, t.done[field]);
  const value = paramValue(data, field);
  const choose = field === "cover" || field === "validator";
  const changedBy = data.changedBy[field] ?? null;

  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (choose) return;
    const result = patchOf(field, new FormData(event.currentTarget), data);
    if ("error" in result) return setFieldError(result.error);
    setFieldError(undefined);
    run(() =>
      updateDistributionParams(
        { projectId: data.projectId, patch: result.patch },
        t.done[field],
      ),
    );
  };

  const editor =
    field === "territories" ? (
      <TerritoriesEditor data={data} error={fieldError} />
    ) : field === "preorder" || field === "prelisten" ? (
      <YesNoEditor data={data} field={field} error={fieldError} />
    ) : field === "priceTier" ? (
      <TierEditor data={data} error={fieldError} />
    ) : field === "notes" ? (
      <NotesEditor data={data} />
    ) : field === "cover" ? (
      <PickList
        groups={[
          {
            options: data.sheets.map((s) => ({
              id: s.id,
              label: s.title,
              detail: s.line,
            })),
          },
        ]}
        selectedId={data.cover?.id ?? null}
        done={t.done.cover}
        onChoose={(id) =>
          updateDistributionParams(
            { projectId: data.projectId, patch: { coverSheetId: id } },
            t.done.cover,
          )
        }
        onDone={close}
      />
    ) : (
      <PickList
        groups={[
          {
            options: data.validatorOptions.map((v) => ({
              id: v.personId,
              label: v.name,
              avatar: { pictureUrl: null },
            })),
          },
        ]}
        selectedId={
          data.validator?.proposed ? null : (data.validator?.personId ?? null)
        }
        done={t.done.validator}
        onChoose={(personId) =>
          setDistributionValidator({ projectId: data.projectId, personId })
        }
        onDone={close}
      />
    );

  const proposal =
    field === "preorder" && data.preorderProposal
      ? t.proposed(
          t.yesOn(formatDay(data.preorderProposal.date)),
          data.preorderProposal.source,
        )
      : null;

  return (
    <FactRowFrame
      label={t.labels[field]}
      value={
        field === "cover" && data.cover ? (
          <span className="flex items-center gap-3">
            <CoverThumb title={data.cover.title} />
            <span className="flex flex-col">
              <span>{data.cover.title}</span>
              <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {data.cover.line}
              </span>
            </span>
          </span>
        ) : (
          (value ?? (missing ? undefined : t.toFill))
        )
      }
      missing={Boolean(missing)}
      missingLabel={t.toFill}
      source={sourceOf(data, field, inDossier)}
      changedBy={changedBy}
      side={
        data.canEdit && !editing ? (
          <Button
            ref={button}
            variant="ghost"
            size="sm"
            data-param={field}
            onClick={() => setEditing(true)}
          >
            {choose ? t.change : value === null ? t.fill : t.edit}
          </Button>
        ) : null
      }
      below={
        editing ? (
          <form noValidate onSubmit={save} className="flex flex-col gap-3 pt-1">
            {editor}
            {field === "cover" && (
              <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {t.coverHint}
              </p>
            )}
            {field === "validator" && (
              <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {t.validatorHint}
              </p>
            )}
            {proposal && (
              <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
                {proposal}
              </p>
            )}
            <FormMessage kind="error">{error}</FormMessage>
            <div className="flex flex-wrap gap-2">
              {!choose && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={pending}
                  aria-busy={pending || undefined}
                >
                  {t.save}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                {t.cancel}
              </Button>
            </div>
          </form>
        ) : missing ? (
          <p
            role="alert"
            className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-error"
          >
            {missing}
          </p>
        ) : undefined
      }
    />
  );
}
