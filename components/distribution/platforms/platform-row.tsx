"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  ANOMALY_MODULES,
  type AnomalyModule,
} from "@/lib/distribution/anomalies";
import {
  confirmPlatform,
  reportPlatformProblem,
} from "@/lib/distribution/platform-gestures";
import { saveDistributionPlatform } from "@/lib/distribution/platforms-actions";
import { fr } from "@/lib/i18n/fr";

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
 * verified it, then « Ouvrir », « Tout est bon » (available and compliant in
 * one click), « Il y a un problème » (what was seen, and the anomaly it
 * opens), « Renseigner le lien », « Revérifier ».
 */
export function PlatformRow({
  projectId,
  line,
  canAct,
}: {
  projectId: string;
  line: PlatformLine;
  canAct: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "link" | "problem" | "recheck">(
    "idle",
  );
  const [problem, setProblem] = useState<
    "unavailable" | "non_compliant" | null
  >(null);
  const [note, setNote] = useState("");
  const [module, setModule] = useState<AnomalyModule>("distributor");
  const [linkError, setLinkError] = useState<string>();
  const [missing, setMissing] = useState<string | null>(null);
  const reset = () => {
    setMode("idle");
    setProblem(null);
    setNote("");
    setMissing(null);
  };
  const { pending, error, run } = useWriteSubmit(
    reset,
    t.verified(line.name, line.nextCount),
  );
  const ask = line.verification === "unchecked" || mode === "recheck";

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

  const saveProblem = () => {
    if (!problem) return setMissing(t.problemRequired);
    if (!note.trim()) return setMissing(t.problemRequired);
    setMissing(null);
    run(
      () =>
        reportPlatformProblem({
          projectId,
          platform: line.platform,
          problem,
          note: note.trim(),
          module,
          url: line.saved ? "" : (line.url ?? ""),
          done: t.problemSaved(line.name),
        }),
      t.problemSaved(line.name),
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
        {line.url && line.source && (
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {line.source}
          </span>
        )}
        {line.by && (
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
            {line.by}
          </span>
        )}
      </div>
      {canAct && mode !== "link" && mode !== "problem" && (
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
                {t.open}
              </a>
              {ask ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        confirmPlatform({
                          projectId,
                          platform: line.platform,
                          url: line.saved ? "" : (line.url ?? ""),
                          done: t.verified(line.name, line.nextCount),
                        }),
                      )
                    }
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
        <div className="flex flex-col gap-2.5">
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.problemBody}
          </p>
          <ChoiceCards
            name={`problem-${line.platform}`}
            legend={t.problemLegend}
            required
            variant="list"
            value={problem}
            onChange={(value) => {
              setProblem(value);
              setModule(value === "unavailable" ? "distributor" : "design");
            }}
            choices={(["unavailable", "non_compliant"] as const).map(
              (value) => ({
                value,
                label: t.problems[value][0],
                hint: t.problems[value][1],
              }),
            )}
          />
          {problem && (
            <>
              <TextareaField
                name={`note-${line.platform}`}
                label={problem === "unavailable" ? t.seen : t.differs}
                required
                rows={2}
                maxLength={1000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <OptionSelect
                key={problem}
                name={`module-${line.platform}`}
                label={t.module}
                required
                items={Object.fromEntries(
                  ANOMALY_MODULES.map((m) => [
                    m,
                    fr.distribution.anomalies.modules[m],
                  ]),
                )}
                defaultValue={module}
                onValueChange={(value: string) =>
                  setModule(value as AnomalyModule)
                }
              />
            </>
          )}
          <FormMessage kind="error">{missing ?? error}</FormMessage>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={saveProblem}>
              {t.saveProblem}
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              {t.cancel}
            </Button>
          </div>
        </div>
      )}
      {mode === "idle" && error && (
        <FormMessage kind="error">{error}</FormMessage>
      )}
    </div>
  );
}
