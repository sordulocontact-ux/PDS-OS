"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { ProofPick } from "@/components/distribution/deposit/proof-pick";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { decideLift, requestLift } from "@/lib/distribution/closure-gestures";
import { removeProof, uploadProof } from "@/lib/distribution/upload-proof";
import { fr } from "@/lib/i18n/fr";

const t = fr.distributionJourney.closure;
const d = fr.distributionJourney.deposit;

const HTTPS = /^https:\/\/\S+\.\S+$/;

/** « Lever la réserve »: the proof (a file, or a link) and what changed;
 * another person confirms (recette DIST-007). */
export function RequestLift({
  projectId,
  organizationId,
  reserveId,
}: {
  projectId: string;
  // Null: no file can be put (a link only).
  organizationId: string | null;
  reserveId: string;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(() => {
    setOpen(false);
    setTried(false);
  }, t.liftRequested);
  if (!open)
    return (
      <div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          {t.lift}
        </Button>
      </div>
    );
  const lacking = !file && !HTTPS.test(url.trim());
  const submit = () => {
    setTried(true);
    if (lacking) return;
    run(async () => {
      let proofPath = "";
      let proofName = "";
      if (file && organizationId) {
        const up = await uploadProof({ organizationId, projectId, file });
        if ("error" in up) return { ok: false, error: up.error };
        proofPath = up.path;
        proofName = up.name;
      }
      const result = await requestLift({
        projectId,
        reserveId,
        note: note.trim(),
        proofPath,
        proofName,
        proofUrl: file ? "" : url.trim(),
      });
      if (!result.ok && proofPath) await removeProof(proofPath);
      return result;
    });
  };
  return (
    <div className="flex flex-col gap-3">
      {organizationId && (
        <ProofPick
          label={t.liftProofFile}
          drop={d.proofDrop}
          hint={d.proofHintRequired}
          file={file}
          onFile={setFile}
        />
      )}
      {!file && (
        <Field
          name={`lift-url-${reserveId}`}
          label={t.liftProofUrl}
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}
      {tried && lacking && (
        <FormMessage kind="error">{t.liftRequired}</FormMessage>
      )}
      <TextareaField
        name={`lift-note-${reserveId}`}
        label={t.liftNote}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div>
        <Button
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {t.liftSubmit}
        </Button>
      </div>
    </div>
  );
}

/** « Confirmer la levée » or refuse it with a reason. */
export function DecideLift({
  projectId,
  reserveId,
}: {
  projectId: string;
  reserveId: string;
}) {
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    () => setNote(""),
    t.liftDecided,
  );
  const decide = (approve: boolean) => {
    const lacking = !approve && !note.trim();
    setMissing(lacking);
    if (!lacking)
      run(() =>
        decideLift({ projectId, reserveId, approve, note: note.trim() }),
      );
  };
  return (
    <div className="flex flex-col gap-3">
      <TextareaField
        name={`lift-refusal-${reserveId}`}
        label={t.liftRefuseNote}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        error={missing ? t.liftRefuseRequired : undefined}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide(true)}>
          {t.liftConfirm}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => decide(false)}
        >
          {t.liftRefuse}
        </Button>
      </div>
    </div>
  );
}
