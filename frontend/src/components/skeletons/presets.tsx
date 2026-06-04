import { TableSkeleton } from "./TableSkeleton";

/** Admin → Departments */
export function AdminDepartmentsTableSkeleton() {
  return (
    <TableSkeleton
      label="Loading departments"
      minWidth="680px"
      columns={["index", "text", "text-wide", "text-narrow", "actions"]}
    />
  );
}

/** Admin → Doctors */
export function AdminDoctorsTableSkeleton() {
  return (
    <TableSkeleton
      label="Loading doctors"
      minWidth="900px"
      columns={["index", "avatar", "text", "text", "text-wide", "badge", "actions"]}
    />
  );
}

/** Admin → Availability */
export function AdminAvailabilityTableSkeleton() {
  return (
    <TableSkeleton
      label="Loading availability"
      minWidth="640px"
      columns={["index", "text-wide", "text", "text", "actions"]}
      rows={5}
    />
  );
}

/** Admin → Appointments */
export function AdminAppointmentsTableSkeleton() {
  return (
    <TableSkeleton
      label="Loading appointments"
      minWidth="920px"
      columns={["index", "mono", "text-wide", "text", "text", "double", "badge", "actions"]}
    />
  );
}

/** Admin → Patients */
export function AdminPatientsTableSkeleton({ withActions }: { withActions?: boolean }) {
  const cols = withActions
    ? (["index", "text", "text-wide", "text", "badge", "double", "mono", "text-narrow", "text-narrow", "actions"] as const)
    : (["index", "text", "text-wide", "text", "badge", "double", "mono", "text-narrow", "text-narrow"] as const);
  return (
    <TableSkeleton
      label="Loading patients"
      minWidth="1000px"
      columns={[...cols]}
    />
  );
}

/** Admin → Staff */
export function AdminStaffTableSkeleton() {
  return (
    <TableSkeleton
      label="Loading staff"
      minWidth="680px"
      columns={["index", "text", "text-wide", "text", "text-narrow", "actions"]}
    />
  );
}

/** Doctor → Today's appointments */
export function DoctorAppointmentsTableSkeleton() {
  return (
    <TableSkeleton
      label="Loading appointments"
      minWidth="720px"
      columns={["index", "mono", "text", "double", "badge", "actions"]}
    />
  );
}
