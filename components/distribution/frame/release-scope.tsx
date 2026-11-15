"use client";

import { createContext, useContext } from "react";

// Projet collectif, lot 15: the release a collective's Distribution page is
// about, for every gesture of the page (null: a simple project's deposit).
const ReleaseContext = createContext<string | null>(null);

export function DistributionReleaseProvider({
  releaseId,
  children,
}: {
  releaseId: string | null;
  children: React.ReactNode;
}) {
  return (
    <ReleaseContext.Provider value={releaseId}>
      {children}
    </ReleaseContext.Provider>
  );
}

/** The release the gestures of this page write to. */
export const useDistributionRelease = () => useContext(ReleaseContext);
