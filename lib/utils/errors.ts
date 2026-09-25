/**
 * Thrown by skeleton functions whose implementation is scheduled for a later step.
 */
export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`Not implemented yet: ${feature}`);
    this.name = "NotImplementedError";
  }
}
