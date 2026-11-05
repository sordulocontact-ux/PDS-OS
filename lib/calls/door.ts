import { routes } from "@/lib/auth/redirects";

/**
 * The two doors to the same calls (like Travail): the Calls section of the
 * main navigation, where every call opens and the navigation stays on
 * Calls, and a project's Calls page, where its calls open inside the
 * project. Only the route context differs (way back, trail, which
 * navigation is lit); the list and the call's page are the same components.
 */
export type CallDoor =
  { kind: "calls" } | { kind: "project"; projectId: string };

/** Where a call opens from this door. */
export function callHref(door: CallDoor, callId: string): string {
  return door.kind === "project"
    ? routes.projectCall(door.projectId, callId)
    : routes.call(callId);
}

/** The list this door opens on (its tabs and filters added). */
export function callsHref(door: CallDoor): string {
  return door.kind === "project"
    ? routes.projectCalls(door.projectId)
    : routes.calls;
}
