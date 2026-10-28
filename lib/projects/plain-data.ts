// What lib/projects/version-cache.ts may keep of a computed view.

// Whether a signed Storage link (it expires) is anywhere in a view.
export function holdsSignedLink(
  value: unknown,
  seen = new Set<unknown>(),
): boolean {
  if (typeof value === "string") return value.includes("/object/sign/");
  if (value === null || typeof value !== "object" || seen.has(value))
    return false;
  seen.add(value);
  const items =
    value instanceof Map
      ? [...value].flat()
      : value instanceof Set
        ? [...value]
        : value instanceof Date
          ? []
          : Object.values(value);
  return items.some((item) => holdsSignedLink(item, seen));
}

// Plain data only: what structuredClone gives back unchanged.
export function isPlain(value: unknown, seen = new Set<unknown>()): boolean {
  if (value === null || typeof value !== "object")
    return typeof value !== "function" && typeof value !== "symbol";
  if (seen.has(value)) return true;
  seen.add(value);
  if (value instanceof Date) return true;
  if (value instanceof Map)
    return [...value].every(([k, v]) => isPlain(k, seen) && isPlain(v, seen));
  if (value instanceof Set) return [...value].every((v) => isPlain(v, seen));
  if (Array.isArray(value)) return value.every((v) => isPlain(v, seen));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(value).every((v) => isPlain(v, seen));
}
