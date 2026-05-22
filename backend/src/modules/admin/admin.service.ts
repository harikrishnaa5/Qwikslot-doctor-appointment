import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { AppointmentStatus, Role } from "@prisma/client";
import { DOCTOR_ROLE } from "../../lib/roles.js";
import bcrypt from "bcrypt";
import { AppError } from "../../lib/errors.js";
import { skipTake } from "../../lib/pagination.js";
import { syncScheduleNoticesForDoctorDate } from "../../lib/schedule-notices.js";
import { dateOnlyUtc, localDateTime, toDateOnlyIsoFromDbDate } from "../../lib/time.js";
import { formatTokenDisplay } from "../../lib/tokens.js";
import { ensureSessionForAvailability } from "../queue/session.service.js";
import type {
  adminAppointmentListSchema,
  adminResourceListQuerySchema,
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
        user: { select: { id: true, email: true } },
      },
    }),
  ]);
  return { page: q.page, pageSize: q.pageSize, total, doctors: rows };
}

export async function createDoctor(app: FastifyInstance, body: z.infer<typeof createDoctorSchema>) {
  const dept = await app.prisma.department.findUnique({ where: { id: body.departmentId } });
  if (!dept) throw new AppError(400, "Invalid department", "INVALID_DEPARTMENT");

  const existingUser = await app.prisma.user.findUnique({ where: { email: body.email } });
  if (existingUser) throw new AppError(409, "Email already registered", "EMAIL_TAKEN");

  const passwordHash = await bcrypt.hash(body.password, 10);
  const imageUrl = body.imageUrl && body.imageUrl.length > 0 ? body.imageUrl : null;
  const experience = body.experience && body.experience.length > 0 ? body.experience : null;
  const qualification =
    body.qualification && body.qualification.length > 0 ? body.qualification : null;

  return app.prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        role: DOCTOR_ROLE,
      },
    });
    return tx.doctor.create({
      data: {
        departmentId: body.departmentId,
        name: body.name,
        specialization: body.specialization ?? null,
        experience,
        qualification,
        imageUrl,
        userId: user.id,
        active: body.active ?? true,
      },
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    });
  });
}

export async function updateDoctor(
  app: FastifyInstance,
  id: string,
  body: z.infer<typeof updateDoctorSchema>
) {
  const existing = await app.prisma.doctor.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true } } },
  });
  if (!existing) throw new AppError(404, "Doctor not found", "NOT_FOUND");

  const { email, password, imageUrl, experience, qualification, name, departmentId, specialization, active } =
    body;

  if (email) {
    const emailOwner = await app.prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== existing.userId) {
      throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
    }
  }

  if ((email || password) && !existing.userId) {
    if (!email || !password) {
      throw new AppError(
        400,
        "Email and password are both required to create a login for this doctor",
        "LOGIN_REQUIRED"
      );
    }
  }

  if (departmentId) {
    const dept = await app.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new AppError(400, "Invalid department", "INVALID_DEPARTMENT");
  }

  try {
    return await app.prisma.$transaction(async (tx) => {
      let linkedUserId = existing.userId;

      if (!linkedUserId && email && password) {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            name: name ?? existing.name,
            role: DOCTOR_ROLE,
          },
        });
        linkedUserId = user.id;
      } else if (linkedUserId) {
        const userData: Prisma.UserUpdateInput = {};
        if (email) userData.email = email;
        if (password) userData.passwordHash = await bcrypt.hash(password, 10);
        if (name) userData.name = name;
        if (Object.keys(userData).length > 0) {
          await tx.user.update({ where: { id: linkedUserId }, data: userData });
        }
      }

      const data: Prisma.DoctorUpdateInput = {};
      if (departmentId !== undefined) data.department = { connect: { id: departmentId } };
      if (name !== undefined) data.name = name;
      if (specialization !== undefined) data.specialization = specialization;
      if (active !== undefined) data.active = active;
      if (imageUrl !== undefined) data.imageUrl = imageUrl.length > 0 ? imageUrl : null;
      if (experience !== undefined) data.experience = experience.length > 0 ? experience : null;
      if (qualification !== undefined) {
        data.qualification = qualification.length > 0 ? qualification : null;
      }
      if (linkedUserId && linkedUserId !== existing.userId) {
        data.user = { connect: { id: linkedUserId } };
      }

      return tx.doctor.update({
        where: { id },
        data,
        include: {
          department: { select: { id: true, name: true } },
          user: { select: { id: true, email: true } },
        },
      });
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

  const updated = await app.prisma.availability.update({
    where: { id },
    data: { startTime, endTime },
  });
  await syncScheduleNoticesForDoctorDate(app, row.doctorId, row.date);
  return updated;
}

export async function deleteAvailability(app: FastifyInstance, id: string) {
  const row = await app.prisma.availability.findUnique({ where: { id } });
  if (!row) throw new AppError(404, "Availability not found", "NOT_FOUND");
  const { doctorId, date } = row;
  await app.prisma.availability.delete({ where: { id } });
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
  const existing = await app.prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
  const passwordHash = await bcrypt.hash(body.password, 10);
  return app.prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      name: body.name,
      role: body.role,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function listRegisteredPatients(
  app: FastifyInstance,
  q: z.infer<typeof adminUserListQuerySchema>
) {
  const { skip, take } = skipTake(q);
  const where = { role: Role.USER };
  const [total, users] = await Promise.all([
    app.prisma.user.count({ where }),
    app.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);
  return { page: q.page, pageSize: q.pageSize, total, users };
}

export async function listAdminStaff(app: FastifyInstance, q: z.infer<typeof adminUserListQuerySchema>) {
  const { skip, take } = skipTake(q);
  const where = { role: Role.ADMIN };
  const [total, users] = await Promise.all([
    app.prisma.user.count({ where }),
    app.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);
  return { page: q.page, pageSize: q.pageSize, total, users };
}

export async function patchUserAsSuper(
  app: FastifyInstance,
  userId: string,
  body: z.infer<typeof patchSuperUserSchema>
) {
  const existing = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new AppError(404, "User not found", "NOT_FOUND");
  if (existing.role === Role.SUPER_ADMIN && body.role !== undefined) {
    throw new AppError(400, "Super admin roles cannot be changed here", "FORBIDDEN");
  }
  try {
    return await app.prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  } catch {
    throw new AppError(404, "User not found", "NOT_FOUND");
  }
}

export async function deleteUserAsSuper(app: FastifyInstance, userId: string) {
  const existing = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw new AppError(404, "User not found", "NOT_FOUND");
  if (existing.role === Role.SUPER_ADMIN) {
    throw new AppError(400, "Super admin users cannot be deleted here", "FORBIDDEN");
  }

  await app.prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
