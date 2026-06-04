import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { AppointmentStatus, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { AppError } from "../../lib/errors.js";
import { adminRoleToJwt, assertEmailAvailable } from "../../lib/account.js";
import {
  adminDb,
  asAdminCreateInput,
  asAdminListRow,
  asAdminRow,
  asAdminUpdateInput,
  asDoctorUncheckedCreate,
  asDoctorUncheckedUpdate,
  asPatientPublicRow,
  asUserSelect,
  asUserUncheckedUpdate,
  asUserWhereInput,
  patientListSelect,
  type AdminListRow,
  type PatientPublicRow,
} from "../../lib/prisma-bridge.js";
import { AdminRole, type AdminRoleValue } from "../../lib/roles.js";
import { skipTake } from "../../lib/pagination.js";
import { syncScheduleNoticesForDoctorDate } from "../../lib/schedule-notices.js";
import { dateOnlyUtc, localDateTime, toDateOnlyIsoFromDbDate } from "../../lib/time.js";
import { formatTokenDisplay } from "../../lib/tokens.js";
import {
  ensureSessionForAvailability,
  syncSessionTimeRange,
} from "../queue/session.service.js";
import type {
  adminAppointmentListSchema,
  adminResourceListQuerySchema,
  adminPatientListQuerySchema,
  adminUserListQuerySchema,
  createDepartmentSchema,
  createDoctorSchema,
  createStaffUserSchema,
  patchSuperUserSchema,
  updateDepartmentSchema,
  updateDoctorSchema,
  patchAvailabilitySchema,
  upsertAvailabilitySchema,
} from "./admin.schemas.js";
import type { z } from "zod";

export async function listDepartmentsAdmin(
  app: FastifyInstance,
  q: z.infer<typeof adminResourceListQuerySchema>
) {
  const { skip, take } = skipTake(q);
  const [total, rows] = await Promise.all([
    app.prisma.department.count(),
    app.prisma.department.findMany({
      orderBy: { name: "asc" },
      skip,
      take,
      include: { _count: { select: { doctors: true } } },
    }),
  ]);
  return { page: q.page, pageSize: q.pageSize, total, departments: rows };
}

export async function createDepartment(app: FastifyInstance, body: z.infer<typeof createDepartmentSchema>) {
  return app.prisma.department.create({ data: body });
}

export async function updateDepartment(
  app: FastifyInstance,
  id: string,
  body: z.infer<typeof updateDepartmentSchema>
) {
  try {
    return await app.prisma.department.update({ where: { id }, data: body });
  } catch {
    throw new AppError(404, "Department not found", "NOT_FOUND");
  }
}

export async function deleteDepartment(app: FastifyInstance, id: string) {
  const doctorCount = await app.prisma.doctor.count({ where: { departmentId: id } });
  if (doctorCount > 0) {
    throw new AppError(
      400,
      "Reassign or remove doctors from this department before deleting it",
      "DEPT_HAS_DOCTORS"
    );
  }
  try {
    await app.prisma.department.delete({ where: { id } });
    return { ok: true };
  } catch {
    throw new AppError(404, "Department not found", "NOT_FOUND");
  }
}

export async function listDoctorsAdmin(app: FastifyInstance, q: z.infer<typeof adminResourceListQuerySchema>) {
  const { skip, take } = skipTake(q);
  const [total, rows] = await Promise.all([
    app.prisma.doctor.count(),
    app.prisma.doctor.findMany({
      orderBy: { name: "asc" },
      skip,
      take,
      include: {
        department: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { page: q.page, pageSize: q.pageSize, total, doctors: rows };
}

export async function createDoctor(app: FastifyInstance, body: z.infer<typeof createDoctorSchema>) {
  const dept = await app.prisma.department.findUnique({ where: { id: body.departmentId } });
  if (!dept) throw new AppError(400, "Invalid department", "INVALID_DEPARTMENT");

  await assertEmailAvailable(app, body.email);

  const passwordHash = await bcrypt.hash(body.password, 10);
  const imageUrl = body.imageUrl && body.imageUrl.length > 0 ? body.imageUrl : null;
  const experience = body.experience && body.experience.length > 0 ? body.experience : null;
  const qualification =
    body.qualification && body.qualification.length > 0 ? body.qualification : null;

  return app.prisma.doctor.create({
    data: asDoctorUncheckedCreate({
      departmentId: body.departmentId,
      email: body.email,
      passwordHash,
      name: body.name,
      specialization: body.specialization ?? null,
      experience,
      qualification,
      imageUrl,
      active: body.active ?? true,
    }),
    include: {
      department: { select: { id: true, name: true } },
    },
  });
}

export async function updateDoctor(
  app: FastifyInstance,
  id: string,
  body: z.infer<typeof updateDoctorSchema>
) {
  const existing = await app.prisma.doctor.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Doctor not found", "NOT_FOUND");

  const { email, password, imageUrl, experience, qualification, name, departmentId, specialization, active } =
    body;

  if (email) {
    await assertEmailAvailable(app, email, { doctorId: id });
  }

  if (departmentId) {
    const dept = await app.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new AppError(400, "Invalid department", "INVALID_DEPARTMENT");
  }

  try {
    const patch: Record<string, unknown> = {};
    if (departmentId !== undefined) patch.departmentId = departmentId;
    if (email !== undefined) patch.email = email;
    if (password) patch.passwordHash = await bcrypt.hash(password, 10);
    if (name !== undefined) patch.name = name;
    if (specialization !== undefined) patch.specialization = specialization;
    if (active !== undefined) patch.active = active;
    if (imageUrl !== undefined) patch.imageUrl = imageUrl.length > 0 ? imageUrl : null;
    if (experience !== undefined) patch.experience = experience.length > 0 ? experience : null;
    if (qualification !== undefined) {
      patch.qualification = qualification.length > 0 ? qualification : null;
    }

    return await app.prisma.doctor.update({
      where: { id },
      data: asDoctorUncheckedUpdate(patch),
      include: {
        department: { select: { id: true, name: true } },
      },
    });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(404, "Doctor not found", "NOT_FOUND");
  }
}

export async function deactivateDoctor(app: FastifyInstance, id: string) {
  try {
    return await app.prisma.doctor.update({
      where: { id },
      data: { active: false },
    });
  } catch {
    throw new AppError(404, "Doctor not found", "NOT_FOUND");
  }
}

export async function setAvailability(app: FastifyInstance, body: z.infer<typeof upsertAvailabilitySchema>) {
  const doctor = await app.prisma.doctor.findUnique({ where: { id: body.doctorId } });
  if (!doctor) throw new AppError(404, "Doctor not found", "NOT_FOUND");

  const date = dateOnlyUtc(body.date);

  const row = await app.prisma.$transaction(async (tx) => {
    const availability = await tx.availability.create({
      data: {
        doctorId: body.doctorId,
        date,
        startTime: body.startTime,
        endTime: body.endTime,
      },
    });
    await ensureSessionForAvailability(tx, availability);
    return availability;
  });

  await syncScheduleNoticesForDoctorDate(app, body.doctorId, date);
  return row;
}

export async function patchAvailability(app: FastifyInstance, id: string, body: z.infer<typeof patchAvailabilitySchema>) {
  const row = await app.prisma.availability.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Availability not found", "NOT_FOUND");

  const startTime = body.startTime ?? row.startTime;
  const endTime = body.endTime ?? row.endTime;
  const dateStr = toDateOnlyIsoFromDbDate(row.date);
  if (localDateTime(dateStr, endTime).getTime() <= localDateTime(dateStr, startTime).getTime()) {
    throw new AppError(400, "End time must be after start time", "INVALID_RANGE");
  }

  const updated = await app.prisma.$transaction(async (tx) => {
    const availability = await tx.availability.update({
      where: { id },
      data: { startTime, endTime },
    });
    await syncSessionTimeRange(tx, row.doctorId, row.date);
    return availability;
  });
  await syncScheduleNoticesForDoctorDate(app, row.doctorId, row.date);
  return updated;
}

export async function deleteAvailability(app: FastifyInstance, id: string) {
  const row = await app.prisma.availability.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Availability not found", "NOT_FOUND");
  const { doctorId, date } = row;
  await app.prisma.$transaction(async (tx) => {
    await tx.availability.delete({ where: { id } });
    await syncSessionTimeRange(tx, doctorId, date);
  });
  await syncScheduleNoticesForDoctorDate(app, doctorId, date);
}

export async function listAvailabilities(
  app: FastifyInstance,
  doctorId: string,
  q: z.infer<typeof adminResourceListQuerySchema>
) {
  const { skip, take } = skipTake(q);
  const where = { doctorId };
  const [total, rows] = await Promise.all([
    app.prisma.availability.count({ where }),
    app.prisma.availability.findMany({
      where,
      orderBy: { date: "asc" },
      skip,
      take,
    }),
  ]);
  return { page: q.page, pageSize: q.pageSize, total, availabilities: rows };
}

export async function listAppointmentsAdmin(
  app: FastifyInstance,
  q: z.infer<typeof adminAppointmentListSchema>
) {
  const { skip, take } = skipTake(q);
  const where = {
    ...(q.doctorId ? { doctorId: q.doctorId } : {}),
    ...(q.date ? { date: dateOnlyUtc(q.date) } : {}),
    ...(q.status ? { status: q.status } : {}),
  };

  const [total, rows] = await Promise.all([
    app.prisma.appointment.count({ where }),
    app.prisma.appointment.findMany({
      where,
      orderBy: [{ date: "desc" }, { tokenNumber: "asc" }],
      skip,
      take,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            department: { select: { id: true, name: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    appointments: rows.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      doctorName: a.doctor.name,
      departmentId: a.doctor.department.id,
      departmentName: a.doctor.department.name,
      patient: { id: a.user.id, name: a.user.name, email: a.user.email },
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      token: formatTokenDisplay(a.tokenNumber),
    })),
  };
}

export async function createUserAsSuper(app: FastifyInstance, body: z.infer<typeof createStaffUserSchema>) {
  await assertEmailAvailable(app, body.email);
  const passwordHash = await bcrypt.hash(body.password, 10);
  const admin = asAdminRow(
    await adminDb(app.prisma).create({
      data: asAdminCreateInput({
        email: body.email,
        passwordHash,
        name: body.name,
        role: AdminRole.ADMIN,
      }),
    })
  );
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: adminRoleToJwt(admin.role),
    createdAt: admin.createdAt,
  };
}

const PENDING_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.BOOKED,
  AppointmentStatus.WAITING,
  AppointmentStatus.CHECKED_IN,
];

const COMPLETED_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.SKIPPED,
];


export type AdminPatientListRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  createdAt: string;
  displayStatus: string;
  appointmentId: string | null;
  token: string | null;
  scheduledAt: string | null;
  doctorName: string | null;
  departmentName: string | null;
};

function buildPatientSearchWhere(search?: string): Prisma.UserWhereInput | undefined {
  if (!search?.trim()) return undefined;
  const term = search.trim();
  return asUserWhereInput({
    OR: [
      { name: { contains: term, mode: "insensitive" } },
      { email: { contains: term, mode: "insensitive" } },
      { phone: { contains: term, mode: "insensitive" } },
    ],
  });
}

function buildPatientStatusWhere(
  filter: "all" | "pending" | "completed",
  appointmentDate?: Date
): Prisma.UserWhereInput | undefined {
  if (filter === "all") return undefined;

  const apptScope = appointmentDate ? { date: appointmentDate } : {};

  if (filter === "pending") {
    return {
      OR: [
        { appointments: { none: {} } },
        {
          appointments: {
            some: {
              ...apptScope,
              status: { in: PENDING_APPOINTMENT_STATUSES },
            },
          },
        },
      ],
    };
  }

  return {
    appointments: {
      some: {
        ...apptScope,
        status: { in: COMPLETED_APPOINTMENT_STATUSES },
      },
    },
  };
}

function mapUserToPatientRow(
  u: PatientPublicRow,
  latest?: {
    id: string;
    status: AppointmentStatus;
    tokenNumber: number;
    scheduledAt: Date;
    doctor: { name: string; department: { name: string } };
  }
): AdminPatientListRow {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    phone: u.phone,
    role: Role.USER,
    createdAt: u.createdAt.toISOString(),
    displayStatus: latest ? latest.status : "NOT_BOOKED",
    appointmentId: latest?.id ?? null,
    token: latest ? formatTokenDisplay(latest.tokenNumber) : null,
    scheduledAt: latest?.scheduledAt.toISOString() ?? null,
    doctorName: latest?.doctor.name ?? null,
    departmentName: latest?.doctor.department.name ?? null,
  };
}

export async function listPatientsAdmin(
  app: FastifyInstance,
  q: z.infer<typeof adminPatientListQuerySchema>
) {
  const { skip, take } = skipTake(q);
  const searchWhere = buildPatientSearchWhere(q.search);

  if (!q.date) {
    const where: Prisma.UserWhereInput = {
      ...(searchWhere ?? {}),
      ...(buildPatientStatusWhere(q.filter) ?? {}),
    };

    const [total, users] = await Promise.all([
      app.prisma.user.count({ where }),
      app.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          ...asUserSelect(patientListSelect),
          appointments: {
            orderBy: { scheduledAt: "desc" },
            take: 1,
            include: {
              doctor: { select: { name: true, department: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    const patients = users.map((u) =>
      mapUserToPatientRow(asPatientPublicRow(u), u.appointments[0])
    );

    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      date: null,
      filter: q.filter,
      patients,
    };
  }

  const date = dateOnlyUtc(q.date);
  const rows: AdminPatientListRow[] = [];

  const userScope: Prisma.UserWhereInput = {
    ...(searchWhere ?? {}),
  };

  const appointmentWhere: Prisma.AppointmentWhereInput = {
    date,
    user: userScope,
    ...(q.filter === "pending"
      ? { status: { in: PENDING_APPOINTMENT_STATUSES } }
      : q.filter === "completed"
        ? { status: { in: COMPLETED_APPOINTMENT_STATUSES } }
        : {}),
  };

  const appointments = await app.prisma.appointment.findMany({
    where: appointmentWhere,
    orderBy: [{ tokenNumber: "asc" }, { scheduledAt: "asc" }],
    include: {
      user: { select: asUserSelect(patientListSelect) },
      doctor: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  for (const a of appointments) {
    rows.push(
      mapUserToPatientRow(asPatientPublicRow(a.user), {
        id: a.id,
        status: a.status,
        tokenNumber: a.tokenNumber,
        scheduledAt: a.scheduledAt,
        doctor: a.doctor,
      })
    );
  }

  const total = rows.length;
  const patients = rows.slice(skip, skip + take);

  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    date: q.date,
    filter: q.filter,
    patients,
  };
}

export async function listRegisteredPatients(
  app: FastifyInstance,
  q: z.infer<typeof adminUserListQuerySchema>
) {
  const { skip, take } = skipTake(q);
  const [total, users] = await Promise.all([
    app.prisma.user.count(),
    app.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: asUserSelect(patientListSelect),
    }),
  ]);
  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    users: users.map((u) => ({ ...u, role: Role.USER })),
  };
}

export async function listAdminStaff(app: FastifyInstance, q: z.infer<typeof adminUserListQuerySchema>) {
  const { skip, take } = skipTake(q);
  const where = { role: AdminRole.ADMIN };
  const [total, rowsRaw] = await Promise.all([
    adminDb(app.prisma).count({ where }),
    adminDb(app.prisma).findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);
  const rows = rowsRaw as AdminListRow[];
  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    users: rows.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: adminRoleToJwt(a.role),
      createdAt: a.createdAt,
    })),
  };
}

export async function patchUserAsSuper(
  app: FastifyInstance,
  accountId: string,
  body: z.infer<typeof patchSuperUserSchema>
) {
  const adminRaw = await adminDb(app.prisma).findUnique({ where: { id: accountId } });
  if (adminRaw) {
    const existing = asAdminRow(adminRaw);
    if (existing.role === AdminRole.SUPER_ADMIN && body.role !== undefined) {
      throw new AppError(400, "Super admin roles cannot be changed here", "FORBIDDEN");
    }
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.role !== undefined) {
      patch.role = body.role === Role.SUPER_ADMIN ? AdminRole.SUPER_ADMIN : AdminRole.ADMIN;
    }
    const updated = asAdminRow(
      await adminDb(app.prisma).update({
        where: { id: accountId },
        data: asAdminUpdateInput(patch),
      })
    );
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: null,
      role: adminRoleToJwt(updated.role),
      createdAt: updated.createdAt,
    };
  }

  const patient = await app.prisma.user.findUnique({ where: { id: accountId } });
  if (!patient) throw new AppError(404, "User not found", "NOT_FOUND");

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.phone !== undefined) patch.phone = body.phone ?? null;
  const updated = await app.prisma.user.update({
    where: { id: accountId },
    data: asUserUncheckedUpdate(patch),
    select: asUserSelect(patientListSelect),
  });
  return { ...updated, role: Role.USER };
}

export async function deleteUserAsSuper(app: FastifyInstance, accountId: string) {
  const adminRaw = await adminDb(app.prisma).findUnique({ where: { id: accountId } });
  if (adminRaw) {
    const existing = asAdminRow(adminRaw);
    if (existing.role === AdminRole.SUPER_ADMIN) {
      throw new AppError(400, "Super admin users cannot be deleted here", "FORBIDDEN");
    }
    await adminDb(app.prisma).delete({ where: { id: accountId } });
    return { ok: true };
  }

  const patient = await app.prisma.user.findUnique({ where: { id: accountId } });
  if (!patient) throw new AppError(404, "User not found", "NOT_FOUND");

  await app.prisma.user.delete({ where: { id: accountId } });
  return { ok: true };
}
