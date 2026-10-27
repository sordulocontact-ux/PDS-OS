"use client";

import { IconPaperclip } from "nucleo-sharp-essential";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import { templateSourceUrl } from "@/lib/legal/contracts/template-source";

const fr = { legalContracts };

/** The file a template was imported from, downloaded by a short-lived link. */
export function TemplateSourceLink({
  templateId,
  name,
}: {
  templateId: string;
  name: string;
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
      aria-label={`${t.open} : ${name}`}
      onClick={() =>
        startTransition(async () => {
          const result = await templateSourceUrl(templateId);
          if (!result.ok) return void toast.error(result.error);
          window.location.assign(result.url);
        })
      }
    >
      <IconPaperclip aria-hidden />
      <span className="truncate">{name}</span>
    </Button>
  );
}
