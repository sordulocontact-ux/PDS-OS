"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { routes } from "@/lib/auth/redirects";
import { DOUBLE_SIDEBAR } from "@/lib/ui/project-sections";

type CollapsedNav = {
  collapsed: boolean;
  // True whenever the project's contextual sidebar exists and sits right
  // against the main one (Figma "Double sidebar") — collapsed or expanded,
  // the two always touch inside a project, so the join is one continuous
  // shape, never two separately rounded corners meeting. Never true when the
  // project uses tabs instead (DOUBLE_SIDEBAR off).
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
  // Only the project's own sidebar makes room for itself: with tabs, the main
  // sidebar keeps its width inside a project, as on an artist's page.
  const withProjectSidebar =
    DOUBLE_SIDEBAR && pathname.startsWith(`${routes.projects}/`);
  const [override, setOverride] = useState<boolean | null>(null);
  const hadProjectSidebar = useRef(withProjectSidebar);

  // Collapsed by default inside a project, full width everywhere else. The
  // sidebar toggle button overrides this — no preference is stored, nothing
  // persists — but the override is forgotten when leaving or entering a
  // project, so the automatic behaviour resumes.
  useEffect(() => {
    if (hadProjectSidebar.current !== withProjectSidebar) {
      setOverride(null);
      hadProjectSidebar.current = withProjectSidebar;
    }
  }, [withProjectSidebar]);

  const collapsed = override ?? withProjectSidebar;
  const value: CollapsedNav = {
    collapsed,
    doubleSidebar: withProjectSidebar,
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
