"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DecisionPanel } from "@/components/ui/decision-panel";
import { DocumentCard } from "@/components/ui/document-card";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { routes } from "@/lib/auth/redirects";
import { legalDocuments } from "@/lib/i18n/fr/legal-documents";
import { decideTemplateRequest } from "@/lib/legal/contracts/template-request-actions";
import type { TemplateRequest } from "@/lib/legal/contracts/template-requests";

const fr = { legalDocuments };

const t = fr.legalDocuments.template;

/**
 * « À vous · Valider un modèle de contrat » (proto « Projet complet », Plan
 * d'action, direction): the template as a document — its file, who imported
 * it for whom, the roles it applies to, the values PO found — then « Valider
 * le modèle » or « Refuser le modèle » with what is wrong, signed back to
 * the one who made it.
 */
export function TemplateRequestCard({
  projectId,
  request,
}: {
  projectId: string;
  request: TemplateRequest;
}) {
  return (
    <section
      aria-label={t.toValidate}
      className="flex flex-col gap-3 rounded-2xl border border-[color:var(--selection-border)] p-4"
    >
      <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold text-[color:var(--text-secondary)]">
        {t.toValidate}
      </span>
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.toValidateBody}
      </p>
      <DocumentCard
        name={request.name}
        line={t.importedBy(
          request.sourceName,
          request.createdBy,
          request.forName,
        )}
        action={
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={routes.contractTemplate(request.seriesId)} />}
          >
            {t.view}
          </Button>
        }
      >
        <FactRows>
          <FactRow
            label={t.appliesTo}
            value={request.roles.join(", ")}
            source={t.appliesToSource}
          />
          {request.fields.map((field) => (
            <FactRow
              key={field}
              label={field}
              value={t.fieldValue}
              source={t.fieldSource}
            />
          ))}
        </FactRows>
      </DocumentCard>
      <DecisionPanel
        id={`template-${request.id}`}
        title={null}
        commentLabel={t.refuseWhy}
        commentHint={t.refuseHint(request.createdBy)}
        commentPlaceholder={t.refusePlaceholder}
        commentRequired={t.refuseMissing}
        outcomes={[
          { kind: "approve", label: t.validate, done: t.validated },
          { kind: "refuse", label: t.refuse, done: t.refused },
        ]}
        onDecide={(kind, comment) =>
          decideTemplateRequest(projectId, request.id, kind, comment)
        }
      />
    </section>
  );
}
