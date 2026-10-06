"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/ui/status-badge";
import { TabBar } from "@/components/ui/tab-bar";
import { ToneCallout } from "@/components/ui/tone-callout";
import { fr } from "@/lib/i18n/fr";
import type { Clearance, Clearances } from "@/lib/legal/clearance/types";
import { clearanceTone } from "@/lib/ui/state-tones";

import { DocumentsTab } from "./documents-tab";
import { ExchangesTab } from "./exchanges-tab";
import { HistoryTab } from "./history-tab";
import { HoldersSection } from "./holders-section";
import { ProgressSection } from "./progress-section";
import { QualifyForm } from "./qualify-form";
import { TermsSection } from "./terms-section";

const TABS = ["overview", "exchanges", "documents", "history"] as const;
type Tab = (typeof TABS)[number];

/**
 * The drawer of a clearance (the ticket's « drawer validé »): Vue
 * d'ensemble (state, next action, usage, rights holders, conditions, the
 * step), Échanges, Documents, Historique.
 */
export function ClearanceDrawer({
  projectId,
  clearance,
  context,
}: {
  projectId: string;
  clearance: Clearance;
  context: Omit<Clearances, "items">;
}) {
  const t = fr.legalClearance;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <>
      <Button size="xs" variant="outline" onClick={() => setOpen(true)}>
        {t.page.open}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="gap-2 px-5 pt-5 pr-14">
            <SheetTitle>« {clearance.work} »</SheetTitle>
            <SheetDescription>
              {[
                fr.legal.intake.facts.elements[
                  clearance.element as keyof typeof fr.legal.intake.facts.elements
                ],
                clearance.author,
                clearance.title,
              ]
                .filter(Boolean)
                .join(" · ")}
            </SheetDescription>
            <StatusBadge
              tone={clearanceTone[clearance.status]}
              className="self-start"
            >
              {t.statuses[clearance.status]}
            </StatusBadge>
          </SheetHeader>
          <div className="px-5 pt-4">
            <TabBar
              label={clearance.work}
              items={TABS.map((key) => ({
                label: t.drawer.tabs[key],
                current: tab === key,
                onSelect: () => setTab(key),
              }))}
            />
          </div>
          <div className="flex flex-col gap-6 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {tab === "overview" && (
              <>
                <ToneCallout tone="neutral">
                  <span className="font-medium">{t.drawer.next}</span> —{" "}
                  {t.next[clearance.status]}
                </ToneCallout>
                <QualifyForm
                  projectId={projectId}
                  clearance={clearance}
                  people={context.people}
                />
                <HoldersSection projectId={projectId} clearance={clearance} />
                <TermsSection
                  projectId={projectId}
                  clearance={clearance}
                  canValidate={context.canValidate}
                />
                <ProgressSection projectId={projectId} clearance={clearance} />
              </>
            )}
            {tab === "exchanges" && (
              <ExchangesTab projectId={projectId} clearance={clearance} />
            )}
            {tab === "documents" && (
              <DocumentsTab
                projectId={projectId}
                clearance={clearance}
                projectContracts={context.projectContracts}
              />
            )}
            {tab === "history" && <HistoryTab clearance={clearance} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
