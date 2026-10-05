"use client";

import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { fr } from "@/lib/i18n/fr";
import { factLabel } from "@/lib/legal/intake/labels";
import type { IntakeQuestion } from "@/lib/legal/intake/types";

/**
 * The questions already answered, compacted (ticket Juridique 01:
 * « l'historique traité se compacte »): what was kept, and « Corriger »,
 * which asks the question again (the new answer supersedes, the history
 * stays).
 */
export function AnsweredList({
  questions,
  onCorrect,
}: {
  questions: IntakeQuestion[];
  onCorrect: (question: IntakeQuestion) => void;
}) {
  const t = fr.legal.intake;
  if (questions.length === 0) return null;
  return (
    <PageSection card id="legal-answers" title={t.answers}>
      <DataTable>
        <DataTableHeader>
          <DataTableHead>{fr.facts.columns.fact}</DataTableHead>
          <DataTableHead fill>{t.reviewTitle}</DataTableHead>
          <DataTableHead align="end" className="w-px">
            <span className="sr-only">{fr.facts.columns.actions}</span>
          </DataTableHead>
        </DataTableHeader>
        <DataTableBody>
          {questions.map((question) => (
            <DataTableRow key={`${question.key}-${question.masterId}`}>
              <DataTableCell>
                <DataTableMedia
                  title={t.questions[question.key].short}
                  subtitle={question.title ?? t.project}
                />
              </DataTableCell>
              <DataTableCell fill className="max-w-0">
                <span className="line-clamp-2 break-words">
                  {question.facts
                    .map((fact) => factLabel(fact, question.key))
                    .join(" · ") || question.lastAnswer}
                </span>
              </DataTableCell>
              <DataTableCell align="end" className="w-px whitespace-nowrap">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => onCorrect(question)}
                >
                  {t.correct}
                </Button>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </PageSection>
  );
}
