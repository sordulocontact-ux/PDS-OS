"use client";

import { TemplateValidateButton } from "@/components/contracts/templates/template-validate-button";
import { TemplateView } from "@/components/contracts/templates/template-view";
import { FormDialog } from "@/components/ui/form-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import type { TemplateSeries } from "@/lib/legal/contracts/templates";
import { templateStatusTone } from "@/lib/ui/state-tones";

const fr = { legalContracts };

/**
 * A template opened from the list, in a modal rather than its page (Sacha
 * 25/11/2026: « je veux pas que ça ouvre une page »): its state, « Valider »
 * for whoever validates a draft, the document itself; the document on the
 * left, the rest on the right (TemplateView).
 */
export function TemplateDialog({
  template,
  onClose,
}: {
  // null: closed.
  template: TemplateSeries | null;
  onClose: () => void;
}) {
  const t = fr.legalContracts.templates;
  return (
    <FormDialog
      open={template !== null}
      onOpenChange={(next) => !next && onClose()}
      title={
        template ? `${template.name} · ${t.version(template.version)}` : ""
      }
      closeLabel={t.close}
      size="document"
    >
      {template && (
        <TemplateView
          template={template}
          head={
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge tone={templateStatusTone[template.status]}>
                  {t.states[template.status]}
                </StatusBadge>
                {template.can.validate && (
                  <TemplateValidateButton templateId={template.id} />
                )}
              </div>
              {template.status === "draft" && !template.can.validate && (
                <ToneCallout tone="info">{t.whoValidates}</ToneCallout>
              )}
            </>
          }
        />
      )}
    </FormDialog>
  );
}
