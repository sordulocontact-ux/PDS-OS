"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { GuideRow } from "@/components/framing/guide/guide-row";
import { FramingStepCard } from "@/components/framing/guide/step-card";
import { sourceLabel } from "@/components/framing/guide/source-quote";
import { ProvenanceNote } from "@/components/framing/provenance-note";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ToneCallout } from "@/components/ui/tone-callout";
import {
  chooseHelp,
  dismissHelp,
  proposeHelp,
} from "@/lib/framing/actions/help";
import {
  answerDate,
  answerMoney,
  answerNone,
  answerText,
  confirmQuestion,
  dismissQuestion,
} from "@/lib/framing/actions/questions";
import type { QuestionState } from "@/lib/framing/assess";
import { QUESTIONS } from "@/lib/framing/dimensions";
import type { HelpSuggestion } from "@/lib/framing/help";
import { fr } from "@/lib/i18n/fr";
import { factTone, reviewTone } from "@/lib/ui/state-tones";

type Mode = "view" | "write";

/** The question in words: asked when missing, to confirm when proposed. */
function titleOf(q: QuestionState): string {
  const t = fr.framingIntel.questions[q.key];
  if (q.status === "missing") return t.ask;
  if (q.status === "to_confirm") {
    const confirm = t.confirm as string | ((value: string) => string);
    return typeof confirm === "function" ? confirm(q.display ?? "") : confirm;
  }
  return t.label;
}

/**
 * One question of the Cadrage intelligent, one at a time (ticket § 4): the
 * dimension, the question adapted to what is known, and the ways to answer
 * — confirm, modify, « M'aider à définir », « Écrire moi-même ». A list
 * question brings its own lines (`children`) and keeps the common answers
 * (« Rien à signaler », « Passer »).
 */
export function QuestionScreen({
  projectId,
  question,
  eyebrow,
  editable,
  nextHref,
  suggestions = [],
  hint,
  children,
}: {
  projectId: string;
  question: QuestionState;
  eyebrow: string;
  editable: boolean;
  nextHref: string;
  suggestions?: HelpSuggestion[];
  // What was said about it, when it helps to answer (the timing, said in a call).
  hint?: string | null;
  children?: React.ReactNode;
}) {
  const t = fr.framingIntel.guide;
  const def = QUESTIONS[question.key];
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [helping, startHelp] = useTransition();
  const [mode, setMode] = useState<Mode>(
    question.status === "missing" && def.kind !== "text" && !children
      ? "write"
      : "view",
  );
  const next = () => router.push(nextHref);
  const busy = pending || helping;
  const isField =
    def.kind === "text" || def.kind === "date" || def.kind === "money";
  const provenance = question.provenance;

  const help = () =>
    startHelp(async () => {
      const result = await proposeHelp(projectId, question.key);
      if (!result.ok) toast.error(t.helpErrors[result.error]);
      else if (result.count === 0 && suggestions.length === 0)
        toast.message(t.helpEmpty);
      router.refresh();
    });

  const secondary = editable && (
    <>
      {question.status === "missing" && def.allowNone && (
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => run(() => answerNone(projectId, question.key), next)}
        >
          {fr.framingIntel.none}
        </Button>
      )}
      {question.status === "to_confirm" && isField && (
        <Button
          size="lg"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            run(() => dismissQuestion(projectId, question.key), next)
          }
        >
          {t.dismiss}
        </Button>
      )}
      {question.status === "missing" && !def.required && (
        <Button
          size="lg"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            run(() => dismissQuestion(projectId, question.key), next)
          }
        >
          {t.skip}
        </Button>
      )}
    </>
  );

  const fieldActions =
    editable &&
    isField &&
    mode === "view" &&
    (question.status === "to_confirm" ? (
      <>
        <Button
          size="lg"
          disabled={busy}
          onClick={() =>
            run(() => confirmQuestion(projectId, question.key), next)
          }
        >
          {t.confirm}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => setMode("write")}
        >
          {t.modify}
        </Button>
      </>
    ) : question.status === "missing" ? (
      <>
        {def.poHelp && (
          <Button size="lg" disabled={busy} onClick={help}>
            {helping ? t.helping : t.help}
          </Button>
        )}
        <Button
          size="lg"
          variant={def.poHelp ? "outline" : "default"}
          disabled={busy}
          onClick={() => setMode("write")}
        >
          {t.write}
        </Button>
      </>
    ) : (
      <>
        <Button size="lg" disabled={busy} onClick={next}>
          {t.next}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={() => setMode("write")}
        >
          {t.modify}
        </Button>
      </>
    ));

  return (
    <FramingStepCard
      eyebrow={eyebrow}
      title={titleOf(question)}
      description={
        <span className="flex flex-col gap-2">
          <span>{fr.framingIntel.questions[question.key].why}</span>
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={factTone[question.status]} size="sm">
              {fr.framingIntel.statuses[question.status]}
            </StatusBadge>
          </span>
        </span>
      }
      actions={
        (fieldActions || secondary) && (
          <>
            {fieldActions}
            {mode === "view" && secondary}
          </>
        )
      }
    >
      {isField && question.display && mode === "view" && (
        <div className="flex flex-col gap-2">
          <p className="text-body-lg font-semibold break-words whitespace-pre-line">
            {question.display}
          </p>
          {provenance && (
            <span className="text-caption text-muted-foreground">
              {question.status === "known"
                ? t.knownFrom(sourceLabel(provenance))
                : t.proposedFrom(sourceLabel(provenance))}
            </span>
          )}
          {question.status === "to_confirm" && provenance?.quote && (
            <ToneCallout tone={reviewTone.proposed}>
              « {provenance.quote} »
            </ToneCallout>
          )}
          <ProvenanceNote provenance={provenance} />
        </div>
      )}

      {hint && mode !== "view" && (
        <p className="text-caption text-muted-foreground">{hint}</p>
      )}
      {hint && mode === "view" && question.status === "missing" && (
        <ToneCallout tone={reviewTone.proposed}>{hint}</ToneCallout>
      )}

      {isField &&
        suggestions.length > 0 &&
        mode === "view" &&
        question.status !== "known" && (
          <Suggestions
            projectId={projectId}
            questionKey={question.key}
            suggestions={suggestions}
            editable={editable}
            onChosen={next}
          />
        )}

      {isField && editable && mode === "write" && (
        <AnswerForm
          projectId={projectId}
          question={question}
          onCancel={
            question.status === "missing" && def.kind !== "text"
              ? undefined
              : () => setMode("view")
          }
          onDone={next}
        />
      )}

      {children}
    </FramingStepCard>
  );
}

function Suggestions({
  projectId,
  questionKey,
  suggestions,
  editable,
  onChosen,
}: {
  projectId: string;
  questionKey: string;
  suggestions: HelpSuggestion[];
  editable: boolean;
  onChosen: () => void;
}) {
  const t = fr.framingIntel.guide;
  const { pending, run } = useFramingAction();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" className="flex flex-col">
        {suggestions.map((s) => (
          <GuideRow
            key={s.text}
            selected={picked === s.text}
            onSelect={() => setPicked(s.text)}
            disabled={!editable || pending}
            detail={`${t.fromSource(s.sourceLabel)} · « ${s.quote} »`}
          >
            {s.text}
          </GuideRow>
        ))}
      </div>
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending || picked === null}
            onClick={() =>
              picked &&
              run(() => chooseHelp(projectId, questionKey, picked), onChosen)
            }
          >
            {t.choose}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => dismissHelp(projectId, questionKey))}
          >
            {t.dismiss}
          </Button>
        </div>
      )}
    </div>
  );
}

const initialOf = (q: QuestionState): string => {
  const a = q.answer;
  if (!a) return "";
  if (a.kind === "text") return a.text;
  if (a.kind === "date") return a.date;
  if (a.kind === "money") return (a.cents / 100).toString().replace(".", ",");
  return "";
};

function AnswerForm({
  projectId,
  question,
  onCancel,
  onDone,
}: {
  projectId: string;
  question: QuestionState;
  onCancel?: () => void;
  onDone: () => void;
}) {
  const t = fr.framingIntel.guide;
  const kind = QUESTIONS[question.key].kind;
  const { pending, run } = useFramingAction();
  const [value, setValue] = useState(initialOf(question));
  const id = `answer-${question.key}`;
  const submit = () =>
    run(
      () =>
        kind === "date"
          ? answerDate(projectId, question.key, value)
          : kind === "money"
            ? answerMoney(projectId, question.key, value)
            : answerText(projectId, question.key, value),
      onDone,
    );
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={id} required={QUESTIONS[question.key].required}>
          {kind === "date"
            ? t.dateLabel
            : kind === "money"
              ? t.amountLabel
              : t.answerLabel}
        </Label>
        {kind === "text" ? (
          <Textarea
            id={id}
            value={value}
            rows={3}
            maxLength={2000}
            placeholder={fr.framingIntel.questions[question.key].placeholder}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        ) : (
          <Input
            id={id}
            type={kind === "date" ? "date" : "text"}
            inputMode={kind === "money" ? "decimal" : undefined}
            value={value}
            placeholder={fr.framingIntel.questions[question.key].placeholder}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 w-fit min-w-48"
            autoFocus
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={pending || value.trim() === ""}
        >
          {t.save}
        </Button>
        {onCancel && (
          <Button
            type="button"
            size="lg"
            variant="ghost"
            disabled={pending}
            onClick={onCancel}
          >
            {t.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
