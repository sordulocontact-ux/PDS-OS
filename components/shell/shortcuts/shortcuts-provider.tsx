"use client";

import {
  createContext,
  Suspense,
  use,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_SHORTCUTS,
  type ShortcutMap,
} from "@/lib/shortcuts/definitions";

type ShortcutsValue = {
  shortcuts: ShortcutMap;
  // Paramètres › Raccourcis clavier: the page takes the saved map at once.
  setShortcuts: (shortcuts: ShortcutMap) => void;
};

const ShortcutsContext = createContext<ShortcutsValue>({
  shortcuts: DEFAULT_SHORTCUTS,
  setShortcuts: () => {},
});

/**
 * The reader's keyboard shortcuts (lib/shortcuts/), for every listener and
 * every hint on screen. Read by the layout without holding the page: the
 * defaults answer until the saved ones arrive.
 */
export function ShortcutsProvider({
  saved,
  children,
}: {
  saved: Promise<ShortcutMap> | null;
  children: React.ReactNode;
}) {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  const value = useMemo(() => ({ shortcuts, setShortcuts }), [shortcuts]);
  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      {saved && (
        <Suspense fallback={null}>
          <SavedShortcuts saved={saved} onLoad={setShortcuts} />
        </Suspense>
      )}
    </ShortcutsContext.Provider>
  );
}

function SavedShortcuts({
  saved,
  onLoad,
}: {
  saved: Promise<ShortcutMap>;
  onLoad: (shortcuts: ShortcutMap) => void;
}) {
  const shortcuts = use(saved);
  useEffect(() => onLoad(shortcuts), [shortcuts, onLoad]);
  return null;
}

export function useShortcuts(): ShortcutsValue {
  return useContext(ShortcutsContext);
}
