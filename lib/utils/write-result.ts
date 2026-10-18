// The outcome of a write from a dialog or a button: an error already in
// French. Every domain's result type with this shape fits (PrepResult…).
//
// After a gesture on a journey, the result may also say what follows
// (VISION-UX rule 7, proto « Projet complet »): `done`, the gesture in the
// past participle (« Dossier confirmé »), `next`, who acts now and on what,
// and `unlocked`, the steps that just opened. Computed by code, by reading
// the journeys again after the write (lib/journey/outcome.ts), never
// written by hand; shown by ResultBanner in the step, and `done` is the
// toast. All optional: a plain `{ ok: true }` still fits.

/** « Ensuite : **Claire Morel** (lien privé) · valider la V1 (Étape) ». */
export type ResultNext = {
  who: string;
  viaLink: boolean;
  todo: string;
  // « Master › Mixage »
  step: string;
};

/** « Débloqué : **Mixage** · Karim Haddou · déposer le Mix V1 ». */
export type ResultUnlocked = {
  step: string;
  who: string | null;
  todo: string | null;
};

export type WriteDone = {
  ok: true;
  // Done, with a warning to show instead of the success toast.
  notice?: string;
  done?: string;
  next?: ResultNext[];
  unlocked?: ResultUnlocked[];
};

export type WriteResult = WriteDone | { ok: false; error: string };
