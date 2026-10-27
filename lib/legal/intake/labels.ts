// How a fact of the Cadrage juridique reads on screen (review and answered
// list). Client-safe.

import { contracts } from "@/lib/i18n/fr/contracts";
import { legal } from "@/lib/i18n/fr/legal";
import { masterPage } from "@/lib/i18n/fr/master-page";
import type { FactValue, QuestionKey } from "@/lib/legal/intake/types";

const fr = { contracts, legal, masterPage };

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
