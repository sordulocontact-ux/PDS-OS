/**
 * French UI copy. Every user-facing string lives here, never inline in
 * components. One file per domain, so parallel work never edits the same file.
 */
import { errors } from "./errors";
import { aiUsage } from "./ai-usage";
import { activations } from "./activations";
import { activationWork } from "./activation-work";
import { activationBrief } from "./activation-brief";
import { activationInfluence } from "./activation-influence";
import { activationPress } from "./activation-press";
import { activationAgency } from "./activation-agency";
import { activationJourney } from "./activation-journey";
import { activationCreator } from "./activation-creator";
import { dialogs } from "./dialogs";
import { decisions } from "./decisions";
import { artistActivity } from "./artist-activity";
import { assistant } from "./assistant";
import { assistantRecords } from "./assistant-records";
import { auth } from "./auth";
import { briefRequests } from "./brief-requests";
import { budget } from "./budget";
import { calls } from "./calls";
import { callPrep } from "./call-prep";
import { meeting } from "./meeting";
import { catalog } from "./catalog";
import { catalogFiles } from "./catalog-files";
import { contracts } from "./contracts";
import { core } from "./core";
import { artistIdentity } from "./artist-identity";
import { conception } from "./conception";
import { conceptionCall } from "./conception-call";
import { conceptionJourney } from "./conception-journey";
import { conceptionKinds } from "./conception-kinds";
import { conceptionClosure } from "./conception-closure";
import { conceptionRequests } from "./conception-requests";
import { conceptionRoles } from "./conception-roles";
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
import { journey } from "./journey";
import { moduleFrame } from "./module-frame";
import { labo } from "./labo";
import { laboCaptures } from "./labo-captures";
import { legal } from "./legal";
import { legalClearance } from "./legal-clearance";
import { legalContracts } from "./legal-contracts";
import { legalDemarches } from "./legal-demarches";
import { legalDocuments } from "./legal-documents";
import { legalFormalities } from "./legal-formalities";
import { legalForms } from "./legal-forms";
import { legalHistory } from "./legal-history";
import { legalInvoices } from "./legal-invoices";
import { legalJourney } from "./legal-journey";
import { framingJourney } from "./framing-journey";
import { designJourney } from "./design-journey";
import { designSteps } from "./design-steps";
import { legalReadiness } from "./legal-readiness";
import { legalSplits } from "./legal-splits";
import { library } from "./library";
import { masterBrief } from "./master-brief";
import { masterFinal } from "./master-final";
import { masterInvoice } from "./master-invoice";
import { masterListen } from "./master-listen";
import { masterDelay } from "./master-delay";
import { masterAnswer } from "./master-answer";
import { masterInHouse } from "./master-inhouse";
import { masterJourney } from "./master-journey";
import { reviewJourney } from "./review-journey";
import { masterPage } from "./master-page";
import { masterRound } from "./master-round";
import { masterSource } from "./master-source";
import { masterWorkflow } from "./master-workflow";
import { network } from "./network";
import { notifications } from "./notifications";
import { projectHistory } from "./project-history";
import { planSteps } from "./plan-steps";
import { poQuestion } from "./po-question";
import { projectPlan } from "./project-plan";
import { projectWork } from "./project-work";
import { records } from "./records";
import { production, projectReview } from "./production";
import { projectShell } from "./project-shell";
import { productionBrief } from "./production-brief";
import { productionCall } from "./production-call";
import { productionClosure } from "./production-closure";
import { productionCorrections } from "./production-corrections";
import { productionCallSheetPage } from "./production-call-sheet-page";
import { productionDelivery } from "./production-delivery";
import { productionDirection } from "./production-direction";
import { productionJourney } from "./production-journey";
import { productionLink } from "./production-link";
import { portal } from "./portal";
import { contactLinks } from "./contact-links";
import { roles } from "./roles";
import { stepTools } from "./step-tools";
import { productionLocations } from "./production-locations";
import { productionOrganization } from "./production-organization";
import { productionChecklist } from "./production-checklist";
import { productionDirector } from "./production-director";
import { productionPlace } from "./production-place";
import { productionProducer } from "./production-producer";
import { productionReady } from "./production-ready";
import { productionShootExternal } from "./production-shoot-external";
import { productionHistory } from "./production-history";
import { productionProvider } from "./production-provider";
import { productionNext } from "./production-next";
import { productionImport } from "./production-import";
import { productionNeeds } from "./production-needs";
import { productionPost } from "./production-post";
import { productionPrep } from "./production-prep";
import { productionQuotes } from "./production-quotes";
import { productionPreprod } from "./production-preprod";
import { productionShoot } from "./production-shoot";
import { release } from "./release";
import { distribution } from "./distribution";
import { distributionJourney } from "./distribution-journey";
import { projectDates } from "./project-dates";
import { marketing } from "./marketing";
import { marketingReview } from "./marketing-review";
import { shell } from "./shell";
import { strategy } from "./strategy";
import { strategyBrief } from "./strategy-brief";
import { strategyBriefOut } from "./strategy-brief-out";
import { strategyBudget } from "./strategy-budget";
import { strategyCalendar } from "./strategy-calendar";
import { strategyDeliverables } from "./strategy-deliverables";
import { strategyDocuments } from "./strategy-documents";
import { strategyDispositif } from "./strategy-dispositif";
import { strategyDimensions } from "./strategy-dimensions";
import { strategyDraft } from "./strategy-draft";
import { strategyEntry } from "./strategy-entry";
import { strategyFollowUp } from "./strategy-follow-up";
import { strategyJourney } from "./strategy-journey";
import { strategyKpis } from "./strategy-kpis";
import { strategyPilot } from "./strategy-pilot";
import { strategyPressKit } from "./strategy-press-kit";
import { strategyReleasePlan } from "./strategy-release-plan";
import { transmission } from "./transmission";
import { voice } from "./voice";
import { work } from "./work";
import { workflowStatus } from "./workflow-status";

export const fr = {
  decisions,
  aiUsage,
  ...core,
  errors,
  labo,
  laboCaptures,
  auth,
  shell,
  calls,
  callPrep,
  meeting,
  catalog,
  framing,
  framingGuide,
  framingIntel,
  briefRequests,
  planSteps,
  poQuestion,
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
  strategyDraft,
  strategyDimensions,
  strategyBriefOut,
  strategyJourney,
  design,
  artistIdentity,
  conception,
  conceptionCall,
  conceptionJourney,
  conceptionKinds,
  conceptionClosure,
  conceptionRequests,
  conceptionRoles,
  conceptionWork,
  conceptionIntents,
  conceptionRefs,
  conceptionDirection,
  conceptionSheet,
  production,
  productionPrep,
  productionQuotes,
  productionBrief,
  productionNeeds,
  productionCall,
  productionImport,
  productionPreprod,
  productionShoot,
  productionPost,
  productionDelivery,
  productionDirection,
  productionNext,
  productionClosure,
  productionCorrections,
  productionProvider,
  productionHistory,
  productionJourney,
  journey,
  moduleFrame,
  productionLink,
  productionLocations,
  productionOrganization,
  productionChecklist,
  productionDirector,
  productionPlace,
  productionProducer,
  productionReady,
  productionShootExternal,
  productionCallSheetPage,
  marketing,
  marketingReview,
  projectReview,
  release,
  distribution,
  distributionJourney,
  projectDates,
  assistant,
  assistantRecords,
  voice,
  transmission,
  notifications,
  work,
  projectWork,
  projectPlan,
  projectHistory,
  projectShell,
  budget,
  catalogFiles,
  library,
  network,
  contracts,
  facts,
  legal,
  legalClearance,
  legalContracts,
  legalDemarches,
  legalDocuments,
  legalFormalities,
  legalForms,
  legalHistory,
  legalInvoices,
  legalJourney,
  framingJourney,
  designJourney,
  designSteps,
  legalReadiness,
  legalSplits,
  masterWorkflow,
  masterJourney,
  reviewJourney,
  masterBrief,
  masterRound,
  masterFinal,
  masterInvoice,
  masterListen,
  masterDelay,
  masterAnswer,
  masterInHouse,
  masterSource,
  artistActivity,
  masterPage,
  records,
  feedback,
  workflowStatus,
  activations,
  activationWork,
  activationInfluence,
  activationBrief,
  activationPress,
  activationAgency,
  activationJourney,
  activationCreator,
  dialogs,
  stepTools,
  roles,
  portal,
  contactLinks,
} as const;
