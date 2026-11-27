"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { QuickAction } from "@/lib/shell/quick-actions";

// The forms load when one is opened, never with every page.
const QuickCreateDialogs = dynamic(
  () => import("@/components/shell/quick-create/quick-create-dialogs"),
);

type QuickCreate = {
  // The reader's actions, already filtered by their rights (layout).
  actions: readonly QuickAction[];
  open: (action: QuickAction) => void;
};

const QuickCreateContext = createContext<QuickCreate>({
  actions: [],
  open: () => {},
});

/**
 * The « + » of the shell (27/11/2026): one list of creations, two doors (the
 * « + » menu and the ⌘K's « Créer » group). The forms are mounted here, out
 * of the menu and of the ⌘K, so they outlive the closing of either. The last
 * action stays mounted once closed, so the window's exit animation plays.
 */
export function QuickCreateProvider({
  actions,
  children,
}: {
  actions: readonly QuickAction[];
  children: React.ReactNode;
}) {
  const [current, setCurrent] = useState<QuickAction | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<QuickCreate>(
    () => ({
      actions,
      open: (action) => {
        setCurrent(action);
        setIsOpen(true);
      },
    }),
    [actions],
  );
  // A form that ends on another page (a call, a contact: the server action
  // redirects) must not stay open on it.
  const pathname = usePathname();
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    setIsOpen(false);
  }, [pathname]);
  return (
    <QuickCreateContext.Provider value={value}>
      {children}
      {current !== null && (
        <QuickCreateDialogs
          current={current}
          open={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </QuickCreateContext.Provider>
  );
}

export function useQuickCreate(): QuickCreate {
  return useContext(QuickCreateContext);
}
