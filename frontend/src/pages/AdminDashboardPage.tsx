import clsx from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { toast } from "../lib/toast";
import {
  adminCreateDepartment,
  adminCreateDoctor,
  adminDeleteDepartment,
  adminDeleteDoctor,
  adminListAppointments,
  adminListDepartments,
  adminListDoctors,
  adminListDoctorAvailabilities,
  adminPatchAvailability,
  adminDeleteAvailability,
  adminUploadDoctorPhoto,
  adminListRegisteredUsers,
  adminPatchAppointmentStatus,
  adminSetAvailability,
  adminUpdateDepartment,
  adminUpdateDoctor,
  superCreateUser,
  superDeleteUser,
  superListAdmins,
  superPatchUser,
  type AdminAvailabilityRow,
  type AdminDepartment,
  type AdminDoctor,
  type AdminPatientFilter,
} from "../api/admin";
import {
  defaultAvailabilityStartEnd,
  ensureEndAfterStart,
  formatHm12Hour,
  localTodayStr,
  localTomorrowStr,
  localYesterdayStr,
  parseLocalDateTime,
} from "../lib/dates";
import {
  ActivateButton,
  Button,
  Card,
  ConfirmModal,
  CreateButton,
  DeactivateButton,
  DeleteButton,
  EditButton,
  ModalBackdrop,
  ModalOverlay,
  ModalPanel,
  PageHeader,
  TablePagination,
} from "../components/ui";
import {
  AdminAppointmentsTableSkeleton,
  AdminAvailabilityTableSkeleton,
  AdminDepartmentsTableSkeleton,
  AdminDoctorsTableSkeleton,
  AdminPatientsTableSkeleton,
  AdminStaffTableSkeleton,
  DateFilterCardSkeleton,
} from "../components/skeletons";
import { DoctorAvatar } from "../components/DoctorAvatar";
import { useAppSelector } from "../store/hooks";
import { CalendarDatePicker, ClockTimePicker } from "../components/date-time";
import { DropdownSelect } from "../components/DropdownSelect";
import { adminListSessions, adminSessionNext, fetchDoctorQueue } from "../api/queue";
import { formatAppointmentStatus, formatPatientDisplayStatus } from "../lib/appointmentStatus";
import { formatLocaleDateTime } from "../lib/dates";
import {
  ADMIN_NAV_META,
  adminPath,
  getAllowedAdminTabs,
  tabFromSection,
  type AdminTab,
} from "../lib/adminNav";

const MAX_PHOTO_FILE_BYTES = 5 * 1024 * 1024;
const TABLE_PAGE_SIZE = 15;
/** Must match backend `paginationQuerySchema` max (100). */
const OPTIONS_PAGE_SIZE = 100;

type Tab = AdminTab;
type StaffModalState = { mode: "create" } | { mode: "edit"; user: { id: string; name: string; email: string; role: string } };
type DeptModalState = { mode: "create" } | { mode: "edit" };
type DocModalState = { mode: "create" } | { mode: "edit"; doctor: AdminDoctor };

async function uploadPhotoFile(file: File): Promise<string> {
  if (file.size > MAX_PHOTO_FILE_BYTES) {
    throw new Error(`Photo must be under ${MAX_PHOTO_FILE_BYTES / (1024 * 1024)} MB. Use a link instead.`);
  }
  const { imageUrl } = await adminUploadDoctorPhoto(file);
  return imageUrl;
}

export function AdminDashboardPage() {
  const role = useAppSelector((s) => s.auth.user?.role);
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const allowedTabs = getAllowedAdminTabs(role);
  const resolvedTab = tabFromSection(section);
  const tab: Tab =
    resolvedTab && allowedTabs.includes(resolvedTab) ? resolvedTab : (allowedTabs[0] ?? "dept");
  const qc = useQueryClient();

  useEffect(() => {
    if (!section || !resolvedTab || !allowedTabs.includes(resolvedTab)) {
      navigate(adminPath(tab), { replace: true });
    }
  }, [section, resolvedTab, allowedTabs, tab, navigate]);

  const [docModal, setDocModal] = useState<DocModalState | null>(null);

  const [deptPage, setDeptPage] = useState(1);
  const deptTableQ = useQuery({
    queryKey: ["admin-departments", "table", deptPage],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(deptPage), pageSize: String(TABLE_PAGE_SIZE) });
      return adminListDepartments(p);
    },
    enabled: tab === "dept",
  });
  const deptOptionsQ = useQuery({
    queryKey: ["admin-departments", "options"],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", pageSize: String(OPTIONS_PAGE_SIZE) });
      return (await adminListDepartments(p)).departments;
    },
    enabled: tab === "docs" || tab === "avail" || tab === "conhist" || docModal !== null,
    staleTime: 60_000,
  });

  const [docPage, setDocPage] = useState(1);
  const docTableQ = useQuery({
    queryKey: ["admin-doctors", "table", docPage],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(docPage), pageSize: String(TABLE_PAGE_SIZE) });
      return adminListDoctors(p);
    },
    enabled: tab === "docs",
  });
  const docOptionsQ = useQuery({
    queryKey: ["admin-doctors", "options"],
    queryFn: async () => {
      const p = new URLSearchParams({ page: "1", pageSize: String(OPTIONS_PAGE_SIZE) });
      return (await adminListDoctors(p)).doctors;
    },
    enabled: tab === "avail" || tab === "conhist" || tab === "queue",
  });

  const [apptDate, setApptDate] = useState<string | null>(null);
  const [apptPage, setApptPage] = useState(1);
  const apptQ = useQuery({
    queryKey: ["admin-appointments", apptDate, apptPage],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(apptPage), pageSize: String(TABLE_PAGE_SIZE) });
      if (apptDate) params.set("date", apptDate);
      return adminListAppointments(params);
    },
    enabled: tab === "appt",
  });

  useEffect(() => {
    setApptPage(1);
  }, [apptDate]);

  const [patientDate, setPatientDate] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState<AdminPatientFilter>("all");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientSearchDebounced, setPatientSearchDebounced] = useState("");
  const [patientPage, setPatientPage] = useState(1);
  const patientsQ = useQuery({
    queryKey: ["admin-patients", patientDate, patientFilter, patientSearchDebounced, patientPage],
    queryFn: async () => {
      const p = new URLSearchParams({
        page: String(patientPage),
        pageSize: "15",
        filter: patientFilter,
      });
      if (patientDate) p.set("date", patientDate);
      if (patientSearchDebounced) p.set("search", patientSearchDebounced);
      return adminListRegisteredUsers(p);
    },
    enabled: tab === "patients" && (role === "ADMIN" || role === "SUPER_ADMIN"),
  });

  useEffect(() => {
    const t = window.setTimeout(() => setPatientSearchDebounced(patientSearch.trim()), 300);
    return () => window.clearTimeout(t);
  }, [patientSearch]);

  useEffect(() => {
    setPatientPage(1);
  }, [patientDate, patientFilter, patientSearchDebounced]);

  const [staffPage, setStaffPage] = useState(1);
  const staffQ = useQuery({
    queryKey: ["admin-staff", staffPage],
    queryFn: async () => {
      const p = new URLSearchParams({ page: String(staffPage), pageSize: "15" });
      return superListAdmins(p);
    },
    enabled: tab === "staff" && role === "SUPER_ADMIN",
  });

  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [editingDept, setEditingDept] = useState<AdminDepartment | null>(null);
  const [deptModal, setDeptModal] = useState<DeptModalState | null>(null);

  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPassword, setDocPassword] = useState("");
  const [docDeptId, setDocDeptId] = useState("");
  const [docExperience, setDocExperience] = useState("");
  const [docQualification, setDocQualification] = useState("");
  const [docSpecialization, setDocSpecialization] = useState("");
  const [docImageUrl, setDocImageUrl] = useState("");
  const [editingDoc, setEditingDoc] = useState<AdminDoctor | null>(null);

  const [availDocId, setAvailDocId] = useState("");
  const [conhistDocId, setConhistDocId] = useState("");
  const [availModalOpen, setAvailModalOpen] = useState(false);
  const [availEditingId, setAvailEditingId] = useState<string | null>(null);
  const [modalAvailDocId, setModalAvailDocId] = useState("");
  const [availDeleteTarget, setAvailDeleteTarget] = useState<AdminAvailabilityRow | null>(null);

  const [availFilterDate, setAvailFilterDate] = useState<string | null>(null);
  const [availPage, setAvailPage] = useState(1);
  const availListQ = useQuery({
    queryKey: ["admin-availabilities", "future", availDocId, availFilterDate, availPage],
    queryFn: async () => {
      const p = new URLSearchParams({
        page: String(availPage),
        pageSize: String(TABLE_PAGE_SIZE),
        range: "future",
      });
      if (availFilterDate) p.set("date", availFilterDate);
      return adminListDoctorAvailabilities(availDocId, p);
    },
    enabled: tab === "avail" && Boolean(availDocId),
    gcTime: 0,
  });

  const [conhistFilterDate, setConhistFilterDate] = useState<string | null>(null);
  const [conhistPage, setConhistPage] = useState(1);
  const conhistListQ = useQuery({
    queryKey: ["admin-availabilities", "past", conhistDocId, conhistFilterDate, conhistPage],
    queryFn: async () => {
      const p = new URLSearchParams({
        page: String(conhistPage),
        pageSize: String(TABLE_PAGE_SIZE),
        range: "past",
      });
      if (conhistFilterDate) p.set("date", conhistFilterDate);
      return adminListDoctorAvailabilities(conhistDocId, p);
    },
    enabled: tab === "conhist" && Boolean(conhistDocId),
    gcTime: 0,
  });

  const prevAvailConhistTabRef = useRef<Tab | null>(null);
  useEffect(() => {
    const prev = prevAvailConhistTabRef.current;
    prevAvailConhistTabRef.current = tab;
    const switchedAvailConhist =
      (prev === "avail" && tab === "conhist") || (prev === "conhist" && tab === "avail");
    if (!switchedAvailConhist) return;

    setAvailDocId("");
    setConhistDocId("");
    setAvailFilterDate(null);
    setConhistFilterDate(null);
    setAvailPage(1);
    setConhistPage(1);
    qc.removeQueries({ queryKey: ["admin-availabilities", "future"] });
    qc.removeQueries({ queryKey: ["admin-availabilities", "past"] });
  }, [tab, qc]);

  useEffect(() => {
    setAvailPage(1);
  }, [availDocId, availFilterDate]);

  useEffect(() => {
    setConhistPage(1);
  }, [conhistDocId, conhistFilterDate]);

  const [availDate, setAvailDate] = useState<string | null>(localTomorrowStr());
  const defaultAvailTimesSeed = useMemo(() => defaultAvailabilityStartEnd(), []);
  const [startT, setStartT] = useState(defaultAvailTimesSeed.start);
  const [endT, setEndT] = useState(defaultAvailTimesSeed.end);
  const [queueDoctor, setQueueDoctor] = useState("");
  const [queueDate, setQueueDate] = useState<string | null>(localTodayStr());
  const [queueSession, setQueueSession] = useState("");

  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<"ADMIN" | "USER">("ADMIN");
  const [staffModal, setStaffModal] = useState<StaffModalState | null>(null);
  const [staffDeleteTarget, setStaffDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [patientEditTarget, setPatientEditTarget] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null>(null);
  const [patientEditName, setPatientEditName] = useState("");
  const [patientEditPhone, setPatientEditPhone] = useState("");
  const [patientDeleteTarget, setPatientDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [apptActionOpenId, setApptActionOpenId] = useState<string | null>(null);
  const [apptActionMenuPos, setApptActionMenuPos] = useState<{ top: number; left: number } | null>(null);
  const APPT_MENU_WIDTH = 144;
  const APPT_MENU_HEIGHT = 138;
  const APPT_MENU_GAP = 8;

  const [confirmDialog, setConfirmDialog] = useState<
    | null
    | { kind: "deactivate"; doctor: AdminDoctor }
    | { kind: "activate"; doctor: AdminDoctor }
    | { kind: "delete-dept"; dept: AdminDepartment }
  >(null);

  useEffect(() => {
    if (editingDoc) {
      setDocName(editingDoc.name);
      setDocEmail(editingDoc.email ?? "");
      setDocPassword("");
      setDocDeptId(editingDoc.departmentId);
      setDocExperience(editingDoc.experience ?? "");
      setDocQualification(editingDoc.qualification ?? "");
      setDocSpecialization(editingDoc.specialization ?? "");
      setDocImageUrl(editingDoc.imageUrl ?? "");
    } else if (!editingDoc && tab === "docs") {
      setDocName("");
      setDocEmail("");
      setDocPassword("");
      setDocDeptId("");
      setDocExperience("");
      setDocQualification("");
      setDocSpecialization("");
      setDocImageUrl("");
    }
  }, [editingDoc, tab]);

  useEffect(() => {
    if (!availDate) return;
    setEndT((prev) => ensureEndAfterStart(availDate, startT, prev));
  }, [availDate, startT]);

  useEffect(() => {
    if (!apptActionOpenId) return;
    const close = () => {
      setApptActionOpenId(null);
      setApptActionMenuPos(null);
    };
    const onDocClick = () => close();
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [apptActionOpenId]);

  const getApptMenuPos = (rect: DOMRect) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minX = 8;
    const minY = 8;
    const maxX = Math.max(minX, vw - APPT_MENU_WIDTH - 8);
    const maxY = Math.max(minY, vh - APPT_MENU_HEIGHT - 8);

    const preferredLeft = rect.right - APPT_MENU_WIDTH;
    const left = Math.min(maxX, Math.max(minX, preferredLeft));

    const canOpenAbove = rect.top >= APPT_MENU_HEIGHT + APPT_MENU_GAP + minY;
    const canOpenBelow = vh - rect.bottom >= APPT_MENU_HEIGHT + APPT_MENU_GAP + minY;
    let top: number;
    if (canOpenAbove) {
      top = rect.top - APPT_MENU_HEIGHT - APPT_MENU_GAP;
    } else if (canOpenBelow) {
      top = rect.bottom + APPT_MENU_GAP;
    } else {
      top = Math.min(maxY, Math.max(minY, rect.bottom + APPT_MENU_GAP));
    }

    return { top, left };
  };

  const resetStaffForm = () => {
    setStaffEmail("");
    setStaffPassword("");
    setStaffName("");
    setStaffRole("ADMIN");
  };

  const createDept = useMutation({
    mutationFn: () => adminCreateDepartment({ name: newDeptName, description: newDeptDesc || undefined }),
    onSuccess: () => {
      toast.success("Department created");
      setNewDeptName("");
      setNewDeptDesc("");
      setDeptModal(null);
      qc.invalidateQueries({ queryKey: ["admin-departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDept = useMutation({
    mutationFn: (p: { id: string; name: string; description: string }) =>
      adminUpdateDepartment(p.id, { name: p.name, description: p.description || undefined }),
    onSuccess: () => {
      toast.success("Department updated");
      setEditingDept(null);
      setDeptModal(null);
      qc.invalidateQueries({ queryKey: ["admin-departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteDept = useMutation({
    mutationFn: (id: string) => adminDeleteDepartment(id),
    onSuccess: () => {
      toast.success("Department removed");
      qc.invalidateQueries({ queryKey: ["admin-departments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDoc = useMutation({
    mutationFn: async (vars: { isEdit: boolean }) => {
      const base = {
        departmentId: docDeptId,
        name: docName,
        specialization: docSpecialization || undefined,
        experience: docExperience || undefined,
        qualification: docQualification || undefined,
      };
      if (vars.isEdit && editingDoc) {
        const patch: Parameters<typeof adminUpdateDoctor>[1] = {
          ...base,
          imageUrl: docImageUrl.trim() ? docImageUrl : "",
        };
        const email = docEmail.trim();
        if (email) patch.email = email;
        if (docPassword.trim()) patch.password = docPassword;
        return adminUpdateDoctor(editingDoc.id, patch);
      }
      return adminCreateDoctor({
        ...base,
        email: docEmail.trim(),
        password: docPassword,
        imageUrl: docImageUrl.trim() || undefined,
      });
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.isEdit ? "Doctor updated" : "Doctor added");
      setDocModal(null);
      if (vars.isEdit) {
        setEditingDoc(null);
      } else {
        setDocName("");
        setDocEmail("");
        setDocPassword("");
        setDocDeptId("");
        setDocExperience("");
        setDocQualification("");
        setDocSpecialization("");
        setDocImageUrl("");
      }
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
      qc.invalidateQueries({ queryKey: ["doctor"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivateDoc = useMutation({
    mutationFn: (id: string) => adminDeleteDoctor(id),
    onSuccess: () => {
      toast.success("Doctor deactivated (hidden from booking)");
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
      qc.invalidateQueries({ queryKey: ["doctor"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateDoc = useMutation({
    mutationFn: (id: string) => adminUpdateDoctor(id, { active: true }),
    onSuccess: () => {
      toast.success("Doctor activated (visible for booking again)");
      qc.invalidateQueries({ queryKey: ["admin-doctors"] });
      qc.invalidateQueries({ queryKey: ["doctors"] });
      qc.invalidateQueries({ queryKey: ["doctor"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setAvail = useMutation({
    mutationFn: (vars: { doctorId: string; date: string; startTime: string; endTime: string }) =>
      adminSetAvailability({
        doctorId: vars.doctorId,
        date: vars.date,
        startTime: vars.startTime,
        endTime: vars.endTime,
      }),
    onSuccess: (_data, vars) => {
      toast.success("Availability saved");
      setAvailDocId(vars.doctorId);
      qc.invalidateQueries({ queryKey: ["admin-availabilities", "future", vars.doctorId] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      setAvailModalOpen(false);
      setAvailEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchAvail = useMutation({
    mutationFn: (vars: { id: string; startTime: string; endTime: string }) =>
      adminPatchAvailability(vars.id, {
        startTime: vars.startTime,
        endTime: vars.endTime,
      }),
    onSuccess: () => {
      toast.success("Availability updated");
      if (availDocId) qc.invalidateQueries({ queryKey: ["admin-availabilities", "future", availDocId] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      setAvailModalOpen(false);
      setAvailEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAvail = useMutation({
    mutationFn: (id: string) => adminDeleteAvailability(id),
    onSuccess: () => {
      toast.success("Availability removed");
      if (availDocId) qc.invalidateQueries({ queryKey: ["admin-availabilities", "future", availDocId] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      setAvailDeleteTarget(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const queueSessionsQ = useQuery({
    queryKey: ["admin-sessions", queueDoctor, queueDate],
    queryFn: () => adminListSessions(queueDoctor, queueDate ?? undefined),
    enabled: tab === "queue" && Boolean(queueDoctor) && Boolean(queueDate),
  });

  const queueSnapshotQ = useQuery({
    queryKey: ["admin-queue-snapshot", queueDoctor, queueSession, queueDate],
    queryFn: () =>
      fetchDoctorQueue(queueDoctor, {
        date: queueDate ?? undefined,
        sessionId: queueSession || undefined,
      }),
    enabled: tab === "queue" && Boolean(queueDoctor) && Boolean(queueDate),
  });

  useEffect(() => {
    const sessions = queueSessionsQ.data?.sessions;
    if (!sessions?.length) {
      setQueueSession("");
      return;
    }
    if (!sessions.some((s) => s.id === queueSession)) {
      setQueueSession(sessions[0]!.id);
    }
  }, [queueSessionsQ.data?.sessions, queueSession]);

  const nextTok = useMutation({
    mutationFn: () => {
      const sid = queueSession || queueSessionsQ.data?.sessions[0]?.id;
      if (!sid) throw new Error("Select a clinic session");
      return adminSessionNext(sid);
    },
    onSuccess: (r) => {
      if (r.advanced) toast.success(`Called ${r.token}`);
      else toast.message(r.message ?? "No tokens");
      qc.invalidateQueries({ queryKey: ["admin-queue-snapshot"] });
      qc.invalidateQueries({ queryKey: ["admin-appointments"] });
      qc.invalidateQueries({ queryKey: ["admin-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchAppt = useMutation({
    mutationFn: (p: { id: string; status: string }) => adminPatchAppointmentStatus(p.id, p.status),
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-appointments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createStaff = useMutation({
    mutationFn: () =>
      superCreateUser({
        email: staffEmail,
        password: staffPassword,
        name: staffName,
      }),
    onSuccess: () => {
      toast.success("User created");
      resetStaffForm();
      setStaffModal(null);
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patchStaffUser = useMutation({
    mutationFn: (p: { id: string; name?: string; phone?: string | null; role?: string }) =>
      superPatchUser(p.id, { name: p.name, phone: p.phone, role: p.role }),
    onSuccess: () => {
      toast.success("User updated");
      setStaffModal(null);
      setPatientEditTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteStaffUser = useMutation({
    mutationFn: (id: string) => superDeleteUser(id),
    onSuccess: () => {
      toast.success("User deleted");
      setStaffDeleteTarget(null);
      setPatientDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin-staff"] });
      qc.invalidateQueries({ queryKey: ["admin-patients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doctorOptions = (docOptionsQ.data ?? docTableQ.data?.doctors ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const availEditLockedSummary = useMemo(() => {
    if (!availEditingId || !availListQ.data?.availabilities) return null;
    const row = availListQ.data.availabilities.find((r) => r.id === availEditingId);
    if (!row) return null;
    const ymd = row.date.slice(0, 10);
    const [y, mo, d] = ymd.split("-").map(Number);
    return {
      doctorName: doctorOptions.find((o) => o.value === row.doctorId)?.label ?? "Doctor",
      dateLabel: new Date(y, mo - 1, d).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    };
  }, [availEditingId, availListQ.data, doctorOptions]);
  const departmentOptions = (deptOptionsQ.data ?? deptTableQ.data?.departments ?? []).map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const departmentOptionsLoading = deptOptionsQ.isLoading || deptOptionsQ.isFetching;
  const availRows = tab === "avail" ? (availListQ.data?.availabilities ?? []) : [];
  const conhistRows = tab === "conhist" ? (conhistListQ.data?.availabilities ?? []) : [];
  const availTablePending = tab === "avail" && Boolean(availDocId) && availListQ.isPending;
  const conhistTablePending = tab === "conhist" && Boolean(conhistDocId) && conhistListQ.isPending;
  const canManageUsers = role === "SUPER_ADMIN";

  function formatAvailabilityDateLabel(dateIso: string) {
    const ymd = dateIso.slice(0, 10);
    const [y, mo, d] = ymd.split("-").map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div>
      <PageHeader title={ADMIN_NAV_META[tab].label} />

      {tab === "dept" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Departments ({deptTableQ.data?.total ?? "…"} total).
            </p>
            <CreateButton
              onClick={() => {
                setNewDeptName("");
                setNewDeptDesc("");
                setDeptModal({ mode: "create" });
              }}
            >
              Create department
            </CreateButton>
          </div>

          <Card className="overflow-hidden p-0">
            {deptTableQ.isLoading ? (
              <AdminDepartmentsTableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">SL.No</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Description</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Doctors</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptTableQ.data?.departments.map((d, idx) => (
                      <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {(deptPage - 1) * (deptTableQ.data?.pageSize ?? TABLE_PAGE_SIZE) + idx + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{d.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.description ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {d._count?.doctors ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <EditButton
                              onClick={() => {
                                setEditingDept(d);
                                setDeptModal({ mode: "edit" });
                              }}
                            />
                            <DeleteButton
                              onClick={() => setConfirmDialog({ kind: "delete-dept", dept: d })}
                              disabled={deleteDept.isPending}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!deptTableQ.data?.departments.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          No departments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {deptTableQ.data && (
              <TablePagination
                page={deptPage}
                pageSize={deptTableQ.data.pageSize}
                total={deptTableQ.data.total}
                onPageChange={setDeptPage}
              />
            )}
          </Card>
        </div>
      )}

      {tab === "docs" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Doctors ({docTableQ.data?.total ?? "…"} total).
            </p>
            <CreateButton
              onClick={() => {
                setEditingDoc(null);
                setDocName("");
                setDocEmail("");
                setDocPassword("");
                setDocDeptId("");
                setDocExperience("");
                setDocQualification("");
                setDocSpecialization("");
                setDocImageUrl("");
                setDocModal({ mode: "create" });
              }}
            >
              Create doctor
            </CreateButton>
          </div>

          <Card className="overflow-hidden p-0">
            {docTableQ.isLoading ? (
              <AdminDoctorsTableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">SL.No</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Doctor</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Department</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Specialty</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Experience</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docTableQ.data?.doctors.map((d, idx) => (
                      <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {(docPage - 1) * (docTableQ.data?.pageSize ?? TABLE_PAGE_SIZE) + idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <DoctorAvatar name={d.name} imageUrl={d.imageUrl} size="sm" />
                            <span className="text-slate-900 dark:text-slate-100">{d.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{d.department.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.specialization ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.experience ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              d.active
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300"
                            }`}
                          >
                            {d.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <EditButton
                              onClick={() => {
                                setEditingDoc(d);
                                setDocModal({ mode: "edit", doctor: d });
                              }}
                            />
                            {d.active ? (
                              <DeactivateButton
                                onClick={() => setConfirmDialog({ kind: "deactivate", doctor: d })}
                                disabled={deactivateDoc.isPending}
                              />
                            ) : (
                              <ActivateButton
                                onClick={() => setConfirmDialog({ kind: "activate", doctor: d })}
                                disabled={activateDoc.isPending}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!docTableQ.data?.doctors.length && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          No doctors found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {docTableQ.data && (
              <TablePagination
                page={docPage}
                pageSize={docTableQ.data.pageSize}
                total={docTableQ.data.total}
                onPageChange={setDocPage}
              />
            )}
          </Card>
        </div>
      )}

      {tab === "avail" && (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label className="mb-2 block text-sm">Doctor</label>
              <DropdownSelect value={availDocId} onChange={setAvailDocId} options={doctorOptions} />
            </div>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <CalendarDatePicker
                label="Filter by date"
                value={availFilterDate}
                minDateIso={localTomorrowStr()}
                onChange={setAvailFilterDate}
              />
            </div>
            <CreateButton
              type="button"
              className="shrink-0 sm:ml-auto"
              onClick={() => {
                setAvailEditingId(null);
                setModalAvailDocId(availDocId);
                setAvailDate(localTomorrowStr());
                const d = defaultAvailabilityStartEnd();
                setStartT(d.start);
                setEndT(d.end);
                setAvailModalOpen(true);
              }}
              disabled={!availDocId}
            >
              Create availability
            </CreateButton>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Upcoming availability</p>
              
            </div>
            {!availDocId ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Select a doctor to list their availability.
              </p>
            ) : availTablePending ? (
              <AdminAvailabilityTableSkeleton />
            ) : availListQ.isError ? (
              <p className="px-4 py-8 text-center text-sm text-red-600 dark:text-red-400">
                Could not load availability. Try again or refresh the page.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">SL.No</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Start</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">End</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availRows.map((row, idx) => {
                      const ymd = row.date.slice(0, 10);
                      const dateLabel = formatAvailabilityDateLabel(row.date);
                      return (
                        <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {(availPage - 1) * (availListQ.data?.pageSize ?? TABLE_PAGE_SIZE) + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{dateLabel}</td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {formatHm12Hour(row.startTime, ymd)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {formatHm12Hour(row.endTime, ymd)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <EditButton
                                type="button"
                                onClick={() => {
                                  setAvailEditingId(row.id);
                                  setModalAvailDocId(row.doctorId);
                                  setAvailDate(row.date.slice(0, 10));
                                  setStartT(row.startTime);
                                  setEndT(row.endTime);
                                  setAvailModalOpen(true);
                                }}
                              />
                              <DeleteButton
                                type="button"
                                onClick={() => setAvailDeleteTarget(row)}
                                disabled={deleteAvail.isPending}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!availRows.length && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          {availFilterDate
                            ? "No upcoming availability on this date."
                            : "No upcoming availability for this doctor."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {availListQ.data && availDocId && !availTablePending ? (
              <TablePagination
                page={availPage}
                pageSize={availListQ.data.pageSize}
                total={availListQ.data.total}
                onPageChange={setAvailPage}
              />
            ) : null}
          </Card>
        </div>
      )}

      {tab === "conhist" && (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label className="mb-2 block text-sm">Doctor</label>
              <DropdownSelect value={conhistDocId} onChange={setConhistDocId} options={doctorOptions} />
            </div>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <CalendarDatePicker
                label="Filter by date"
                value={conhistFilterDate}
                maxDateIso={localTodayStr()}
                onChange={setConhistFilterDate}
              />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Consultation history</p>
             
            </div>
            {!conhistDocId ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Select a doctor to view consultation history.
              </p>
            ) : conhistTablePending ? (
              <AdminAvailabilityTableSkeleton />
            ) : conhistListQ.isError ? (
              <p className="px-4 py-8 text-center text-sm text-red-600 dark:text-red-400">
                Could not load consultation history. Try again or refresh the page.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        SL.No
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Start</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conhistRows.map((row, idx) => {
                      const ymd = row.date.slice(0, 10);
                      return (
                        <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                            {(conhistPage - 1) * (conhistListQ.data?.pageSize ?? TABLE_PAGE_SIZE) + idx + 1}
                          </td>
                          <td className="px-4 py-3 text-slate-900 dark:text-slate-100">
                            {formatAvailabilityDateLabel(row.date)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {formatHm12Hour(row.startTime, ymd)}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            {formatHm12Hour(row.endTime, ymd)}
                          </td>
                        </tr>
                      );
                    })}
                    {!conhistRows.length && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          {conhistFilterDate
                            ? "No consultation history on this date."
                            : "No past consultation windows for this doctor."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {conhistListQ.data && conhistDocId && !conhistTablePending ? (
              <TablePagination
                page={conhistPage}
                pageSize={conhistListQ.data.pageSize}
                total={conhistListQ.data.total}
                onPageChange={setConhistPage}
              />
            ) : null}
          </Card>
        </div>
      )}

      {tab === "appt" && (
        <div className="flex flex-col gap-3">
          {apptQ.isLoading ? (
            <DateFilterCardSkeleton />
          ) : (
            <Card>
              <CalendarDatePicker
                label="Filter by date"
                value={apptDate}
                onChange={setApptDate}
                className="max-w-sm"
              />
            </Card>
          )}
          <Card className="overflow-visible p-0">
            {apptQ.isLoading ? (
              <AdminAppointmentsTableSkeleton />
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40">
                  <tr>
                    <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">SL.No</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Token</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Scheduled</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Doctor</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Department</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Patient</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apptQ.data?.appointments.map((a, idx) => (
                    <tr key={a.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {(apptPage - 1) * (apptQ.data?.pageSize ?? TABLE_PAGE_SIZE) + idx + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-teal-800 dark:text-teal-300">{a.token}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {new Date(a.scheduledAt).toLocaleString(undefined, {
                          year: "numeric",
                          month: "numeric",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{a.doctorName}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{a.departmentName}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <p>{a.patient.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{a.patient.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {formatAppointmentStatus(a.status)}
                        </span>
                      </td>
                      <td className="relative px-4 py-3">
                        <div className="relative flex justify-end">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300/90 bg-white text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-slate-800"
                            aria-label="Open status actions"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                              if (apptActionOpenId === a.id) {
                                setApptActionOpenId(null);
                                setApptActionMenuPos(null);
                                return;
                              }
                              setApptActionOpenId(a.id);
                              setApptActionMenuPos(getApptMenuPos(rect));
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!apptQ.data?.appointments.length && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        No visits found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
            {apptQ.data && (
              <TablePagination
                page={apptPage}
                pageSize={apptQ.data.pageSize}
                total={apptQ.data.total}
                onPageChange={setApptPage}
              />
            )}
            {apptActionOpenId && apptActionMenuPos && (
              <div
                className="fixed z-[999] w-36 max-h-[50vh] overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                style={{ top: apptActionMenuPos.top, left: apptActionMenuPos.left }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {(["BOOKED", "WAITING", "CHECKED_IN", "SKIPPED", "COMPLETED", "CANCELLED"] as const).map((s) => {
                  const current = apptQ.data?.appointments.find((x) => x.id === apptActionOpenId)?.status;
                  return (
                    <button
                      key={s}
                      type="button"
                      className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-slate-700 transition hover:bg-teal-100 hover:text-teal-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-teal-900/45 dark:hover:text-teal-100"
                      onClick={() => {
                        patchAppt.mutate({ id: apptActionOpenId, status: s });
                        setApptActionOpenId(null);
                        setApptActionMenuPos(null);
                      }}
                      disabled={patchAppt.isPending || current === s}
                    >
                      <span>{formatAppointmentStatus(s)}</span>
                      {current === s && <span className="text-[9px] text-slate-500 dark:text-slate-400">Current</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "queue" && (
        <Card>
          <label className="mb-2 block text-sm">Doctor</label>
          <DropdownSelect className="mb-3" value={queueDoctor} onChange={setQueueDoctor} options={doctorOptions} />
          <CalendarDatePicker
            label="Date"
            value={queueDate}
            minDateIso={localTodayStr()}
            onChange={setQueueDate}
            className="mb-3"
          />
          {queueSessionsQ.data?.sessions[0] && (
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              Clinic hours: {queueSessionsQ.data.sessions[0].startTime}–
              {queueSessionsQ.data.sessions[0].endTime} on the appointment day. The live queue opens and
              closes automatically at these times.
            </p>
          )}
          
          {queueSnapshotQ.data?.sessionPhase === "after_end" && (
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
              Clinic hours have ended for this day.
            </p>
          )}
          {queueSnapshotQ.data && !queueSnapshotQ.data.queueStarted && queueSnapshotQ.data.sessionPhase === "active" && (
            <p className="mb-3 text-sm text-amber-800 dark:text-amber-200">
              Opening live queue…
            </p>
          )}
          {queueSnapshotQ.data?.queueStarted && (
            <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
              <p className="text-xs font-medium uppercase text-slate-500">Now serving</p>
              <p className="font-mono text-xl font-semibold text-teal-800 dark:text-teal-300">
                {queueSnapshotQ.data.current?.token ?? "—"}
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {queueSnapshotQ.data.remainingPatients} waiting · issued{" "}
                {queueSnapshotQ.data.session.tokenCounter}
              </p>
            </div>
          )}
          {queueSnapshotQ.data && queueSnapshotQ.data.sessionAppointments.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-slate-800/50">
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Token</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Patient</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Appointment</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Booked on</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {queueSnapshotQ.data.sessionAppointments.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-slate-100 last:border-b-0 dark:border-slate-800"
                    >
                      <td className="px-3 py-2 font-mono font-medium">{a.token}</td>
                      <td className="px-3 py-2">{a.patientName}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {formatLocaleDateTime(a.scheduledAt)}
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {formatLocaleDateTime(a.createdAt)}
                      </td>
                      <td className="px-3 py-2">{formatAppointmentStatus(a.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button
            className="w-full"
            onClick={() => nextTok.mutate()}
            disabled={
              nextTok.isPending ||
              !queueDoctor ||
              !queueSessionsQ.data?.sessions.length ||
              !queueSnapshotQ.data?.queueStarted ||
              queueSnapshotQ.data?.sessionPhase !== "active"
            }
          >
            Next patient
          </Button>
        </Card>
      )}

      {tab === "patients" && (role === "ADMIN" || role === "SUPER_ADMIN") && (
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Search</label>
              <input
                type="search"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Name, email, or phone"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-teal-500/40 focus:ring-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <CalendarDatePicker
              label="Date"
              value={patientDate}
              onChange={setPatientDate}
              className="max-w-sm flex-1"
            />
            <div className="max-w-xs flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <DropdownSelect
                value={patientFilter}
                onChange={(v) => setPatientFilter(v as AdminPatientFilter)}
                options={[
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "completed", label: "Completed" },
                ]}
                clearable={false}
                searchable={false}
              />
            </div>
          </Card>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {patientsQ.data?.total ?? "…"} patient{patientsQ.data?.total === 1 ? "" : "s"}
            {patientDate
              ? ` for ${new Date(`${patientDate}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}`
              : " (all registered patients)"}
            {patientFilter === "pending"
              ? " — not booked or awaiting consultation"
              : patientFilter === "completed"
                ? " — completed, cancelled, or skipped"
                : ""}
          </p>
          <Card className="overflow-hidden p-0">
            {patientsQ.isLoading ? (
              <AdminPatientsTableSkeleton withActions={canManageUsers} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">SL.No</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Doctor</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Token</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Scheduled</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Registered</th>
                      {canManageUsers && (
                        <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {patientsQ.data?.patients.map((u, idx) => (
                      <tr
                        key={u.appointmentId ? `${u.id}-${u.appointmentId}` : u.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {(patientPage - 1) * (patientsQ.data?.pageSize ?? 15) + idx + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{u.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.phone ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                              u.displayStatus === "NOT_BOOKED"
                                ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                                : u.displayStatus === "COMPLETED" ||
                                    u.displayStatus === "CANCELLED" ||
                                    u.displayStatus === "SKIPPED"
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200"
                            )}
                          >
                            {formatPatientDisplayStatus(u.displayStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                          {u.doctorName ? (
                            <>
                              <p>{u.doctorName}</p>
                              {u.departmentName ? (
                                <p className="text-xs text-slate-500 dark:text-slate-400">{u.departmentName}</p>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-teal-800 dark:text-teal-300">
                          {u.token ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {u.scheduledAt
                            ? new Date(u.scheduledAt).toLocaleString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        {canManageUsers && (
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <EditButton
                                onClick={() => {
                                  setPatientEditTarget({
                                    id: u.id,
                                    name: u.name,
                                    email: u.email,
                                    phone: u.phone,
                                  });
                                  setPatientEditName(u.name);
                                  setPatientEditPhone(u.phone ?? "");
                                }}
                              />
                              <DeleteButton
                                onClick={() => setPatientDeleteTarget({ id: u.id, name: u.name })}
                                disabled={deleteStaffUser.isPending}
                              />
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {!patientsQ.data?.patients.length && (
                      <tr>
                        <td
                          colSpan={canManageUsers ? 10 : 9}
                          className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                        >
                          No patients match your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {patientsQ.data && (
              <TablePagination
                page={patientPage}
                pageSize={patientsQ.data.pageSize}
                total={patientsQ.data.total}
                onPageChange={setPatientPage}
              />
            )}
          </Card>
        </div>
      )}

      {confirmDialog && (
        <ConfirmModal
          open
          title={
            confirmDialog.kind === "deactivate"
              ? "Deactivate doctor?"
              : confirmDialog.kind === "activate"
                ? "Activate doctor?"
                : "Delete department?"
          }
          description={
            confirmDialog.kind === "deactivate" ? (
              <>
                <span className="font-medium text-slate-800 dark:text-slate-200">{confirmDialog.doctor.name}</span> will
                be hidden from public booking and the specialty directory. You can still see them in this admin list as
                inactive.
              </>
            ) : confirmDialog.kind === "activate" ? (
              <>
                <span className="font-medium text-slate-800 dark:text-slate-200">{confirmDialog.doctor.name}</span> will
                become visible in public booking and the specialty directory again.
              </>
            ) : (
              <>
                Delete <span className="font-medium text-slate-800 dark:text-slate-200">{confirmDialog.dept.name}</span>
                ? Reassign or remove all doctors from this department first, or the request will be blocked.
              </>
            )
          }
          confirmLabel={
            confirmDialog.kind === "deactivate"
              ? "Deactivate"
              : confirmDialog.kind === "activate"
                ? "Activate"
                : "Delete department"
          }
          cancelLabel="Cancel"
          confirmVariant={confirmDialog.kind === "activate" ? "primary" : "danger"}
          onClose={() => setConfirmDialog(null)}
          onConfirm={() => {
            if (confirmDialog.kind === "deactivate") {
              deactivateDoc.mutate(confirmDialog.doctor.id);
            } else if (confirmDialog.kind === "activate") {
              activateDoc.mutate(confirmDialog.doctor.id);
            } else {
              deleteDept.mutate(confirmDialog.dept.id);
            }
          }}
        />
      )}

      {tab === "staff" && role === "SUPER_ADMIN" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end gap-2">
            <CreateButton
              onClick={() => {
                resetStaffForm();
                setStaffRole("ADMIN");
                setStaffModal({ mode: "create" });
              }}
            >
              Create admin
            </CreateButton>
          </div>

          <Card className="overflow-hidden p-0">
            {staffQ.isLoading ? (
              <AdminStaffTableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="w-14 px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">SL.No</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Role</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Joined</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffQ.data?.users.map((u, idx) => (
                      <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {(staffPage - 1) * (staffQ.data?.pageSize ?? 15) + idx + 1}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-slate-100">{u.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{u.role}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <EditButton
                              onClick={() => {
                                setStaffName(u.name);
                                setStaffEmail(u.email);
                                setStaffRole((u.role === "ADMIN" ? "ADMIN" : "USER") as "ADMIN" | "USER");
                                setStaffModal({ mode: "edit", user: { id: u.id, name: u.name, email: u.email, role: u.role } });
                              }}
                            />
                            <DeleteButton
                              onClick={() => setStaffDeleteTarget({ id: u.id, name: u.name })}
                              disabled={deleteStaffUser.isPending}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!staffQ.data?.users.length && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                          No admins found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {staffQ.data && (
              <TablePagination
                page={staffPage}
                pageSize={staffQ.data.pageSize}
                total={staffQ.data.total}
                onPageChange={setStaffPage}
              />
            )}
          </Card>
        </div>
      )}

      {staffModal && role === "SUPER_ADMIN" && (
        <AdminStaffModal
          mode={staffModal.mode}
          email={staffEmail}
          name={staffName}
          roleValue={staffRole}
          password={staffPassword}
          isSaving={createStaff.isPending || patchStaffUser.isPending}
          onClose={() => {
            setStaffModal(null);
            resetStaffForm();
          }}
          onEmailChange={setStaffEmail}
          onNameChange={setStaffName}
          onPasswordChange={setStaffPassword}
          onRoleChange={(v) => setStaffRole(v as "ADMIN" | "USER")}
          onSubmit={() => {
            if (staffModal.mode === "create") {
              createStaff.mutate();
              return;
            }
            const body: { id: string; name?: string; role?: string } = { id: staffModal.user.id };
            if (staffName !== staffModal.user.name) body.name = staffName;
            if (staffRole !== staffModal.user.role) body.role = staffRole;
            if (!body.name && !body.role) {
              toast.message("No changes");
              return;
            }
            patchStaffUser.mutate(body);
          }}
        />
      )}

      {staffDeleteTarget && (
        <ConfirmModal
          open
          title="Delete admin?"
          description={
            <>
              Delete <span className="font-medium text-slate-800 dark:text-slate-200">{staffDeleteTarget.name}</span>?
              This action cannot be undone.
            </>
          }
          confirmLabel="Delete admin"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onClose={() => setStaffDeleteTarget(null)}
          onConfirm={() => deleteStaffUser.mutate(staffDeleteTarget.id)}
        />
      )}

      {patientEditTarget && (
        <EditUserNameModal
          title="Edit patient"
          email={patientEditTarget.email}
          name={patientEditName}
          phone={patientEditPhone}
          showPhone
          isSaving={patchStaffUser.isPending}
          onNameChange={setPatientEditName}
          onPhoneChange={setPatientEditPhone}
          onClose={() => setPatientEditTarget(null)}
          onSubmit={() => {
            const name = patientEditName.trim();
            const phone = patientEditPhone.trim();
            const nameChanged = name !== patientEditTarget.name.trim();
            const phoneChanged = phone !== (patientEditTarget.phone ?? "").trim();
            if (!nameChanged && !phoneChanged) {
              toast.message("No changes");
              return;
            }
            patchStaffUser.mutate({
              id: patientEditTarget.id,
              ...(nameChanged ? { name } : {}),
              ...(phoneChanged ? { phone: phone || null } : {}),
            });
          }}
        />
      )}

      {patientDeleteTarget && (
        <ConfirmModal
          open
          title="Delete patient?"
          description={
            <>
              Delete <span className="font-medium text-slate-800 dark:text-slate-200">{patientDeleteTarget.name}</span>?
              This action cannot be undone.
            </>
          }
          confirmLabel="Delete patient"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onClose={() => setPatientDeleteTarget(null)}
          onConfirm={() => deleteStaffUser.mutate(patientDeleteTarget.id)}
        />
      )}

      {deptModal?.mode === "create" && (
        <DepartmentModal
          title="Create department"
          name={newDeptName}
          description={newDeptDesc}
          isSaving={createDept.isPending}
          onNameChange={setNewDeptName}
          onDescriptionChange={setNewDeptDesc}
          onClose={() => setDeptModal(null)}
          onSubmit={() => createDept.mutate()}
          submitLabel="Create department"
        />
      )}

      {deptModal?.mode === "edit" && editingDept && (
        <DepartmentModal
          title="Edit department"
          name={editingDept.name}
          description={editingDept.description ?? ""}
          isSaving={updateDept.isPending}
          onNameChange={(v) => setEditingDept({ ...editingDept, name: v })}
          onDescriptionChange={(v) => setEditingDept({ ...editingDept, description: v })}
          onClose={() => {
            setDeptModal(null);
            setEditingDept(null);
          }}
          onSubmit={() =>
            updateDept.mutate({
              id: editingDept.id,
              name: editingDept.name,
              description: editingDept.description ?? "",
            })
          }
          submitLabel="Save changes"
        />
      )}

      {docModal?.mode === "create" && (
        <DoctorModal
          title="Create doctor"
          name={docName}
          email={docEmail}
          password={docPassword}
          accountMode="create"
          departmentId={docDeptId}
          specialization={docSpecialization}
          experience={docExperience}
          qualification={docQualification}
          imageUrl={docImageUrl}
          departmentOptions={departmentOptions}
          departmentOptionsLoading={departmentOptionsLoading}
          isSaving={saveDoc.isPending}
          onNameChange={setDocName}
          onEmailChange={setDocEmail}
          onPasswordChange={setDocPassword}
          onDepartmentChange={setDocDeptId}
          onSpecializationChange={setDocSpecialization}
          onExperienceChange={setDocExperience}
          onQualificationChange={setDocQualification}
          onImageUrlChange={setDocImageUrl}
          onUploadPhoto={uploadPhotoFile}
          onClose={() => setDocModal(null)}
          onSubmit={() => saveDoc.mutate({ isEdit: false })}
          submitLabel="Create doctor"
        />
      )}

      {docModal?.mode === "edit" && editingDoc && (
        <DoctorModal
          title="Edit doctor"
          name={docName}
          email={docEmail}
          password={docPassword}
          accountMode="edit"
          hasLoginAccount
          departmentId={docDeptId}
          specialization={docSpecialization}
          experience={docExperience}
          qualification={docQualification}
          imageUrl={docImageUrl}
          departmentOptions={departmentOptions}
          departmentOptionsLoading={departmentOptionsLoading}
          isSaving={saveDoc.isPending}
          onNameChange={setDocName}
          onEmailChange={setDocEmail}
          onPasswordChange={setDocPassword}
          onDepartmentChange={setDocDeptId}
          onSpecializationChange={setDocSpecialization}
          onExperienceChange={setDocExperience}
          onQualificationChange={setDocQualification}
          onImageUrlChange={setDocImageUrl}
          onUploadPhoto={uploadPhotoFile}
          onClose={() => {
            setDocModal(null);
            setEditingDoc(null);
          }}
          onSubmit={() => saveDoc.mutate({ isEdit: true })}
          submitLabel="Save changes"
        />
      )}

      {availModalOpen && (
        <AvailabilityCreateModal
          mode={availEditingId ? "edit" : "create"}
          lockedSummary={availEditLockedSummary}
          doctorOptions={doctorOptions}
          doctorId={modalAvailDocId}
          onDoctorChange={setModalAvailDocId}
          availDate={availDate}
          onAvailDateChange={(next) => {
            setAvailDate(next);
            if (next === localTodayStr()) {
              const d = defaultAvailabilityStartEnd();
              setStartT(d.start);
              setEndT(d.end);
            }
          }}
          startT={startT}
          onStartTChange={setStartT}
          endT={endT}
          onEndTChange={setEndT}
          disallowPastTimes={Boolean(availDate && availDate >= localTodayStr())}
          isSaving={setAvail.isPending || patchAvail.isPending}
          onClose={() => {
            setAvailModalOpen(false);
            setAvailEditingId(null);
          }}
          onSubmit={() => {
            if (availEditingId) {
              if (!availDate) {
                toast.error("Missing date.");
                return;
              }
              const startAt = parseLocalDateTime(availDate, startT);
              const endAt = parseLocalDateTime(availDate, endT);
              if (endAt.getTime() <= startAt.getTime()) {
                toast.error("End time must be after start time.");
                return;
              }
              const now = new Date();
              const enforcePast = availDate >= localTodayStr();
              if (enforcePast && startAt.getTime() < now.getTime()) {
                toast.error("Start time cannot be in the past.");
                return;
              }
              if (enforcePast && endAt.getTime() < now.getTime()) {
                toast.error("End time cannot be in the past.");
                return;
              }
              patchAvail.mutate({
                id: availEditingId,
                startTime: startT,
                endTime: endT,
              });
              return;
            }
            if (!modalAvailDocId || !availDate) {
              toast.error("Choose a doctor and date.");
              return;
            }
            const startAt = parseLocalDateTime(availDate, startT);
            const endAt = parseLocalDateTime(availDate, endT);
            const now = new Date();
            if (startAt.getTime() < now.getTime()) {
              toast.error("Start time cannot be in the past.");
              return;
            }
            if (endAt.getTime() <= startAt.getTime()) {
              toast.error("End time must be after start time.");
              return;
            }
            if (endAt.getTime() < now.getTime()) {
              toast.error("End time cannot be in the past.");
              return;
            }
            setAvail.mutate({
              doctorId: modalAvailDocId,
              date: availDate,
              startTime: startT,
              endTime: endT,
            });
          }}
        />
      )}

      {availDeleteTarget && (
        <ConfirmModal
          open
          title="Delete availability?"
          description={
            <>
              Remove this schedule window on{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {availDeleteTarget.date.slice(0, 10)}
              </span>
              ? Patients with active visits that no longer match the doctor&apos;s hours will see an alert on their
              bookings.
            </>
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmVariant="danger"
          onClose={() => setAvailDeleteTarget(null)}
          onConfirm={() => deleteAvail.mutate(availDeleteTarget.id)}
        />
      )}
    </div>
  );
}

function AdminStaffModal({
  mode,
  email,
  name,
  roleValue,
  password,
  isSaving,
  onClose,
  onEmailChange,
  onNameChange,
  onPasswordChange,
  onRoleChange,
  onSubmit,
}: {
  mode: "create" | "edit";
  email: string;
  name: string;
  roleValue: "ADMIN" | "USER";
  password: string;
  isSaving: boolean;
  onClose: () => void;
  onEmailChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const canSubmit =
    mode === "create" ? Boolean(email.trim() && name.trim() && password.trim()) : Boolean(name.trim());

  return (
    <ModalOverlay>
      <ModalBackdrop />
      <ModalPanel
        title={mode === "create" ? "Create admin" : "Edit admin"}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="admin-staff-form" disabled={!canSubmit || isSaving}>
              {mode === "create" ? "Create admin" : "Save changes"}
            </Button>
          </div>
        }
      >
        <form
          id="admin-staff-form"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="Full name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
          <input
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 disabled:opacity-60"
            placeholder="Email"
            type="email"
            autoComplete="off"
            name="staff-email-no-autofill"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={mode === "edit"}
          />
          {mode === "create" && (
            <input
              className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Temporary password"
              type="password"
              autoComplete="new-password"
              name="staff-password-no-autofill"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          )}
          <label className="mb-2 block text-sm">Role</label>
          <DropdownSelect
            className="mb-2"
            value={roleValue}
            onChange={onRoleChange}
            options={[
              { value: "ADMIN", label: "Clinic admin" },
              { value: "USER", label: "Patient" },
            ]}
          />
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
}

function EditUserNameModal({
  title,
  email,
  name,
  phone,
  showPhone,
  isSaving,
  onNameChange,
  onPhoneChange,
  onClose,
  onSubmit,
}: {
  title: string;
  email: string;
  name: string;
  phone?: string;
  showPhone?: boolean;
  isSaving: boolean;
  onNameChange: (v: string) => void;
  onPhoneChange?: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <ModalOverlay>
      <ModalBackdrop />
      <ModalPanel
        title={title}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="edit-user-name-form" disabled={!name.trim() || isSaving}>
              Save changes
            </Button>
          </div>
        }
      >
        <form
          id="edit-user-name-form"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <input
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 disabled:opacity-60"
            value={email}
            type="email"
            disabled
          />
          <input
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Full name"
          />
          {showPhone && onPhoneChange ? (
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="tel"
              inputMode="tel"
              value={phone ?? ""}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="Mobile number"
            />
          ) : null}
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
}

function AvailabilityCreateModal({
  mode,
  lockedSummary,
  doctorOptions,
  doctorId,
  onDoctorChange,
  availDate,
  onAvailDateChange,
  startT,
  onStartTChange,
  endT,
  onEndTChange,
  disallowPastTimes,
  isSaving,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  lockedSummary: { doctorName: string; dateLabel: string } | null;
  doctorOptions: { value: string; label: string }[];
  doctorId: string;
  onDoctorChange: (v: string) => void;
  availDate: string | null;
  onAvailDateChange: (v: string | null) => void;
  startT: string;
  onStartTChange: (v: string) => void;
  endT: string;
  onEndTChange: (v: string) => void;
  disallowPastTimes: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const isEdit = mode === "edit";
  const canSubmit = isEdit ? Boolean(lockedSummary && availDate) : Boolean(doctorId && availDate);

  return (
    <ModalOverlay>
      <ModalBackdrop />
      <ModalPanel
        title={isEdit ? "Edit availability" : "Create availability"}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="availability-form" disabled={!canSubmit || isSaving}>
              {isEdit ? "Save changes" : "Create availability"}
            </Button>
          </div>
        }
      >
        <form
          id="availability-form"
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {isEdit && lockedSummary ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Doctor</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{lockedSummary.doctorName}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{lockedSummary.dateLabel}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Doctor</label>
                <DropdownSelect
                  value={doctorId}
                  onChange={onDoctorChange}
                  options={doctorOptions}
                  placeholder="Select doctor"
                />
              </div>
              <CalendarDatePicker
                label="Date"
                value={availDate}
                minDateIso={localTomorrowStr()}
                onChange={onAvailDateChange}
              />
            </>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ClockTimePicker
              label="Start time"
              value={startT}
              onChange={onStartTChange}
              referenceDate={availDate}
              disallowPastTimes={disallowPastTimes}
            />
            <ClockTimePicker
              label="End time"
              value={endT}
              onChange={onEndTChange}
              referenceDate={availDate}
              disallowPastTimes={disallowPastTimes}
              notBeforeTime={startT}
            />
          </div>
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
}

function DepartmentModal({
  title,
  name,
  description,
  isSaving,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSubmit,
  submitLabel,
}: {
  title: string;
  name: string;
  description: string;
  isSaving: boolean;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <ModalOverlay>
      <ModalBackdrop />
      <ModalPanel
        title={title}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="department-form" disabled={!name.trim() || isSaving}>
              {submitLabel}
            </Button>
          </div>
        }
      >
        <form
          id="department-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Department name</label>
          <input
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
          <textarea
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            rows={3}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
}

function DoctorModal({
  title,
  name,
  email = "",
  password = "",
  accountMode = "none",
  hasLoginAccount = true,
  departmentId,
  specialization,
  experience,
  qualification,
  imageUrl,
  departmentOptions,
  departmentOptionsLoading = false,
  isSaving,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onDepartmentChange,
  onSpecializationChange,
  onExperienceChange,
  onQualificationChange,
  onImageUrlChange,
  onUploadPhoto,
  onClose,
  onSubmit,
  submitLabel,
}: {
  title: string;
  name: string;
  email?: string;
  password?: string;
  accountMode?: "none" | "create" | "edit";
  /** When editing: false if doctor has no portal login yet */
  hasLoginAccount?: boolean;
  departmentId: string;
  specialization: string;
  experience: string;
  qualification: string;
  imageUrl: string;
  departmentOptions: { value: string; label: string }[];
  departmentOptionsLoading?: boolean;
  isSaving: boolean;
  onNameChange: (v: string) => void;
  onEmailChange?: (v: string) => void;
  onPasswordChange?: (v: string) => void;
  onDepartmentChange: (v: string) => void;
  onSpecializationChange: (v: string) => void;
  onExperienceChange: (v: string) => void;
  onQualificationChange: (v: string) => void;
  onImageUrlChange: (v: string) => void;
  onUploadPhoto: (file: File) => Promise<string>;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const showAccountFields = accountMode === "create" || accountMode === "edit";
  const canSubmit =
    Boolean(name.trim() && departmentId) &&
    !isSaving &&
    (accountMode === "none" ||
      (accountMode === "create" && email.trim() && password.length >= 8) ||
      (accountMode === "edit" &&
        email.trim() &&
        (hasLoginAccount ? !password || password.length >= 8 : password.length >= 8)));

  return (
    <ModalOverlay>
      <ModalBackdrop />
      <ModalPanel
        title={title}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="doctor-form" disabled={!canSubmit}>
              {submitLabel}
            </Button>
          </div>
        }
      >
        <form
          id="doctor-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Full name</label>
          <input
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
          />
          {showAccountFields && (
            <>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Portal login
              </p>
              {!hasLoginAccount && accountMode === "edit" ? (
                <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">
                  No login yet — set email and password to enable doctor sign-in.
                </p>
              ) : null}
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Login email</label>
              <input
                type="email"
                autoComplete="off"
                className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={email}
                onChange={(e) => onEmailChange?.(e.target.value)}
              />
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                {accountMode === "edit" ? "New password (optional)" : "Password"}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder={accountMode === "edit" ? "" : undefined}
                className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={password}
                onChange={(e) => onPasswordChange?.(e.target.value)}
              />
            </>
          )}
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Department</label>
          <DropdownSelect
            className="mb-3"
            value={departmentId}
            onChange={onDepartmentChange}
            options={departmentOptions}
            placeholder={departmentOptionsLoading ? "Loading departments…" : "Select department"}
            clearable={!departmentOptionsLoading}
          />
          {!departmentOptionsLoading && departmentOptions.length === 0 ? (
            <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
              No departments found. Create a department first.
            </p>
          ) : null}
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Experience</label>
          <input
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={experience}
            onChange={(e) => onExperienceChange(e.target.value)}
          />
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Qualification</label>
          <textarea
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            rows={2}
            value={qualification}
            onChange={(e) => onQualificationChange(e.target.value)}
          />
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Primary specialty</label>
          <input
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            value={specialization}
            onChange={(e) => onSpecializationChange(e.target.value)}
          />
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Profile photo (max {MAX_PHOTO_FILE_BYTES / (1024 * 1024)} MB)
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="mb-3 w-full cursor-pointer text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-teal-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white file:shadow-md file:shadow-teal-900/25 file:transition hover:file:bg-teal-700 hover:file:shadow-lg dark:text-slate-400 dark:file:bg-teal-500 dark:file:shadow-teal-950/40 dark:hover:file:bg-teal-400"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const url = await onUploadPhoto(f);
                onImageUrlChange(url);
                toast.success("Photo uploaded");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Invalid file");
              }
            }}
          />
          {imageUrl && (
            <div className="mb-2 flex items-center gap-3">
              <DoctorAvatar name={name || "Preview"} imageUrl={imageUrl} size="md" />
              <Button variant="ghost" className="min-h-10 text-xs" onClick={() => onImageUrlChange("")}>
                Clear photo
              </Button>
            </div>
          )}
        </form>
      </ModalPanel>
    </ModalOverlay>
  );
}
