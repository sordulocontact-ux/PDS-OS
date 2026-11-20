"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { Button } from "@/components/ui/button";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { templateSourceUrl } from "@/lib/legal/contracts/template-source";

const fr = { legalContracts };

/** The file a template was imported from, downloaded by a short-lived link.
 * `label`: says what opening it is for (« Modifier »: the template is changed
 * in its source document, Ibé 18/11/2026) instead of the file's name. */
export function TemplateSourceLink({
  templateId,
  name,
  label,
}: {
  templateId: string;
  name: string;
  label?: string;
}) {
  const t = fr.legalContracts.templates.source;
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="max-w-full self-start"
      disabled={pending}
      aria-label={
        label
          ? fr.legalContracts.templates.document.editLabel(name)
          : `${t.open} : ${name}`
      }
      onClick={() =>
        startTransition(async () => {
          const result = await templateSourceUrl(templateId);
          if (!result.ok) return void toast.error(result.error);
          window.location.assign(result.url);
        })
      }
    >
      {!label && <IconPaperclip aria-hidden />}
      <span className="truncate">{label ?? name}</span>
    </Button>
  );
}
