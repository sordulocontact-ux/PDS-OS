"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { useLegalAction } from "@/components/legal/use-legal-action";
import { Button } from "@/components/ui/button";
import { PdfExportButton } from "@/components/ui/pdf-export-button";
import { SignaturesList } from "@/components/legal/formalities/signatures-list";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  completeFormality,
  formalityStep,
  generateFormality,
  requireFormalityAction,
} from "@/lib/legal/formalities/step-actions";
import { SACEM_725_FIELDS } from "@/lib/legal/formalities/definition";
import type { FormalityView } from "@/lib/legal/formalities/types";

type Open = "partial" | "submit" | "correction" | "complete" | null;

/** From the bulletin to the registration: generate, collect the
 * signatures (or a partial declaration), record the deposit, the
 * processing, a correction, the result with its proof. */
export function StepsPanel({
  projectId,
  title,
  f,
}: {
  projectId: string;
  title: string;
  f: FormalityView;
}) {
  const t = fr.legalFormalities.page;
  const [open, setOpen] = useState<Open>(null);
  const [text, setText] = useState("");
  const [extra, setExtra] = useState({ externalId: "", iswc: "", field: "" });
  const { pending, run } = useLegalAction();
  const close = () => {
    setOpen(null);
    setText("");
  };
  const latest = f.documents[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {["ready_to_generate", "document_ready", "signatures_pending"].includes(
          f.status,
        ) &&
          f.missing.length === 0 && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => generateFormality(projectId, f.id))}
            >
              {t.generate}
            </Button>
          )}
        {f.status === "signatures_pending" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen("partial")}
          >
            {t.partial}
          </Button>
        )}
        {f.status === "ready_to_submit" && (
          <Button size="sm" onClick={() => setOpen("submit")}>
            {t.submit}
          </Button>
        )}
        {f.status === "submitted" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(() => formalityStep(projectId, f.id, "processing", ""))
            }
          >
            {t.processing}
          </Button>
        )}
        {["submitted", "processing"].includes(f.status) && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen("correction")}
            >
              {t.correction}
            </Button>
            <Button size="sm" onClick={() => setOpen("complete")}>
              {t.complete}
            </Button>
          </>
        )}
        {latest && (
          <PdfExportButton
            href={routes.formalityDocumentPdf(f.id, latest.version)}
            fileName={`SACEM 725 - ${title} - v${latest.version}.pdf`}
            label={`${t.export} · ${t.version(latest.version)}`}
            pendingLabel={fr.framingGuide.brief.exporting}
            failedLabel={fr.legalFormalities.errors.pdf}
            variant="outline"
          />
        )}
      </div>

      {open && (
        <div className="flex flex-col gap-2 rounded-xl border p-3">
          {open === "correction" && (
            <OptionSelect
              name={`${f.id}-correction-field`}
              label={t.correctionFields}
              items={Object.fromEntries(
                SACEM_725_FIELDS.map((x) => [
                  x.key,
                  fr.legalFormalities.fields[x.key],
                ]),
              )}
              onValueChange={(v) => setExtra((e) => ({ ...e, field: v }))}
            />
          )}
          <TextareaField
            name={`${f.id}-${open}`}
            label={
              open === "partial"
                ? t.partialReason
                : open === "submit"
                  ? t.submitProof
                  : open === "correction"
                    ? t.correctionNote
                    : t.completeProof
            }
            rows={2}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {open === "complete" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field
                name={`${f.id}-external`}
                label={t.externalId}
                value={extra.externalId}
                onChange={(e) =>
                  setExtra((x) => ({ ...x, externalId: e.target.value }))
                }
              />
              <Field
                name={`${f.id}-iswc`}
                label={t.iswc}
                value={extra.iswc}
                onChange={(e) =>
                  setExtra((x) => ({ ...x, iswc: e.target.value }))
                }
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={close}>
              {t.cancel}
            </Button>
            <Button
              size="sm"
              disabled={
                pending ||
                !text.trim() ||
                (open === "correction" && !extra.field)
              }
              onClick={() =>
                run(
                  () =>
                    open === "partial" || open === "submit"
                      ? formalityStep(projectId, f.id, open, text)
                      : open === "correction"
                        ? requireFormalityAction(
                            projectId,
                            f.id,
                            [extra.field],
                            text,
                          )
                        : completeFormality(
                            projectId,
                            f.id,
                            text,
                            extra.externalId,
                            extra.iswc,
                          ),
                  close,
                )
              }
            >
              {t.confirm}
            </Button>
          </div>
        </div>
      )}

      <SignaturesList projectId={projectId} f={f} />
    </div>
  );
}
