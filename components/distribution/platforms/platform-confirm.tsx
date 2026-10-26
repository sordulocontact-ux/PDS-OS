"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { ProofPick } from "@/components/distribution/deposit/proof-pick";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { confirmPlatform } from "@/lib/distribution/platform-gestures";
import { removeProof, uploadProof } from "@/lib/distribution/upload-proof";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";

const t = fr.distributionJourney.platforms;
const d = fr.distributionJourney.deposit;

const HTTPS = /^https:\/\/\S+\.\S+$/;

/**
 * « Tout est bon » with what makes it opposable (recette DIST-005): the
 * territory seen (the last one typed is proposed), the day, and the proof
 * — a capture, or a link to it. Available and compliant in one gesture,
 * by the person who opened the platform.
 */
export function PlatformConfirm({
  projectId,
  organizationId,
  platform,
  name,
  url,
  territory: proposed,
  done,
  onCancel,
}: {
  projectId: string;
  // Null: no file can be put (a link only).
  organizationId: string | null;
  platform: string;
  name: string;
  // The link to save with it (the detection's), or "" (the one saved).
  url: string;
  territory: string;
  done: string;
  onCancel: () => void;
}) {
  const today = todayInParis();
  const [territory, setTerritory] = useState(proposed);
  const [observedOn, setObservedOn] = useState(today);
  const [file, setFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(onCancel, done);
  const errors = {
    territory: territory.trim() ? undefined : t.territoryRequired,
    date: observedOn && observedOn <= today ? undefined : t.observedRequired,
    proof: file || HTTPS.test(proofUrl.trim()) ? undefined : t.proofRequired,
  };
  const submit = () => {
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    run(async () => {
      let proofPath = "";
      let proofName = "";
      if (file && organizationId) {
        const up = await uploadProof({ organizationId, projectId, file });
        if ("error" in up) return { ok: false, error: up.error };
        proofPath = up.path;
        proofName = up.name;
      }
      const result = await confirmPlatform({
        projectId,
        platform,
        url,
        territory: territory.trim(),
        observedOn,
        proofPath,
        proofName,
        proofUrl: file ? "" : proofUrl.trim(),
        done,
      });
      if (!result.ok && proofPath) await removeProof(proofPath);
      return result;
    });
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.confirmBody(name)}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name={`territory-${platform}`}
          label={t.territory}
          required
          maxLength={200}
          placeholder={t.territoryPlaceholder}
          value={territory}
          onChange={(e) => setTerritory(e.target.value)}
          error={tried ? errors.territory : undefined}
        />
        <Field
          name={`observed-${platform}`}
          label={t.observedOn}
          type="date"
          required
          max={today}
          value={observedOn}
          onChange={(e) => setObservedOn(e.target.value)}
          error={tried ? errors.date : undefined}
        />
      </div>
      {organizationId && (
        <ProofPick
          label={t.proofFile}
          drop={d.proofDrop}
          hint={d.proofHintRequired}
          file={file}
          onFile={setFile}
        />
      )}
      {!file && (
        <Field
          name={`proof-url-${platform}`}
          label={t.proofUrl}
          type="url"
          inputMode="url"
          placeholder="https://…"
          value={proofUrl}
          onChange={(e) => setProofUrl(e.target.value)}
        />
      )}
      {tried && errors.proof && (
        <FormMessage kind="error">{errors.proof}</FormMessage>
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
        >
          {t.allGood}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
