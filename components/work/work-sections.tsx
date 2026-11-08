"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { TabBar } from "@/components/ui/tab-bar";
import { work } from "@/lib/i18n/fr/work";
import { cn } from "@/lib/utils";
import {
  SECTION_PARAM,
  TASKS_SECTION_VALUE,
  WORK_SECTIONS,
  type WorkSection,
} from "@/lib/work/sections";

const fr = { work };

/**
 * The two sections of the Travail: what the projects ask, and « Mes
 * tâches », the person's own to-do list (retour du 31/10/2026). Both are
 * already on the page: a tab shows one at once, without a new request, and
 * the URL keeps it (shared, reloaded) like the tabs of the list below.
 */
export function WorkSections({
  title,
  descriptions,
  action,
  initial,
  actions,
  tasks,
}: {
  title: string;
  descriptions: Record<WorkSection, string>;
  action: React.ReactNode;
  initial: WorkSection;
  actions: React.ReactNode;
  tasks: React.ReactNode;
}) {
  const t = fr.work.tabs;
  const params = useSearchParams();
  const pathname = usePathname();
  const [section, setSection] = useState<WorkSection>(initial);

  const select = (next: WorkSection) => {
    setSection(next);
    const url = new URLSearchParams(params.toString());
    if (next === "tasks") url.set(SECTION_PARAM, TASKS_SECTION_VALUE);
    else url.delete(SECTION_PARAM);
    const text = url.toString();
    window.history.replaceState(
      null,
      "",
      text ? `${pathname}?${text}` : pathname,
    );
  };

  return (
    <>
      <PageHeader
        title={title}
        description={descriptions[section]}
        action={action}
      />
      <TabBar
        label={t.label}
        items={WORK_SECTIONS.map((key) => ({
          label: t[key],
          current: section === key,
          onSelect: () => select(key),
        }))}
      />
      {/* Both kept mounted: their state (search, filters, a task being
          written) survives a switch. */}
      <div
        className={cn("flex flex-col gap-5", section !== "actions" && "hidden")}
      >
        {actions}
      </div>
      <div
        className={cn("flex flex-col gap-5", section !== "tasks" && "hidden")}
      >
        {tasks}
      </div>
    </>
  );
}
