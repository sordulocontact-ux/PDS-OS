"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { routes } from "@/lib/auth/redirects";
import { DOUBLE_SIDEBAR } from "@/lib/ui/project-sections";

type CollapsedNav = {
  collapsed: boolean;
  toggle: () => void;
};

const CollapsedNavContext = createContext<CollapsedNav | null>(null);

// Lives above the main Sidebar in app/(app)/layout.tsx, which reads it, so
// the pathname that collapses it inside a project is read in one place.
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
