// The outcome of a write from a dialog or a button: an error already in
// French. Every domain's result type with this shape fits (PrepResult…).
//
// After a gesture on a journey, the result may also say what follows
// (VISION-UX rule 7, proto « Projet complet »): `done`, the gesture in the
// past participle (« Dossier confirmé »), `next`, who acts now and on what,
// and `unlocked`, the steps that just opened. Computed by code, by reading
// the journeys again after the write (lib/journey/outcome.ts), never
// written by hand; shown by ResultBanner in the step, and `done` is the
// toast. `open`: the viewer's own next step, on another page, which the
// client opens at once (the banner goes with it); without it, the banner
// says who is awaited. All optional: a plain `{ ok: true }` still fits.

/** « À vous : … » or « En attente de **Claire Morel** (lien privé) :
 * valider la V1 (Étape) ». */
export type ResultNext = {
  who: string;
  // The step is the viewer's (« À vous »), else someone is awaited.
  viewer: boolean;
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

/** The viewer's next step, elsewhere: opened for them after the gesture. */
export type ResultOpen = {
  href: string;
  // « Cadrage › Brief de cadrage »
  step: string;
};

export type WriteDone = {
  ok: true;
  // Done, with a warning to show instead of the success toast.
  notice?: string;
  done?: string;
  next?: ResultNext[];
  unlocked?: ResultUnlocked[];
  open?: ResultOpen;
  // Where the gesture was made, when it is said there in one quiet line
  // rather than by the step's banner (ResultLine: the answers of « Les 6
  // dimensions », in the dimension or above PO's question, Sacha 09/11/2026).
  at?: string;
};

export type WriteResult = WriteDone | { ok: false; error: string };
