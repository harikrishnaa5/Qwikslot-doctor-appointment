import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";
import { RequireAuth } from "./components/RequireAuth";
import { RequireAdmin } from "./components/RequireAdmin";
import { RequirePatient } from "./components/RequirePatient";
import { HomePage } from "./pages/HomePage";
import { BrowsePage } from "./pages/BrowsePage";
import { DepartmentDoctorsPage } from "./pages/DepartmentDoctorsPage";
import { DoctorDetailPage } from "./pages/DoctorDetailPage";
import { BookingConfirmPage } from "./pages/BookingConfirmPage";
import { BookingsPage } from "./pages/BookingsPage";
import { TokenLivePage } from "./pages/TokenLivePage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ADMIN_HOME } from "./lib/adminNav";
import { DOCTOR_HOME } from "./lib/doctorNav";
import { RequireDoctor } from "./components/RequireDoctor";
import { DoctorDashboardPage } from "./pages/DoctorDashboardPage";
import { DoctorProfilePage } from "./pages/DoctorProfilePage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<LoginPage variant="admin" />} />
      <Route path="/doctor/login" element={<LoginPage variant="doctor" />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<MainLayout />}>
        <Route element={<RequirePatient />}>
          <Route index element={<HomePage />} />
          <Route path="browse" element={<BrowsePage />} />
          <Route path="departments/:deptSlug/doctors" element={<DepartmentDoctorsPage />} />
          <Route path="doctors" element={<DoctorDetailPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<RequirePatient />}>
            <Route path="booking/confirm" element={<BookingConfirmPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="token" element={<TokenLivePage />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<Navigate to={ADMIN_HOME} replace />} />
            <Route path="admin/:section" element={<AdminDashboardPage />} />
          </Route>
          <Route element={<RequireDoctor />}>
            <Route path="doctor" element={<Navigate to={DOCTOR_HOME} replace />} />
            <Route path="doctor/patients" element={<Navigate to={DOCTOR_HOME} replace />} />
            <Route path="doctor/appointments" element={<DoctorDashboardPage />} />
            <Route path="doctor/profile" element={<DoctorProfilePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
