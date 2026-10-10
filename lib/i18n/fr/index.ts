/**
 * French UI copy. Every user-facing string lives here, never inline in
 * components. One file per domain, so parallel work never edits the same file.
 */
import { errors } from "./errors";
import { artistActivity } from "./artist-activity";
import { assistant } from "./assistant";
import { assistantRecords } from "./assistant-records";
import { auth } from "./auth";
import { budget } from "./budget";
import { calls } from "./calls";
import { catalog } from "./catalog";
import { catalogFiles } from "./catalog-files";
import { contracts } from "./contracts";
import { core } from "./core";
import { conception } from "./conception";
import { conceptionCall } from "./conception-call";
import { conceptionWork } from "./conception-work";
import { conceptionDirection } from "./conception-direction";
import { conceptionIntents } from "./conception-intents";
import { conceptionRefs } from "./conception-refs";
import { conceptionSheet } from "./conception-sheet";
import { design } from "./design";
import { facts } from "./facts";
import { feedback } from "./feedback";
import { framing } from "./framing";
import { framingGuide } from "./framing-guide";
import { framingIntel } from "./framing-intel";
import { labo } from "./labo";
import { laboCaptures } from "./labo-captures";
import { legal } from "./legal";
import { legalClearance } from "./legal-clearance";
import { legalContracts } from "./legal-contracts";
import { legalFormalities } from "./legal-formalities";
import { legalForms } from "./legal-forms";
import { legalSplits } from "./legal-splits";
import { library } from "./library";
import { masterPage } from "./master-page";
import { masterWorkflow } from "./master-workflow";
import { network } from "./network";
import { notifications } from "./notifications";
import { projectHistory } from "./project-history";
import { projectPlan } from "./project-plan";
import { projectWork } from "./project-work";
import { records } from "./records";
import { production, projectReview } from "./production";
import { productionBrief } from "./production-brief";
import { productionCall } from "./production-call";
import { productionDelivery } from "./production-delivery";
import { productionImport } from "./production-import";
import { productionNeeds } from "./production-needs";
import { productionPost } from "./production-post";
import { productionPrep } from "./production-prep";
import { productionPreprod } from "./production-preprod";
import { productionShoot } from "./production-shoot";
import { release } from "./release";
import { releaseDelivery } from "./release-delivery";
import { shell } from "./shell";
import { strategy } from "./strategy";
import { strategyBrief } from "./strategy-brief";
import { strategyBudget } from "./strategy-budget";
import { strategyCalendar } from "./strategy-calendar";
import { strategyDeliverables } from "./strategy-deliverables";
import { strategyDocuments } from "./strategy-documents";
import { strategyDispositif } from "./strategy-dispositif";
import { strategyEntry } from "./strategy-entry";
import { strategyFollowUp } from "./strategy-follow-up";
import { strategyKpis } from "./strategy-kpis";
import { strategyPilot } from "./strategy-pilot";
import { strategyPressKit } from "./strategy-press-kit";
import { strategyReleasePlan } from "./strategy-release-plan";
import { transmission } from "./transmission";
import { voice } from "./voice";
import { work } from "./work";
import { workflowStatus } from "./workflow-status";

export const fr = {
  ...core,
  errors,
  labo,
  laboCaptures,
  auth,
  shell,
  calls,
  catalog,
  framing,
  framingGuide,
  framingIntel,
  strategy,
  strategyEntry,
  strategyDispositif,
  strategyDeliverables,
  strategyCalendar,
  strategyBudget,
  strategyKpis,
  strategyBrief,
  strategyDocuments,
  strategyReleasePlan,
  strategyPressKit,
  strategyFollowUp,
  strategyPilot,
  design,
  conception,
  conceptionCall,
  conceptionWork,
  conceptionIntents,
  conceptionRefs,
  conceptionDirection,
  conceptionSheet,
  production,
  productionPrep,
  productionBrief,
  productionNeeds,
  productionCall,
  productionImport,
  productionPreprod,
  productionShoot,
  productionPost,
  productionDelivery,
  projectReview,
  release,
  releaseDelivery,
  assistant,
  assistantRecords,
  voice,
  transmission,
  notifications,
  work,
  projectWork,
  projectPlan,
  projectHistory,
  budget,
  catalogFiles,
  library,
  network,
  contracts,
  facts,
  legal,
  legalClearance,
  legalContracts,
  legalFormalities,
  legalForms,
  legalSplits,
  masterWorkflow,
  artistActivity,
  masterPage,
  records,
  feedback,
  workflowStatus,
} as const;
