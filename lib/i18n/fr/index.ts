/**
 * French UI copy. Every user-facing string lives here, never inline in
 * components. One file per domain, so parallel work never edits the same file.
 */
import { artistActivity } from "./artist-activity";
import { artistFiles } from "./artist-files";
import { assistant } from "./assistant";
import { auth } from "./auth";
import { budget } from "./budget";
import { calls } from "./calls";
import { catalog } from "./catalog";
import { core } from "./core";
import { design } from "./design";
import { feedback } from "./feedback";
import { framing } from "./framing";
import { labo } from "./labo";
import { notifications } from "./notifications";
import { projectHistory } from "./project-history";
import { projectPlan } from "./project-plan";
import { projectWork } from "./project-work";
import { records } from "./records";
import { release } from "./release";
import { shell } from "./shell";
import { strategy } from "./strategy";
import { transmission } from "./transmission";
import { voice } from "./voice";
import { work } from "./work";

export const fr = {
  ...core,
  labo,
  auth,
  shell,
  calls,
  catalog,
  framing,
  strategy,
  design,
  release,
  assistant,
  voice,
  transmission,
  notifications,
  work,
  projectWork,
  projectPlan,
  projectHistory,
  budget,
  artistFiles,
  artistActivity,
  records,
  feedback,
} as const;
