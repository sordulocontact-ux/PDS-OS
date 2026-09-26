"use client";

import { createContext, useContext } from "react";

// Whether the viewer may write inside this project (framing, calls, release).
// Comfort only: the database refuses anyone but the owner anyway (RLS).
const EditAccess = createContext(false);

export function EditAccessProvider({
  canEdit,
  children,
}: {
  canEdit: boolean;
  children: React.ReactNode;
}) {
  return <EditAccess.Provider value={canEdit}>{children}</EditAccess.Provider>;
}

export function useCanEditProject(): boolean {
  return useContext(EditAccess);
}
