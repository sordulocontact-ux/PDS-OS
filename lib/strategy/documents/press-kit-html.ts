// The Dossier de presse's HTML: the shared editorial renderer
// (lib/strategy/documents/editorial-html.ts), named for the media — the
// same direction and visual system as the Plan de sortie. Client-safe.

import { fr } from "@/lib/i18n/fr";
import { editorialHtml } from "@/lib/strategy/documents/editorial-html";
import type { PressKitContent } from "@/lib/strategy/documents/press-kit-model";

export function pressKitHtml(content: PressKitContent): string {
  return editorialHtml(
    content,
    `${fr.strategyPressKit.document.kind} · ${content.project.title}`,
  );
}
