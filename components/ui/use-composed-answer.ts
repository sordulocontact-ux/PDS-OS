import { useState } from "react";

import type { ChoiceValue } from "@/lib/ui/choice-value";

const sameSet = (a: string[], b: string[]) =>
  JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/**
 * A closed-choice answer being edited (Stratégie, Conception): the checked
 * choices and « Autre », and the answer text written from them by code
 * (`compose`) until the person types in it themselves. `dirty`: something
 * differs from what is saved.
 */
export function useComposedAnswer({
  saved,
  savedText,
  compose,
}: {
  saved: ChoiceValue;
  // The saved answer; null when none yet.
  savedText: string | null;
  compose: (value: ChoiceValue) => string;
}) {
  const [choices, setChoices] = useState<string[]>(saved.choices);
  const [otherOn, setOtherOn] = useState(saved.other !== null);
  const [other, setOther] = useState(saved.other ?? "");

  const composedFromSaved = compose(saved);
  const [text, setText] = useState(savedText ?? composedFromSaved);
  const [manual, setManual] = useState(
    savedText !== null && savedText !== composedFromSaved,
  );

  const composeFrom = (
    nextChoices: string[],
    nextOther: string,
    otherShown: boolean,
  ) =>
    compose({
      choices: nextChoices,
      other: otherShown && nextOther.trim() ? nextOther : null,
    });
  const follow = (
    nextChoices: string[],
    nextOther: string,
    otherShown: boolean,
  ) => {
    if (!manual) setText(composeFrom(nextChoices, nextOther, otherShown));
  };
  const pick = (next: string[]) => {
    setChoices(next);
    follow(next, other, otherOn);
  };

  const dirty = !(
    sameSet(choices, saved.choices) &&
    (otherOn ? other.trim() : "") === (saved.other ?? "") &&
    text.trim() === (savedText ?? composedFromSaved).trim()
  );

  return {
    choices,
    otherOn,
    other,
    text,
    manual,
    dirty,
    // What is saved with the text.
    value: { choices, other: otherOn ? other : null } satisfies ChoiceValue,
    toggle: (choice: string) =>
      pick(
        choices.includes(choice)
          ? choices.filter((c) => c !== choice)
          : [...choices, choice],
      ),
    // Choices accepted from PO's pre-checks.
    add: (accepted: string[]) => pick([...new Set([...choices, ...accepted])]),
    toggleOther: () => {
      setOtherOn(!otherOn);
      follow(choices, other, !otherOn);
    },
    changeOther: (value: string) => {
      setOther(value);
      follow(choices, value, otherOn);
    },
    changeText: (value: string) => {
      setText(value);
      setManual(true);
    },
    recompose: () => {
      setText(composeFrom(choices, other, otherOn));
      setManual(false);
    },
  };
}
