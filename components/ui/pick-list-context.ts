"use client";

import { createContext, useContext } from "react";

// Closes the place a `PickList` opened in (a fact row, a modal) once a
// choice is saved.
export const PickListDoneContext = createContext<() => void>(() => undefined);

export const usePickListDone = () => useContext(PickListDoneContext);
