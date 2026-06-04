/** Default label for the single daily clinic queue. */
export function defaultSessionLabel(): string {
  return "Clinic";
}

/** @deprecated Use defaultSessionLabel(); kept for legacy scripts. */
export function sessionLabelFromStartTime(_startTime: string): string {
  return defaultSessionLabel();
}
