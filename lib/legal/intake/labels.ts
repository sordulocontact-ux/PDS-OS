// How a fact of the Cadrage juridique reads on screen (review and answered
// list). Client-safe.

import { fr } from "@/lib/i18n/fr";
import type { FactValue, QuestionKey } from "@/lib/legal/intake/types";

export function factLabel(fact: FactValue, question: QuestionKey): string {
  const t = fr.legal.intake.facts;
  switch (fact.kind) {
    case "contribution": {
      const role =
        fact.value.role === "performer"
          ? t.performer
          : fr.masterPage.credits.roles[fact.value.role];
      return `${fact.value.name} · ${role}`;
    }
    case "third_party":
      return t.third_party(
        t.elements[fact.value.element],
        fact.value.work,
        fact.value.author,
      );
    case "agreement":
      return `${fact.value.party} · ${fr.contracts.types[fact.value.type]}`;
    case "publisher":
      return fact.value.name;
    case "none":
      return t.none[question];
  }
}
