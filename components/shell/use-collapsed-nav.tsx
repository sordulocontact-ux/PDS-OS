"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { routes } from "@/lib/auth/redirects";

type CollapsedNav = {
  collapsed: boolean;
  // True only when the collapsed sidebar actually sits against the
  // project's contextual sidebar (Figma "Double sidebar") — not when
  // collapsed manually outside a project, where there is nothing to merge
  // into: each sidebar keeps its own rounded corners then.
  doubleSidebar: boolean;
  toggle: () => void;
};

const CollapsedNavContext = createContext<CollapsedNav | null>(null);

// Shared by the main Sidebar and the project's ProjectSidebar — both need to
// agree on whether they are fused into one "double sidebar" (Figma), so this
// lives above both in app/(app)/layout.tsx rather than as a plain hook each
// would call independently (that would give each its own, unsynced state).
export function CollapsedNavProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const insideProject = pathname.startsWith(`${routes.projects}/`);
  const [override, setOverride] = useState<boolean | null>(null);
  const previouslyInsideProject = useRef(insideProject);

  // Collapsed by default inside a project, full width everywhere else. The
  // chevron button overrides this — no preference is stored, nothing
  // persists — but the override is forgotten when leaving or entering a
  // project, so the automatic behaviour resumes.
  useEffect(() => {
    if (previouslyInsideProject.current !== insideProject) {
      setOverride(null);
      previouslyInsideProject.current = insideProject;
    }
  }, [insideProject]);

  const collapsed = override ?? insideProject;
  const value: CollapsedNav = {
    collapsed,
    doubleSidebar: collapsed && insideProject,
    toggle: () => setOverride(!collapsed),
  };

  return (
    <CollapsedNavContext.Provider value={value}>
      {children}
    </CollapsedNavContext.Provider>
  );
}

export function useCollapsedNav(): CollapsedNav {
  const value = useContext(CollapsedNavContext);
  if (!value) {
    throw new Error("useCollapsedNav must be used within CollapsedNavProvider");
  }
  return value;
}
