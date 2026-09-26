"use client";

import { useEffect, useState } from "react";

type Loaded<T> =
  { status: "loading" } | { status: "ready"; data: T } | { status: "error" };

/** Runs `load` once on mount (a server action reading the form's lists). */
export function useLoaded<T>(load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ status: "ready", data }),
      () => live && setState({ status: "error" }),
    );
    return () => {
      live = false;
    };
    // Loaded once per mount: the panel remounts its body for every draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}
