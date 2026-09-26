// State returned by form actions to useActionState.
// Client-safe: no server dependency.

export type FieldErrors = Record<string, string | undefined>;

// Values to show again after a failed validation, so nothing has to be
// retyped. Never contains a password.
export type FormValues = Record<string, string>;

export type FormState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
      // Hint for the screen: offer to resend the confirmation email.
      hint?: "resend";
    }
  | { status: "success"; message?: string };

export const idleFormState: FormState = { status: "idle" };

// Reads a value to show again. Empty until an error occurred.
export function retained(state: FormState, field: string): string {
  return state.status === "error" ? (state.values?.[field] ?? "") : "";
}
