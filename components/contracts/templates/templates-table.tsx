import { IconFile } from "nucleo-sharp-essential";

import { TemplateRowActions } from "@/components/contracts/templates/template-row-actions";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableIcon,
  DataTableMedia,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { fr } from "@/lib/i18n/fr";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";
import { templateStatusTone } from "@/lib/ui/state-tones";

// One line per template (its latest version): what it is, who it is for,
// whether it can be used; « ⋯ » reads it and moves it on.
export function TemplatesTable({ templates }: { templates: TemplateSeries[] }) {
  const t = fr.legalContracts.templates;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead>{t.columns.name}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.roles}</DataTableHead>
        <DataTableHead hideBelow="sm" fill>
          {t.columns.status}
        </DataTableHead>
        <DataTableActionsHead label={fr.records.menu.column} />
      </DataTableHeader>
      <DataTableBody>
        {templates.map((template) => (
          <DataTableRow key={template.seriesId}>
            <DataTableCell>
              <DataTableMedia
                visual={<DataTableIcon icon={IconFile} />}
                title={`${template.name} · ${t.version(template.version)}`}
                subtitle={[fr.contracts.types[template.type], template.usage]
                  .filter(Boolean)
                  .join(" · ")}
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
              <TemplateRowActions template={template} />
            </DataTableActionsCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
