/**
 * French UI copy. Every user-facing string lives here, never inline in
 * components. One file per domain, so parallel work never edits the same file.
 */
import { artistActivity } from "./artist-activity";
import { assistant } from "./assistant";
import { auth } from "./auth";
import { budget } from "./budget";
import { calls } from "./calls";
import { catalog } from "./catalog";
import { catalogFiles } from "./catalog-files";
import { core } from "./core";
import { design } from "./design";
import { feedback } from "./feedback";
import { framing } from "./framing";
import { framingGuide } from "./framing-guide";
import { labo } from "./labo";
import { masterPage } from "./master-page";
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
  framingGuide,
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
  catalogFiles,
  artistActivity,
  masterPage,
  records,
  feedback,
} as const;
