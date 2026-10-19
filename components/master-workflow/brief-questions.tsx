import { ApplyAnswerButton } from "@/components/master-workflow/apply-answer-button";
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
 * The questions of the Brief (ticket § 6), asked when the owner starts it
 * directly: each one answered right here by the person asked, then put into
 * the Brief by the owner.
 */
export function BriefQuestions({
  projectId,
  view,
}: {
  projectId: string;
  view: BriefQuestionsView;
}) {
  return (
    <PageSection
      id="brief-questions"
      title={t.title}
      description={t.description}
      card
    >
      {view.failed ? (
        <EmptyNote>{fr.facts.failed}</EmptyNote>
      ) : (
        <div className="grid gap-6">
          {view.questions.length === 0 ? (
            <EmptyNote>{t.empty}</EmptyNote>
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
