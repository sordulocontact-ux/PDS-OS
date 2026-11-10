"use client";

import { IconPlus, IconXmark } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { proposeArtistIdentity } from "@/lib/catalog/identity-actions";
import {
  IDENTITY_REF_KINDS,
  IDENTITY_TEXTS,
  type IdentityFields,
  type IdentityRef,
} from "@/lib/catalog/identity-fields";
import { artistIdentity } from "@/lib/i18n/fr/artist-identity";

const fr = { artistIdentity };

type Row = IdentityRef & { id: number };

/**
 * A new version of the artist's identity (MKT-C2-04), prefilled with the
 * version in force: its texts, its links (references, counter-references,
 * moodboards) and what changes. Approved at once for a validator, proposed
 * to the DG otherwise (`validates` says which). From a release, `projectId`
 * makes it « Proposer une évolution de l'identité ».
 */
export function IdentityForm({
  artistId,
  projectId,
  initial,
  validates,
  onDone,
}: {
  artistId: string;
  projectId: string | null;
  initial: IdentityFields | null;
  validates: boolean;
  onDone: () => void;
}) {
  const t = fr.artistIdentity;
  const [rows, setRows] = useState<Row[]>(
    (initial?.refs ?? []).map((r, id) => ({ ...r, id })),
  );
  const [badUrls, setBadUrls] = useState<number[]>([]);
  const { pending, error, run } = useWriteSubmit(
    onDone,
    validates && !projectId ? t.saved : t.proposed,
  );
  const update = (id: number, patch: Partial<Row>) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const bad = rows
          .filter((r) => !/^https:\/\/\S+$/.test(r.url.trim()))
          .map((r) => r.id);
        setBadUrls(bad);
        if (bad.length) return;
        const fields = Object.fromEntries(
          IDENTITY_TEXTS.map((k) => [k, String(form.get(k) ?? "")]),
        ) as Record<(typeof IDENTITY_TEXTS)[number], string>;
        run(() =>
          proposeArtistIdentity({
            artistId,
            projectId,
            changeNote: String(form.get("changeNote") ?? ""),
            fields: {
              ...fields,
              refs: rows.map((r) => ({
                kind: r.kind,
                url: r.url.trim(),
                title: r.title ?? "",
                note: r.note ?? "",
              })),
            },
          }),
        );
      }}
    >
      {IDENTITY_TEXTS.map((k) => (
        <TextareaField
          key={k}
          id={`identity-${k}`}
          name={k}
          label={t.fields[k]}
          hint={t.hints[k]}
          rows={k === "manifesto" ? 4 : 2}
          maxLength={k === "manifesto" ? 4000 : 2000}
          defaultValue={initial?.[k] ?? ""}
        />
      ))}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-body-md font-semibold">
          {t.refs.title}
        </legend>
        <p className="text-caption text-muted-foreground">{t.refs.hint}</p>
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <OptionSelect
                  id={`identity-ref-${row.id}-kind`}
                  name={`ref-${row.id}-kind`}
                  label={t.refs.kind}
                  items={Object.fromEntries(
                    IDENTITY_REF_KINDS.map((k) => [k, t.refKindOne[k]]),
                  )}
                  defaultValue={row.kind}
                  onValueChange={(value) =>
                    update(row.id, {
                      kind:
                        IDENTITY_REF_KINDS.find((k) => k === value) ??
                        "reference",
                    })
                  }
                />
                <Field
                  id={`identity-ref-${row.id}-url`}
                  name={`ref-${row.id}-url`}
                  label={t.refs.url}
                  type="url"
                  inputMode="url"
                  required
                  value={row.url}
                  error={
                    badUrls.includes(row.id) ? t.refs.urlInvalid : undefined
                  }
                  onChange={(e) => update(row.id, { url: e.target.value })}
                />
              </div>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="mt-7"
                aria-label={t.refs.remove(index + 1)}
                onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
              >
                <IconXmark aria-hidden />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id={`identity-ref-${row.id}-title`}
                name={`ref-${row.id}-title`}
                label={t.refs.name}
                maxLength={200}
                value={row.title ?? ""}
                onChange={(e) => update(row.id, { title: e.target.value })}
              />
              <Field
                id={`identity-ref-${row.id}-note`}
                name={`ref-${row.id}-note`}
                label={t.refs.note}
                maxLength={500}
                value={row.note ?? ""}
                onChange={(e) => update(row.id, { note: e.target.value })}
              />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={rows.length >= 60}
          onClick={() =>
            setRows([
              ...rows,
              {
                id: Math.max(-1, ...rows.map((r) => r.id)) + 1,
                kind: "reference",
                url: "",
                title: null,
                note: null,
              },
            ])
          }
        >
          <IconPlus aria-hidden data-icon="inline-start" />
          {t.refs.add}
        </Button>
      </fieldset>

      <Field
        id="identity-change-note"
        name="changeNote"
        label={t.changeNote}
        hint={t.changeNoteHint}
        maxLength={1000}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.save}
        onCancel={onDone}
      />
    </form>
  );
}
