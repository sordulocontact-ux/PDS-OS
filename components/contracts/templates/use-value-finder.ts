"use client";

import { useTransition } from "react";

import type { DocumentEditorHandle } from "@/components/contracts/document-editor";
import { toast } from "@/components/ui/toast";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";
import {
  suggestTemplateValues,
  type TemplateAbout,
} from "@/lib/legal/contracts/template-values";

const fr = { legalContracts };

/**
 * A contract already filled in for someone, imported or pasted whole: the
 * code and PO find its values (the person's name, e-mail, a date of birth to
 * fill…) and each one becomes the information to fill, at once, shown found
 * on the page — clicked there to correct it (Sacha 25/11/2026, the list of
 * what PO found removed). What PO says of the template fills the form.
 */
export function useValueFinder(
  editor: React.RefObject<DocumentEditorHandle | null>,
  onAbout: (about: TemplateAbout) => void,
) {
  const t = fr.legalContracts.templates.values;
  const [pending, startTransition] = useTransition();

  const find = (text: string) =>
    startTransition(async () => {
      const result = await suggestTemplateValues(text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.about) onAbout(result.about);
      // Longest first: « Jean Dupont » before « Dupont ».
      for (const s of [...result.suggestions].sort(
        (a, b) => b.excerpt.length - a.excerpt.length,
      ))
        editor.current?.replace(s, s.field);
      const notice = result.quota ?? (result.partial ? t.partial : null);
      if (notice) toast.warning(notice);
    });

  return { find, pending };
}
