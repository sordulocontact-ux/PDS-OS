"use client";

import { useState } from "react";

import { TemplateDialog } from "@/components/contracts/templates/template-dialog";
import { TemplateRowActions } from "@/components/contracts/templates/template-row-actions";
import { templateKind } from "@/components/contracts/templates/template-view";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { legalForms } from "@/lib/i18n/fr/legal-forms";
import { records } from "@/lib/i18n/fr/records";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";
import { templateStatusTone } from "@/lib/ui/state-tones";

const fr = { legalContracts, legalForms, records };

// One line per template (its latest version): what it is, who it is for,
// whether it can be used; its name opens it in a modal, not a page (Sacha
// 25/11/2026); « ⋯ » moves it on.
export function TemplatesTable({
  templates,
  organizationId,
}: {
  templates: TemplateSeries[];
  organizationId: string;
}) {
  const t = fr.legalContracts.templates;
  // By series: the template read again after « Valider » stays open.
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <DataTable>
        <DataTableHeader>
          <DataTableHead icon="contract">{t.columns.name}</DataTableHead>
          <DataTableHead icon="role" hideBelow="md">
            {t.columns.roles}
          </DataTableHead>
          <DataTableHead icon="status" hideBelow="sm" fill>
            {t.columns.status}
          </DataTableHead>
          <DataTableActionsHead label={fr.records.menu.column} />
        </DataTableHeader>
        <DataTableBody>
          {templates.map((template) => (
            <DataTableRow key={template.seriesId}>
              <DataTableCell>
                <DataTableMedia
                  title={
                    <DataTableLink
                      href={null}
                      onOpen={() => setOpen(template.seriesId)}
                    >
                      {`${template.name} · ${t.version(template.version)}`}
                    </DataTableLink>
                  }
                  subtitle={templateKind(template)}
                />
              </DataTableCell>
              <DataTableCell hideBelow="md">
                <span className="line-clamp-2 whitespace-normal">
                  {template.roles
                    .map((role) => fr.legalForms.roles[role])
                    .join(", ")}
                </span>
              </DataTableCell>
              <DataTableCell hideBelow="sm" fill>
                <StatusBadge tone={templateStatusTone[template.status]}>
                  {t.states[template.status]}
                </StatusBadge>
              </DataTableCell>
              <DataTableActionsCell>
                <TemplateRowActions
                  template={template}
                  organizationId={organizationId}
                />
              </DataTableActionsCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
      <TemplateDialog
        template={templates.find((x) => x.seriesId === open) ?? null}
        onClose={() => setOpen(null)}
      />
    </>
  );
}
