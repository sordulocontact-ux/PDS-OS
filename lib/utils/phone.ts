// A phone number as the links that call it want it (« Appeler », « WhatsApp »
// of an artist's contact in the side sheet of « Titres », 27/11/2026).

/** A number for a `tel:` link: digits, and the « + » of an international
 * one. */
export const telHref = (phone: string) =>
  `tel:${phone.replace(/[^0-9+]/g, "")}`;

/** The international number WhatsApp's link wants, without « + »: « 06 12
 * 34 56 78 » is a French number (the team's), « +44… » or « 0044… » kept
 * as written. Null: no digit. */
export function whatsappNumber(phone: string): string | null {
  const international = phone.trim().startsWith("+");
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (international) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10)
    return `33${digits.slice(1)}`;
  return digits;
}

/** « https://wa.me/33612345678 »; null without a digit. */
export function whatsappHref(phone: string): string | null {
  const number = whatsappNumber(phone);
  return number ? `https://wa.me/${number}` : null;
}
