import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "super@clinic.test" },
    update: {},
    create: {
      email: "super@clinic.test",
      passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@clinic.test" },
    update: {},
    create: {
      email: "admin@clinic.test",
      passwordHash,
      name: "Clinic Admin",
      role: "ADMIN",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "patient@clinic.test" },
    update: {},
    create: {
      email: "patient@clinic.test",
      passwordHash,
      name: "Test Patient",
      role: "USER",
    },
  });

  const cardio = await prisma.department.upsert({
    where: { id: "seed-dept-cardio" },
    update: {},
    create: {
      id: "seed-dept-cardio",
      name: "Cardiology",
      description: "Heart and vascular care",
    },
  });

  const general = await prisma.department.upsert({
    where: { id: "seed-dept-general" },
    update: {},
    create: {
      id: "seed-dept-general",
      name: "General Medicine",
      description: "Primary care consultations",
    },
  });

  const drSmith = await prisma.doctor.upsert({
    where: { id: "seed-doc-smith" },
    update: {
      imageUrl:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80",
      experience: "18 years in cardiovascular care",
      qualification: "MD, FACC — Board-certified cardiologist",
    },
    create: {
      id: "seed-doc-smith",
      departmentId: cardio.id,
      name: "Dr. Smith",
      specialization: "Cardiologist",
      experience: "18 years in cardiovascular care",
      qualification: "MD, FACC — Board-certified cardiologist",
      imageUrl:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80",
      active: true,
    },
  });

  const drJones = await prisma.doctor.upsert({
    where: { id: "seed-doc-jones" },
    update: {
      imageUrl:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&q=80",
      experience: "12 years general practice",
      qualification: "MBBS, MRCGP",
    },
    create: {
      id: "seed-doc-jones",
      departmentId: general.id,
      name: "Dr. Jones",
      specialization: "GP",
      experience: "12 years general practice",
      qualification: "MBBS, MRCGP",
      imageUrl:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&q=80",
      active: true,
    },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  await prisma.availability.deleteMany({
    where: { doctorId: { in: [drSmith.id, drJones.id] } },
  });

  await prisma.availability.createMany({
    data: [
      {
        doctorId: drSmith.id,
        date: today,
        startTime: "09:00",
        endTime: "12:00",
      },
      {
        doctorId: drSmith.id,
        date: tomorrow,
        startTime: "10:00",
        endTime: "14:00",
      },
      {
        doctorId: drJones.id,
        date: today,
        startTime: "08:00",
        endTime: "16:00",
      },
    ],
  });

  await prisma.appointment.deleteMany({
    where: { userId: user.id },
  });

  const slot = new Date(today);
  slot.setUTCHours(10, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      doctorId: drJones.id,
      userId: user.id,
      scheduledAt: slot,
      date: today,
      tokenNumber: 1,
      status: "WAITING",
      paymentRef: "mock-seed-1",
    },
  });

  console.log("Seed OK:", { superAdmin: superAdmin.email, admin: admin.email, user: user.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
