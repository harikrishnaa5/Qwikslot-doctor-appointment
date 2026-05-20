export function formatAppointmentToken(doctorId: string, tokenNumber: number) {
  return `${doctorId}--${tokenNumber}`;
}
