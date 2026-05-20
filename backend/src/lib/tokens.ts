/** Queue display token for a doctor on a given day (e.g. T-001). */
export function formatTokenDisplay(tokenNumber: number): string {
  return `T-${String(tokenNumber).padStart(3, "0")}`;
}
