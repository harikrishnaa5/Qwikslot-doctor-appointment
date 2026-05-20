const SELECTED_DOCTOR_ID_KEY = "selectedDoctorId";

export function setSelectedDoctorId(doctorId: string) {
  localStorage.setItem(SELECTED_DOCTOR_ID_KEY, doctorId);
}

export function getSelectedDoctorId() {
  return localStorage.getItem(SELECTED_DOCTOR_ID_KEY);
}

export function clearSelectedDoctorId() {
  localStorage.removeItem(SELECTED_DOCTOR_ID_KEY);
}
