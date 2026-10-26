"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  ANOMALY_MODULES,
  type AnomalyModule,
} from "@/lib/distribution/anomalies";
import { reportPlatformProblem } from "@/lib/distribution/platform-gestures";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";

const t = fr.distributionJourney.platforms;

/**
 * « Il y a un problème » (proto `.plat`): unavailable or not compliant,
 * what was seen, the module where it is corrected — and for an
 * unavailability what is done about it, by whom, by when (recette DIST-005).
 * The anomaly opens in the same gesture.
 */
export function PlatformProblem({
  projectId,
  platform,
  name,
  url,
  members,
  ownerPersonId,
  onCancel,
}: {
  projectId: string;
  platform: string;
  name: string;
  // The link to save with it (the detection's), or "".
  url: string;
  members: Array<{ personId: string; name: string }>;
  // The project's owner follows it unless said otherwise.
  ownerPersonId: string | null;
  onCancel: () => void;
}) {
  const [problem, setProblem] = useState<
    "unavailable" | "non_compliant" | null
  >(null);
  const [note, setNote] = useState("");
  const [module, setModule] = useState<AnomalyModule>("distributor");
  const [action, setAction] = useState("");
  const [owner, setOwner] = useState(ownerPersonId ?? "");
  const [due, setDue] = useState("");
  const [tried, setTried] = useState(false);
  const { pending, error, run } = useWriteSubmit(
    onCancel,
    t.problemSaved(name),
  );
  const today = todayInParis();
  const unavailable = problem === "unavailable";
  const errors = {
    problem: problem ? undefined : t.problemRequired,
    note: note.trim() ? undefined : t.problemRequired,
    action: !unavailable || action.trim() ? undefined : t.actionRequired,
    owner: !unavailable || owner ? undefined : t.ownerRequired,
    due: !unavailable || (due && due >= today) ? undefined : t.dueRequired,
  };
  const submit = () => {
    setTried(true);
    if (!problem || Object.values(errors).some(Boolean)) return;
    run(() =>
      reportPlatformProblem({
        projectId,
        platform,
        problem,
        note: note.trim(),
        module,
        url,
        action: unavailable ? action.trim() : "",
        ownerPersonId: unavailable ? owner : "",
        dueOn: unavailable ? due : "",
        done: t.problemSaved(name),
      }),
    );
  };
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.problemBody}
      </p>
      <ChoiceCards
        name={`problem-${platform}`}
        legend={t.problemLegend}
        required
        variant="list"
        value={problem}
        onChange={(value) => {
          setProblem(value);
          setModule(value === "unavailable" ? "distributor" : "design");
        }}
        choices={(["unavailable", "non_compliant"] as const).map((value) => ({
          value,
          label: t.problems[value][0],
          hint: t.problems[value][1],
        }))}
      />
      {problem && (
        <>
          <TextareaField
            name={`note-${platform}`}
            label={unavailable ? t.seen : t.differs}
            required
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={tried ? errors.note : undefined}
          />
          <OptionSelect
            key={problem}
            name={`module-${platform}`}
            label={t.module}
            required
            items={Object.fromEntries(
              ANOMALY_MODULES.map((m) => [
                m,
                fr.distribution.anomalies.modules[m],
              ]),
            )}
            defaultValue={module}
            onValueChange={(value: string) => setModule(value as AnomalyModule)}
          />
        </>
      )}
      {unavailable && (
        <>
          <TextareaField
            name={`action-${platform}`}
            label={t.action}
            required
            rows={2}
            maxLength={1000}
            value={action}
            onChange={(e) => setAction(e.target.value)}
            error={tried ? errors.action : undefined}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionSelect
              name={`owner-${platform}`}
              label={t.owner}
              required
              items={Object.fromEntries(
                members.map((m) => [m.personId, m.name]),
              )}
              defaultValue={owner || null}
              onValueChange={setOwner}
              error={tried ? errors.owner : undefined}
            />
            <Field
              name={`due-${platform}`}
              label={t.due}
              type="date"
              required
              min={today}
              value={due}
              onChange={(e) => setDue(e.target.value)}
              error={tried ? errors.due : undefined}
            />
          </div>
        </>
      )}
      <FormMessage kind="error">
        {tried && !problem ? errors.problem : error}
      </FormMessage>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={submit}>
          {t.saveProblem}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
