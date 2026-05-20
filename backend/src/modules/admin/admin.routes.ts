import type { FastifyPluginAsync } from "fastify";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRoles } from "../../middleware/require-roles.js";
import * as controller from "./admin.controller.js";

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  await app.register(async (r) => {
    r.addHook("preHandler", requireRoles(Role.ADMIN, Role.SUPER_ADMIN));

    r.get("/departments", controller.listDepartments);
    r.post("/departments", controller.createDepartment);
    r.patch("/departments/:id", controller.updateDepartment);
    r.delete("/departments/:id", controller.deleteDepartment);

    r.get("/doctors", controller.listDoctors);
    r.post("/uploads/doctor-photo", controller.uploadDoctorPhoto);
    r.post("/doctors", controller.createDoctor);
    r.patch("/doctors/:id", controller.updateDoctor);
    r.delete("/doctors/:id", controller.deleteDoctor);

    r.get("/users", controller.listRegisteredUsers);

    r.post("/availability", controller.setAvailability);
    r.patch("/availability/:id", controller.patchAvailability);
    r.delete("/availability/:id", controller.deleteAvailability);
    r.get("/doctors/:doctorId/availability", controller.listAvailability);

    r.get("/appointments", controller.listAppointments);
    r.patch("/appointments/:id/status", controller.patchAppointmentStatus);
    r.post("/doctors/:doctorId/queue/next", controller.advanceQueue);
  });

  await app.register(
    async (r) => {
      r.addHook("preHandler", requireRoles(Role.SUPER_ADMIN));
      r.get("/admins", controller.listSuperAdmins);
      r.post("/users", controller.createUser);
      r.patch("/users/:id", controller.patchSuperUser);
      r.delete("/users/:id", controller.deleteSuperUser);
    },
    { prefix: "/super" }
  );
};

export default adminRoutes;
