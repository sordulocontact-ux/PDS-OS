// The thread between the team and the engineer (PROJ-AMEL-02,
// docs/ARCHITECTURE.md § 8 septies, « Fil avec l'ingénieur »): a plain
// message, or one of the engineer's three signals. Client-safe; the lists
// mirror master_engineer_messages (SQL).

export const ENGINEER_SIGNALS = ["question", "delay", "missing_file"] as const;
export type EngineerSignal = (typeof ENGINEER_SIGNALS)[number];

export const ENGINEER_MESSAGE_KINDS = ["message", ...ENGINEER_SIGNALS] as const;
export type EngineerMessageKind = (typeof ENGINEER_MESSAGE_KINDS)[number];

export type EngineerMessage = {
  id: string;
  stage: "mix" | "mastering";
  kind: EngineerMessageKind;
  author: "engineer" | "team";
  body: string;
  delayDays: number | null;
  // A signal is open until the team handles it; a message has none.
  status: "open" | "handled" | null;
  createdAt: string;
};
