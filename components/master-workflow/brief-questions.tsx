import { ApplyAnswerButton } from "@/components/master-workflow/apply-answer-button";
import { AskQuestionsButton } from "@/components/master-workflow/ask-questions-button";
import { QuestionAnswerForm } from "@/components/master-workflow/question-answer-form";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import {
  questionStateOf,
  type BriefQuestion,
  type BriefQuestionsView,
} from "@/lib/master-workflow/question-types";
import { formatShortDate } from "@/lib/release/format";
import { briefQuestionTone } from "@/lib/ui/state-tones";

const t = fr.masterWorkflow.questions;

/**
 * "Questions à l'équipe" of the Brief page (ticket § 6): who should be asked
 * what (decided by code) and "Poser les questions" for the owner; then each
 * question, answered right here by the person asked, and put into the brief
 * by the owner.
 */
export function BriefQuestions({
  projectId,
  view,
}: {
  projectId: string;
  view: BriefQuestionsView;
}) {
  const canAsk = view.canAsk && view.toAsk.length > 0;
  return (
    <PageSection
      id="brief-questions"
      title={t.title}
      description={t.description}
      card
      action={canAsk && <AskQuestionsButton projectId={projectId} />}
    >
      {view.failed ? (
        <EmptyNote>{fr.facts.failed}</EmptyNote>
      ) : (
        <div className="grid gap-6">
          {view.canAsk && <AskPlan view={view} />}
          {view.questions.length === 0 ? (
            // The plan above already says what would be asked.
            !canAsk && <EmptyNote>{t.empty}</EmptyNote>
          ) : (
            <ul className="grid gap-6">
              {view.questions.map((question) => (
                <QuestionItem
                  key={question.id}
                  projectId={projectId}
                  question={question}
                  canApply={view.canAsk}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </PageSection>
  );
}

/** What the owner would ask, and to whom — or why there is nothing to. */
function AskPlan({ view }: { view: BriefQuestionsView }) {
  if (view.noCreatives)
    return (
      <p className="text-sm text-[color:var(--text-secondary)]">
        {t.noCreatives}
      </p>
    );
  if (view.toAsk.length === 0)
    // Already asked: the list below says where each question stands.
    return view.questions.length > 0 ? null : (
      <p className="text-sm text-[color:var(--text-secondary)]">
        {t.nothingToAsk}
      </p>
    );
  return (
    <div className="grid gap-1 text-sm">
      <p className="text-[color:var(--text-secondary)]">{t.plan}</p>
      <ul className="grid gap-1">
        {view.toAsk.map((item) => (
          <li key={item.dimension} className="font-medium">
            {t.planRow(
              t.dimensions[item.dimension],
              item.people.map((person) => person.name).join(", "),
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionItem({
  projectId,
  question,
  canApply,
}: {
  projectId: string;
  question: BriefQuestion;
  canApply: boolean;
}) {
  const state = questionStateOf(question);
  return (
    <li className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{t.dimensions[question.dimension]}</p>
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.askedTo(
              question.askedTo.name,
              formatShortDate(question.askedAt),
            )}
          </p>
        </div>
        <StatusBadge tone={briefQuestionTone[state]}>
          {t.states[state]}
        </StatusBadge>
      </div>
      {state === "open" ? (
        question.isMine && (
          <QuestionAnswerForm
            projectId={projectId}
            questionId={question.id}
            dimension={question.dimension}
          />
        )
      ) : (
        <Answer question={question} />
      )}
      {state === "answered" && canApply && (
        <div className="grid justify-items-start gap-1">
          <ApplyAnswerButton projectId={projectId} questionId={question.id} />
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.applyHint}
          </p>
        </div>
      )}
    </li>
  );
}

function Answer({ question }: { question: BriefQuestion }) {
  const choices = question.answerChoices;
  return (
    <p className="text-sm whitespace-pre-wrap">
      {choices === null
        ? question.answerText
        : choices.length === 0
          ? t.nothingElse
          : choices
              .map((value) => fr.masterWorkflow.brief.deliverables[value])
              .join(", ")}
    </p>
  );
}
