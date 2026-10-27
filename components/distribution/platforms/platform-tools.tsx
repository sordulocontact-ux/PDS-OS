"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { checkRelease } from "@/app/(app)/app/projects/[projectId]/release/actions";
import { saveDistributionPlatform } from "@/lib/distribution/platforms-actions";
import { declareDistribution } from "@/lib/distribution/tracking-actions";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distributionJourney };

const t = fr.distributionJourney.platforms;

/** « Ajouter une plateforme », in the head of the list (rule 17): its name
 * and, if known, its official link. */
export function AddPlatform({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [urlError, setUrlError] = useState<string>();
  const { pending, error, run } = useWriteSubmit(() => setOpen(false), t.added);
  if (!open)
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {t.add}
      </Button>
    );
  return (
    <form
      noValidate
      className="flex w-full flex-col gap-2.5 rounded-xl border border-[color:var(--border-hairline)] p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const name = String(form.get("name") ?? "").trim();
        const url = String(form.get("url") ?? "").trim();
        setNameError(name ? undefined : t.addNameRequired);
        setUrlError(
          url && !/^https:\/\/\S+\.\S+$/.test(url) ? t.linkInvalid : undefined,
        );
        if (!name || (url && !/^https:\/\/\S+\.\S+$/.test(url))) return;
        run(() =>
          saveDistributionPlatform({
            projectId,
            platform: "",
            label: name,
            url,
            available: false,
          }),
        );
      }}
    >
      <Field
        name="name"
        label={t.addName}
        required
        placeholder={t.addNamePlaceholder}
        error={nameError}
        autoFocus
      />
      <Field
        name="url"
        type="url"
        label={t.addUrl}
        placeholder="https://…"
        error={urlError}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {t.add}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}

/** « Déclarer la disponibilité publique »: said, never read as verified. */
export function DeclareAvailability({ projectId }: { projectId: string }) {
  const { pending, error, run } = useWriteSubmit(() => {}, t.declared);
  return (
    <span className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(() =>
            declareDistribution({
              projectId,
              kind: "available",
              declaredOn: "",
              orchardId: "",
              note: "",
              proofPath: "",
              proofName: "",
              proofUrl: "",
            }),
          )
        }
      >
        {t.declare}
      </Button>
      <FormMessage kind="error">{error}</FormMessage>
    </span>
  );
}

/** « Lancer la détection maintenant »: the daily detection, run now (a
 * recourse; what it finds is only proposed). */
export function DetectNow({ projectId }: { projectId: string }) {
  const { pending, error, run } = useWriteSubmit(() => {}, t.detected(0));
  return (
    <span className="flex flex-col gap-1">
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          run(async () => {
            const result = await checkRelease(projectId);
            return result.ok
              ? { ok: true, done: t.detected(result.linkCount) }
              : {
                  ok: false,
                  error:
                    result.error === "no_isrc" ? t.noIsrc : t.detectionFailed,
                };
          })
        }
      >
        {t.checkNow}
      </Button>
      <FormMessage kind="error">{error}</FormMessage>
    </span>
  );
}
