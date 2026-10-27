"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { GuideRow } from "@/components/framing/guide/guide-row";
import { sourceLabel } from "@/components/framing/guide/source-quote";
import { SourceLine } from "@/components/framing/source-line";
import {
  LaterForm,
  NotApplicableForm,
} from "@/components/framing/intel/answer-states";
import {
  ItemsAnswer,
  MeasureAnswer,
} from "@/components/framing/intel/structured-answer";
import { useNextQuestion } from "@/components/framing/dimensions/use-next-question";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PoQuestion } from "@/components/ui/po-question";
import { Textarea } from "@/components/ui/textarea";
import { answerEnvelope } from "@/lib/framing/actions/answers";
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
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";

const fr = { framingIntel, framingJourney };

// na / later: « Non applicable », « À définir plus tard » (PROJ-UX-04).
type Mode = "view" | "write" | "na" | "later";

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
 * (« Rien à signaler », « Passer »). In the box every question of PO uses
 * (PoQuestion, shared with the Cadrage juridique).
 */
export function QuestionScreen({
  projectId,
  question,
  eyebrow,
  editable,
  nextHref,
  suggestions = [],
  hint,
  itemPresets = [],
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
  // Items to pick in one click for a structured list (PROJ-UX-05).
  itemPresets?: string[];
  children?: React.ReactNode;
}) {
  const t = fr.framingIntel.guide;
  const def = QUESTIONS[question.key];
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [helping, startHelp] = useTransition();
  const isField =
    def.kind === "text" || def.kind === "date" || def.kind === "money";
  const initialMode: Mode =
    question.status === "missing" && isField && !children ? "write" : "view";
  const [mode, setMode] = useState<Mode>(initialMode);
  // A PO suggestion picked: it opens the answer, editable, never saved as
  // is (« M'aider à définir » proposes, a person decides; PROJ-UX-04).
  const [picked, setPicked] = useState<string | null>(null);
  const goNext = useNextQuestion(nextHref, question.key);
  const g = fr.framingJourney.dimensions.gesture;
  // After a gesture: its confirmation, then the next question (or the
  // Brief de cadrage after the last one).
  const next = (done: string) => () => goNext(done);
  const busy = pending || helping;
  const provenance = question.provenance;
  // A sentence where a structure is asked (a call's proposal): structured
  // before it is confirmed, its source kept.
  const unstructured =
    !!def.shape &&
    question.answer?.kind === "text" &&
    !question.answer.items &&
    !question.answer.measure;

  const help = () =>
    startHelp(async () => {
      const result = await proposeHelp(projectId, question.key);
      if (!result.ok) {
        toast.error(
          result.error === "quota"
            ? result.message
            : t.helpErrors[result.error],
        );
        // The page may be stale (stage locked…): only a success revalidates.
        router.refresh();
      } else if (result.count === 0 && suggestions.length === 0)
        toast.message(t.helpEmpty);
    });

  const secondary = editable && (
    <>
      {question.status !== "known" && def.kind !== "parties" && (
        <>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setMode("na")}
          >
            {fr.framingIntel.answerStates.naAction}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setMode("later")}
          >
            {fr.framingIntel.answerStates.laterAction}
          </Button>
        </>
      )}
      {question.status === "missing" && def.allowNone && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            run(() => answerNone(projectId, question.key), next(g.saved))
          }
        >
          {fr.framingIntel.none}
        </Button>
      )}
      {question.status === "to_confirm" && isField && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            run(
              () => dismissQuestion(projectId, question.key),
              next(g.dismissed),
            )
          }
        >
          {t.dismiss}
        </Button>
      )}
      {question.status === "missing" && !def.required && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() =>
            run(() => dismissQuestion(projectId, question.key), next(g.skipped))
          }
        >
          {t.skip}
        </Button>
      )}
    </>
  );

  // To confirm: « Confirmer » / « Modifier »; known (opened again):
  // « Modifier » (proto frQuestion).
  const viewActions =
    editable &&
    isField &&
    mode === "view" &&
    (question.status === "missing" ? (
      // A list question shows its lines first; its single value is written
      // on demand (« M'aider à définir », « Écrire moi-même »).
      <div className="flex flex-wrap gap-2">
        {def.poHelp && (
          <Button variant="outline" disabled={busy} onClick={help}>
            {helping ? t.helping : t.help}
          </Button>
        )}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => setMode("write")}
        >
          {t.write}
        </Button>
      </div>
    ) : (
      <div className="flex flex-wrap gap-2">
        {question.status === "to_confirm" &&
          (unstructured ? (
            <Button disabled={busy} onClick={() => setMode("write")}>
              {t.structure}
            </Button>
          ) : (
            <Button
              disabled={busy}
              onClick={() =>
                run(
                  () => confirmQuestion(projectId, question.key),
                  next(g.confirmed),
                )
              }
            >
              {pending ? t.confirming : t.confirm}
            </Button>
          ))}
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => setMode("write")}
        >
          {t.modify}
        </Button>
      </div>
    ));

  // A missing information: the field is open at once (it is « Écrire
  // moi-même »), « M'aider à définir » above it (proto frQuestion).
  const missingWrite = question.status === "missing" && mode === "write";
  const quote =
    provenance?.kind === "call" || provenance?.kind === "voice"
      ? provenance.quote
      : null;

  return (
    <PoQuestion eyebrow={eyebrow} title={titleOf(question)}>
      {isField && question.display && mode === "view" && (
        <div className="flex flex-col gap-1">
          <p className="text-body-md font-semibold break-words whitespace-pre-line">
            {question.display}
          </p>
          {quote ? (
            <p className="text-caption text-[color:var(--text-secondary)]">
              « {quote} » · {provenance ? sourceLabel(provenance) : ""}
            </p>
          ) : (
            <SourceLine
              projectId={projectId}
              provenance={provenance}
              state={
                question.status === "known"
                  ? "known"
                  : question.fromRecord
                    ? "record"
                    : "proposed"
              }
              confirmed={question.confirmed}
            />
          )}
        </div>
      )}

      {hint && question.status === "missing" && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {hint}
        </p>
      )}

      {isField &&
        editable &&
        missingWrite &&
        def.poHelp &&
        suggestions.length === 0 && (
          <div>
            <Button size="sm" variant="outline" disabled={busy} onClick={help}>
              {helping ? t.helping : t.help}
            </Button>
          </div>
        )}
      {isField &&
        suggestions.length > 0 &&
        question.status !== "known" &&
        (mode === "view" || missingWrite) && (
          <Suggestions
            projectId={projectId}
            questionKey={question.key}
            suggestions={suggestions}
            editable={editable}
            onPick={(text) => {
              setPicked(text);
              setMode("write");
            }}
          />
        )}

      {isField &&
        editable &&
        mode === "write" &&
        (def.shape === "items" ? (
          <ItemsAnswer
            projectId={projectId}
            question={question}
            draft={picked}
            keepSource={question.proposed && !picked}
            presets={itemPresets}
            onCancel={() => setMode("view")}
            onDone={next(g.saved)}
          />
        ) : def.shape === "measure" ? (
          <MeasureAnswer
            projectId={projectId}
            question={question}
            draft={picked}
            keepSource={question.proposed && !picked}
            onCancel={() => setMode("view")}
            onDone={next(g.saved)}
          />
        ) : (
          <AnswerForm
            key={picked ?? ""}
            projectId={projectId}
            question={question}
            picked={picked}
            onCancel={
              question.status === "missing" && !picked
                ? undefined
                : () => {
                    setPicked(null);
                    setMode(question.status === "missing" ? "write" : "view");
                  }
            }
            onDone={next(g.saved)}
          />
        ))}
      {viewActions}
      {editable && mode === "na" && (
        <NotApplicableForm
          projectId={projectId}
          questionKey={question.key}
          onCancel={() => setMode(initialMode)}
          onDone={next(g.notApplicable)}
        />
      )}
      {editable && mode === "later" && (
        <LaterForm
          projectId={projectId}
          questionKey={question.key}
          onCancel={() => setMode(initialMode)}
          onDone={next(g.later)}
        />
      )}

      {children}
      {(mode === "view" || missingWrite) && secondary && (
        <div className="flex flex-wrap gap-1">{secondary}</div>
      )}
    </PoQuestion>
  );
}

function Suggestions({
  projectId,
  questionKey,
  suggestions,
  editable,
  onPick,
}: {
  projectId: string;
  questionKey: string;
  suggestions: HelpSuggestion[];
  editable: boolean;
  // The formulation picked opens the answer to edit, nothing is saved yet.
  onPick: (text: string) => void;
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
            onClick={() => picked && onPick(picked)}
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
  picked,
  onCancel,
  onDone,
}: {
  projectId: string;
  question: QuestionState;
  // A PO suggestion to start from, saved with its source if kept or edited.
  picked: string | null;
  onCancel?: () => void;
  onDone: () => void;
}) {
  const t = fr.framingIntel.guide;
  const kind = QUESTIONS[question.key].kind;
  const { pending, run } = useFramingAction();
  const [value, setValue] = useState(picked ?? initialOf(question));
  const envelope = question.key === "budget_envelope";
  const [certainty, setCertainty] = useState<"confirmed" | "estimated">(
    question.answer?.kind === "money" &&
      question.answer.certainty === "estimated"
      ? "estimated"
      : "confirmed",
  );
  const id = `answer-${question.key}`;
  const submit = () =>
    run(
      () =>
        kind === "date"
          ? answerDate(projectId, question.key, value)
          : envelope
            ? answerEnvelope(projectId, question.key, value, certainty)
            : kind === "money"
              ? answerMoney(projectId, question.key, value)
              : picked
                ? chooseHelp(projectId, question.key, picked, value)
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
      {envelope && (
        <ChoiceCards
          name="envelope-certainty"
          legend={fr.framingIntel.certainty.label}
          required
          columns={3}
          value={certainty}
          onChange={setCertainty}
          choices={[
            { value: "confirmed", label: fr.framingIntel.certainty.confirmed },
            { value: "estimated", label: fr.framingIntel.certainty.estimated },
          ]}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || value.trim() === ""}>
          {t.confirm}
        </Button>
        {onCancel && (
          <Button
            type="button"
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
