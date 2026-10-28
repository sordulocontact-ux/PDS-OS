// The common call form (docs/ARCHITECTURE.md § 4 ter): what a module hands
// it, computed on the server, and what it sends back. Client-safe.

export const PREPARED_CALL_KINDS = [
  "framing",
  "strategy",
  "design",
  "production",
  "technical",
  "master",
] as const;
export type PreparedCallKind = (typeof PREPARED_CALL_KINDS)[number];

export const PREP_FORMATS = ["video", "in_person"] as const;
export type PrepFormat = (typeof PREP_FORMATS)[number];

/** How someone hears of the call: in the app, on a private link, by e-mail. */
export type InviteChannel = "app" | "link" | "email";

/**
 * Someone who may take part: a member of the project's team ("m:<personId>"),
 * a contact of the Réseau ("c:<contactId>"), or an address typed in the
 * field ("e:<email>"). Always an id, never a name typed (CLAUDE.md,
 * « Formulaires »).
 */
export type PrepPerson = {
  key: string;
  name: string;
  // Their function in the call or their role (« Responsable du projet »…).
  detail: string;
  external: boolean;
  // Null: a contact without address, who cannot be invited yet.
  invite: InviteChannel | null;
  email: string | null;
};

/** A point of the agenda: PO's (`key`) or the person's own (`key` null). */
export type PrepTopic = {
  key: string | null;
  topic: string;
  // Null: PO's estimate is kept.
  minutes: number | null;
  questions: string[];
};

/** A line of « Envoyé avec l'invitation » (Documents, Sujets…). */
export type PrepFact = { label: string; value: string; source?: string };

/** What a module computes for its form (`defaults`), never the browser. */
export type CallPrepDefaults = {
  kind: PreparedCallKind;
  projectId: string;
  // « Nouvel échange » or « Nouveau call ».
  noun: "exchange" | "call";
  // The call's name, computed (the proto asks none).
  title: string;
  // What the module needs back (a production sheet, deliverables…).
  target: Record<string, string>;
  people: PrepPerson[];
  attendeeKeys: string[];
  agenda: PrepTopic[];
  goal: string;
  facts: PrepFact[];
  // Documents to pick (Cadrage); otherwise named in `facts`.
  documents?: Array<{ id: string; name: string }>;
  note?: string;
  // "YYYY-MM-DD" and "HH:mm" when the module knows them; empty otherwise.
  date: string;
  time: string;
  format: PrepFormat;
  // Google Calendar is connected: the Meet link is created at confirmation.
  googleMeet: boolean;
  // Video only for some kinds (the Cadrage has no format column).
  formats: readonly PrepFormat[];
};

/** What the form sends to createPreparedCall. */
export type PreparedCallInput = {
  kind: PreparedCallKind;
  projectId: string;
  target: Record<string, string>;
  title: string;
  occurredAt: string;
  format: PrepFormat;
  meetingUrl: string;
  goal: string;
  attendeeKeys: string[];
  agenda: Array<{ key: string | null; topic: string; minutes: number | null }>;
  documentIds: string[];
  // The module's lines of « Envoyé avec l'invitation » (Sujets, Points
  // ouverts…), as shown: written in the invitation's description.
  facts: Array<{ label: string; value: string }>;
  // Extra ids of the module (the Conception's deliverables).
  extraIds: string[];
};

export type PreparedCallResult =
  { ok: true; callId: string } | { ok: false; error: string };
