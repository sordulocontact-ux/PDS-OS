// The UPC of the release (« Paramètres de distribution »): checked by the
// code, never guessed. 12 digits (UPC-A) or 13 (EAN-13), the last one the
// GS1 check digit of the others. Spaces and dashes typed are ignored. Pure,
// client-safe.

export type UpcError = "digits" | "length" | "check";

/** « 0 602445 790234 » → « 0602445790234 ». */
export const normalizeUpc = (value: string) => value.replace(/[\s-]/g, "");

/** The GS1 check digit of the digits before it (weights 3 and 1 from the right). */
function checkDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  return (10 - (sum % 10)) % 10;
}

/** Why a typed UPC is refused, or null when it is a valid one. */
export function upcError(value: string): UpcError | null {
  const upc = normalizeUpc(value);
  if (!/^\d+$/.test(upc)) return "digits";
  if (upc.length !== 12 && upc.length !== 13) return "length";
  return checkDigit(upc.slice(0, -1)) === Number(upc.at(-1)) ? null : "check";
}
