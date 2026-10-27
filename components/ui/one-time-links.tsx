"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { LinksDialog, type OneTimeLink } from "@/components/ui/links-dialog";

export type OneTimeLinks = {
  title: string;
  description: string;
  links: OneTimeLink[];
  copyLabel: string;
  copiedLabel: string;
  closeLabel: string;
  /** Run once the dialog is closed. Not for a `router.refresh()`: the action
   * that made the links already revalidated, so the page was re-rendered. */
  onClose?: () => void;
};

const ShowLinksContext = createContext<((links: OneTimeLinks) => void) | null>(
  null,
);

/**
 * Holds the links shown once (mixer's package, fiches, split confirmations)
 * above every page. The action that creates a link revalidates its page: the
 * button that asked for it may change state or disappear, which used to take
 * the only copy of the link with it (UX test of 09/10/2026). Here the dialog
 * outlives the page's re-render.
 */
export function OneTimeLinksProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Kept after closing, so the dialog does not go blank while it fades out.
  const [current, setCurrent] = useState<OneTimeLinks | null>(null);
  const [open, setOpen] = useState(false);
  const show = useCallback((links: OneTimeLinks) => {
    setCurrent(links);
    setOpen(true);
  }, []);
  const close = () => {
    setOpen(false);
    current?.onClose?.();
  };
  return (
    <ShowLinksContext.Provider value={show}>
      {children}
      <LinksDialog
        open={open}
        onClose={close}
        title={current?.title ?? ""}
        description={current?.description ?? ""}
        links={current?.links ?? []}
        copyLabel={current?.copyLabel ?? ""}
        copiedLabel={current?.copiedLabel ?? ""}
        closeLabel={current?.closeLabel ?? ""}
      />
    </ShowLinksContext.Provider>
  );
}

/** Shows links once, in the dialog that survives the page's refresh. */
export function useShowLinks() {
  const show = useContext(ShowLinksContext);
  if (!show)
    throw new Error("useShowLinks must be used inside OneTimeLinksProvider");
  return show;
}
