/**
 * French UI copy. Every user-facing string lives here, never inline in
 * components. One file per domain, so parallel work never edits the same file.
 */
import { assistant } from "./assistant";
import { auth } from "./auth";
import { calls } from "./calls";
import { core } from "./core";
import { framing } from "./framing";
import { labo } from "./labo";
import { release } from "./release";
import { shell } from "./shell";
import { voice } from "./voice";

export const fr = {
  ...core,
  labo,
  auth,
  shell,
  calls,
  framing,
  release,
  assistant,
  voice,
} as const;
