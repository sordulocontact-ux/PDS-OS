"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { PlatformConfirm } from "@/components/distribution/platforms/platform-confirm";
import { PlatformProblem } from "@/components/distribution/platforms/platform-problem";
import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveDistributionPlatform } from "@/lib/distribution/platforms-actions";
import { distribution } from "@/lib/i18n/fr/distribution";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";

const fr = { distribution, distributionJourney };

const t = fr.distributionJourney.platforms;
const p = fr.distribution.platforms;

export type PlatformLine = {
  platform: string;
  name: string;
  extra: boolean;
  // The link saved, else the one the detection found (proposed).
  url: string | null;
  saved: boolean;
  // « Trouvé par la détection automatique le 05/12 ».
  source: string | null;
  verification: "unchecked" | "verified" | "unavailable";
  compliance: "unchecked" | "compliant" | "non_compliant";
  // « Vérifiée par Lina Haddad le 07/12, 16:22 ».
  by: string | null;
  // « Constatée le 07/12 · France » and its proof (DIST-005).
  seen: string | null;
  proof: { label: string; href: string | null } | null;
  // The number verified once this one is (for the toast).
  nextCount: number;
};

const VER_TONE = {
  unchecked: "neutral",
  verified: "success",
  unavailable: "danger",
} as const;

/**
 * One platform (proto `.plat`): its state, its link with its source, who
 * verified it, what they saw (territory, day) and their proof, then
 * « Ouvrir », « Tout est bon » (available and compliant, with the territory
 * and the proof, recette DIST-005), « Il y a un problème » (what was seen,
 * and the anomaly it opens), « Renseigner le lien », « Revérifier ».
 */
export function PlatformRow({
  projectId,
  line,
  canAct,
  organizationId,
  territory,
  members,
  ownerPersonId,
}: {
  projectId: string;
  line: PlatformLine;
  canAct: boolean;
  organizationId: string | null;
  // The territory typed last on another platform, proposed again.
  territory: string;
  members: Array<{ personId: string; name: string }>;
  ownerPersonId: string | null;
}) {
  const [mode, setMode] = useState<
    "idle" | "link" | "problem" | "recheck" | "confirm"
  >("idle");
  const [linkError, setLinkError] = useState<string>();
  const reset = () => setMode("idle");
  const { pending, error, run } = useWriteSubmit(reset, t.linkSaved);
  const ask =
    line.verification === "unchecked" ||
    mode === "recheck" ||
    mode === "confirm";
  const linkToSave = line.saved ? "" : (line.url ?? "");

  const saveLink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const url = String(
      new FormData(event.currentTarget).get("url") ?? "",
    ).trim();
    if (!/^https:\/\/\S+\.\S+$/.test(url)) return setLinkError(t.linkInvalid);
    setLinkError(undefined);
    run(
      () =>
        saveDistributionPlatform({
          projectId,
          platform: line.platform as never,
          label: line.extra ? line.name : "",
          url,
          available: false,
        }),
      t.linkSaved,
    );
  };

  return (
    <div className="flex flex-col gap-2 border-b border-[color:var(--border-hairline)] px-3.5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <b className="font-semibold">{line.name}</b>
        {line.extra && (
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {t.extra}
          </span>
        )}
        <span className="flex-1" />
        <StatusBadge tone={VER_TONE[line.verification]} size="sm">
          {p.verifications[line.verification]}
        </StatusBadge>
        {line.verification === "verified" && (
          <StatusBadge
            tone={
              line.compliance === "compliant"
                ? "success"
                : line.compliance === "non_compliant"
                  ? "danger"
                  : "neutral"
            }
            size="sm"
          >
            {p.compliances[line.compliance]}
          </StatusBadge>
        )}
      </div>
      <div className="flex flex-col gap-0.5 text-[length:var(--type-body-sm)]">
        {line.url ? (
          <code className="break-all">{line.url}</code>
        ) : (
          <span className="text-[color:var(--text-tertiary)]">
            {line.source}
          </span>
        )}
        {[line.url && line.source, line.by, line.seen]
          .filter(Boolean)
          .map((text) => (
            <span
              key={String(text)}
              className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]"
            >
              {text}
            </span>
          ))}
        {line.proof && (
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {line.proof.href ? (
              <a
                href={line.proof.href}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {line.proof.label}
              </a>
            ) : (
              line.proof.label
            )}
          </span>
        )}
      </div>
      {canAct && (mode === "idle" || mode === "recheck") && (
        <div className="flex flex-wrap gap-2">
          {!line.url ? (
            <Button size="sm" variant="outline" onClick={() => setMode("link")}>
              {t.fillLink}
            </Button>
          ) : (
            <>
              <a
                href={line.url}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ButtonRoll>{t.open}</ButtonRoll>
              </a>
              {ask ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setMode("confirm")}
                  >
                    {t.allGood}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMode("problem")}
                  >
                    {t.problem}
                  </Button>
                  {mode === "recheck" && (
                    <Button size="sm" variant="ghost" onClick={reset}>
                      {t.cancel}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setMode("recheck")}
                >
                  {t.recheck}
                </Button>
              )}
            </>
          )}
        </div>
      )}
      {mode === "confirm" && (
        <PlatformConfirm
          projectId={projectId}
          organizationId={organizationId}
          platform={line.platform}
          name={line.name}
          url={linkToSave}
          territory={territory}
          done={t.verified(line.name, line.nextCount)}
          onCancel={reset}
        />
      )}
      {mode === "link" && (
        <form noValidate onSubmit={saveLink} className="flex flex-col gap-2">
          <Field
            name="url"
            type="url"
            label={t.linkLabel}
            required
            placeholder="https://…"
            hint={t.linkHint}
            error={linkError}
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {t.save}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              {t.cancel}
            </Button>
          </div>
        </form>
      )}
      {mode === "problem" && (
        <PlatformProblem
          projectId={projectId}
          platform={line.platform}
          name={line.name}
          url={linkToSave}
          members={members}
          ownerPersonId={ownerPersonId}
          onCancel={reset}
        />
      )}
      {mode === "idle" && error && (
        <FormMessage kind="error">{error}</FormMessage>
      )}
    </div>
  );
}
