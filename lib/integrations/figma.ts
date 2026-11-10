import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/lib/env";
import { IntegrationError } from "@/lib/integrations/http";
import { IMAGE_USER_AGENT } from "@/lib/integrations/images";

/**
 * Single entry point to Figma (CLAUDE.md, rule 2): reads the moodboards of a
 * Figma file to import them as an artist's moodboards (retour du 10/11/2026,
 * « importer le Figma et qu'on ait le moodboard direct »). REST API, with
 * FIGMA_TOKEN, a personal token never sent to the browser: it reads the files
 * its account can open. https://www.figma.com/developers/api
 *
 * What a link gives:
 *   - a frame (or section, group, component): one moodboard, named after
 *     it, holding each of its visual layers, plus the whole frame first
 *     (« vue d'ensemble », the composition is the board);
 *   - a page, or the file itself (its first page): one moodboard per frame
 *     at the top of the page, each as above — « Piste 1 », « Piste 2 »…;
 *   - a single image layer: one moodboard holding it.
 */

const API = "https://api.figma.com/v1";

// Enough for a page of pistes, never a whole design system.
export const MAX_FIGMA_BOARDS = 12;
export const MAX_FIGMA_IMAGES_PER_BOARD = 40;
// A layer smaller than this is a detail (an icon, a divider), not an image.
const MIN_SIDE = 24;
// The longest side rendered, about: sharp on screen, light to store.
const TARGET_SIDE = 2400;
const SCALES = [2, 1, 0.5, 0.25] as const;

/** A token is set: « Importer depuis Figma » is offered. */
export function figmaReady(): boolean {
  return Boolean(getServerEnv().FIGMA_TOKEN);
}

export type FigmaLink = { fileKey: string; nodeId: string | null };

/**
 * The file and node of a Figma link (design, file, board, proto; a branch
 * reads as its own file), or null when it is not one.
 */
export function parseFigmaLink(value: string): FigmaLink | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "figma.com" && !url.hostname.endsWith(".figma.com"))
    return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (!["design", "file", "board", "proto"].includes(parts[0] ?? ""))
    return null;
  const key = parts[2] === "branch" && parts[3] ? parts[3] : parts[1];
  if (!key || !/^[A-Za-z0-9]{10,64}$/.test(key)) return null;
  const node = url.searchParams.get("node-id");
  const nodeId = node ? node.replace(/-/g, ":") : null;
  if (nodeId !== null && !/^[0-9A-Za-z:;_-]{1,100}$/.test(nodeId)) return null;
  return { fileKey: key, nodeId };
}

/** The link that opens this node in Figma. */
function nodeUrl(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(nodeId.replace(/:/g, "-"))}`;
}

type FigmaNode = {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  fills?: { type: string; visible?: boolean }[];
  absoluteBoundingBox?: { width: number; height: number } | null;
};

const nodeSchema: z.ZodType<FigmaNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    visible: z.boolean().optional(),
    children: z.array(nodeSchema).optional(),
    fills: z
      .array(z.object({ type: z.string(), visible: z.boolean().optional() }))
      .optional()
      .catch(undefined),
    absoluteBoundingBox: z
      .object({ width: z.number(), height: z.number() })
      .nullish()
      .catch(null),
  }),
);

async function call(path: string): Promise<unknown> {
  const token = getServerEnv().FIGMA_TOKEN;
  if (!token) throw new IntegrationError("figma", "not_configured");
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": IMAGE_USER_AGENT,
        "x-figma-token": token,
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new IntegrationError("figma", "unreachable");
  }
  if (response.status === 404) throw new IntegrationError("figma", "not_found");
  if (response.status === 401 || response.status === 403)
    throw new IntegrationError("figma", "forbidden");
  if (response.status === 429)
    throw new IntegrationError("figma", "rate_limited");
  if (!response.ok)
    throw new IntegrationError("figma", `http_${response.status}`);
  return response.json();
}

/** The node the link points to, with two levels below it. */
async function readRoot(link: FigmaLink): Promise<FigmaNode> {
  if (link.nodeId) {
    const raw = await call(
      `/files/${link.fileKey}/nodes?ids=${encodeURIComponent(link.nodeId)}&depth=2`,
    );
    const parsed = z
      .object({
        nodes: z.record(
          z.string(),
          z.object({ document: nodeSchema }).nullable(),
        ),
      })
      .safeParse(raw);
    const document = parsed.success
      ? (parsed.data.nodes[link.nodeId]?.document ?? null)
      : null;
    if (!document) throw new IntegrationError("figma", "not_found");
    return document;
  }
  // No node: the file's first page (depth 3: document → page → frame → layer).
  const raw = await call(`/files/${link.fileKey}?depth=3`);
  const parsed = z.object({ document: nodeSchema }).safeParse(raw);
  const page = parsed.success ? parsed.data.document.children?.[0] : null;
  if (!page) throw new IntegrationError("figma", "not_found");
  return page;
}

const CONTAINERS = new Set([
  "FRAME",
  "SECTION",
  "GROUP",
  "COMPONENT",
  "COMPONENT_SET",
  "INSTANCE",
]);
// Never an image of a moodboard: words and strokes.
const SKIPPED = new Set(["TEXT", "LINE", "SLICE", "STICKY", "CONNECTOR"]);

const shown = (node: FigmaNode) => node.visible !== false;

function bigEnough(node: FigmaNode): boolean {
  const box = node.absoluteBoundingBox;
  return !box || (box.width >= MIN_SIDE && box.height >= MIN_SIDE);
}

/** A layer worth an image: a block, or a shape filled with a picture. */
function isVisual(node: FigmaNode): boolean {
  if (!shown(node) || SKIPPED.has(node.type) || !bigEnough(node)) return false;
  if (CONTAINERS.has(node.type)) return true;
  return (node.fills ?? []).some(
    (fill) => fill.type === "IMAGE" && fill.visible !== false,
  );
}

type Board = { node: FigmaNode; items: FigmaNode[] };

function boardOf(node: FigmaNode): Board {
  const items = (node.children ?? [])
    .filter(isVisual)
    .slice(0, MAX_FIGMA_IMAGES_PER_BOARD - 1);
  // The whole board first when it holds several images; alone otherwise.
  return { node, items: items.length >= 2 ? [node, ...items] : [node] };
}

function boardsOf(root: FigmaNode): Board[] {
  if (root.type === "CANVAS" || root.type === "DOCUMENT") {
    const frames = (root.children ?? []).filter(
      (child) => shown(child) && CONTAINERS.has(child.type),
    );
    return frames.slice(0, MAX_FIGMA_BOARDS).map(boardOf);
  }
  return [boardOf(root)];
}

function scaleOf(node: FigmaNode): number {
  const box = node.absoluteBoundingBox;
  const side = box ? Math.max(box.width, box.height) : TARGET_SIDE / 2;
  return SCALES.find((scale) => side * scale <= TARGET_SIDE) ?? 0.25;
}

/** PNG renders of these nodes (Figma's links, valid a few days). */
async function renderNodes(
  fileKey: string,
  nodes: FigmaNode[],
): Promise<Map<string, string>> {
  const byScale = new Map<number, string[]>();
  for (const node of nodes) {
    const scale = scaleOf(node);
    byScale.set(scale, [...(byScale.get(scale) ?? []), node.id]);
  }
  const urls = new Map<string, string>();
  for (const [scale, ids] of byScale) {
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const raw = await call(
        `/images/${fileKey}?format=png&scale=${scale}&ids=${chunk.map(encodeURIComponent).join(",")}`,
      );
      const parsed = z
        .object({ images: z.record(z.string(), z.string().nullable()) })
        .safeParse(raw);
      if (!parsed.success) continue;
      for (const [id, url] of Object.entries(parsed.data.images))
        if (url && url.startsWith("https://")) urls.set(id, url);
    }
  }
  return urls;
}

export type FigmaBoard = {
  title: string;
  sourceUrl: string;
  images: { name: string; url: string }[];
};

/**
 * The moodboards a Figma link holds, each with its images rendered as PNG
 * (see the header). Throws IntegrationError("figma", reason): not_configured,
 * not_found, forbidden, rate_limited, unreachable, empty.
 */
export async function readFigmaBoards(link: FigmaLink): Promise<FigmaBoard[]> {
  const root = await readRoot(link);
  const boards = boardsOf(root);
  if (boards.length === 0) throw new IntegrationError("figma", "empty");
  const urls = await renderNodes(
    link.fileKey,
    boards.flatMap((board) => board.items),
  );
  const result = boards
    .map((board) => ({
      title: board.node.name.trim() || "Moodboard Figma",
      sourceUrl: nodeUrl(link.fileKey, board.node.id),
      images: board.items.flatMap((item) => {
        const url = urls.get(item.id);
        if (!url) return [];
        const name =
          item === board.node && board.items.length > 1
            ? `${item.name.trim() || "Moodboard"} — vue d'ensemble`
            : item.name.trim() || "Image";
        return [{ name, url }];
      }),
    }))
    .filter((board) => board.images.length > 0);
  if (result.length === 0) throw new IntegrationError("figma", "empty");
  return result;
}
