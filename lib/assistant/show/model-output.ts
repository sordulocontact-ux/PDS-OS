import "server-only";

import type { JSONValue } from "ai";

import type { Display } from "@/lib/assistant/display";

/**
 * What the model reads back of a chart or a file (toModelOutput of
 * show_chart, export_list, make_pdf): the facts and the display without
 * its heavy parts. The treasury's daily points (up to ~400) and a PDF's
 * text would otherwise go back to the model at every turn of the
 * conversation; the screen still gets the whole output.
 */
function light(display: Display): Display | Record<string, unknown> {
  if (display.kind === "treasury") {
    const { points, ...rest } = display;
    return { ...rest, first: points.at(0), last: points.at(-1) };
  }
  if (display.kind === "file") {
    const { text, ...rest } = display;
    return text ? { ...rest, text: { title: text.title } } : rest;
  }
  return display;
}

export function modelOutput({ output }: { output: unknown }) {
  const value = output as { display?: Display } & Record<string, unknown>;
  const { display, ...rest } = value;
  return {
    type: "json" as const,
    value: (display ? { ...rest, display: light(display) } : rest) as JSONValue,
  };
}
