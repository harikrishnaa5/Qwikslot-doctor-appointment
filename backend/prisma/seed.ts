import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { DOCTOR_ROLE } from "../src/lib/roles.js";

const prisma = new PrismaClient();

const DEPARTMENT_SEEDS = [
  { id: "seed-dept-cardio", name: "Cardiology", description: "Heart and vascular care" },
  { id: "seed-dept-general", name: "General Medicine", description: "Primary care consultations" },
  { id: "seed-dept-peds", name: "Pediatrics", description: "Child health and development" },
  { id: "seed-dept-ortho", name: "Orthopedics", description: "Bones, joints, and sports injuries" },
  { id: "seed-dept-derm", name: "Dermatology", description: "Skin, hair, and nail conditions" },
  { id: "seed-dept-ent", name: "ENT", description: "Ear, nose, and throat care" },
  { id: "seed-dept-neuro", name: "Neurology", description: "Brain and nervous system disorders" },
] as const;

/** Removes typo/legacy departments (e.g. admin-created "Dermetology"). */
async function pruneLegacyDepartments(prisma: PrismaClient) {
  const keepIds = DEPARTMENT_SEEDS.map((s) => s.id);
  const keepNames = DEPARTMENT_SEEDS.map((s) => s.name);

  await prisma.department.deleteMany({
    where: {
      OR: [
        { name: "Dermetology" },
        { description: "Skin care" },
        {
          AND: [{ id: { notIn: keepIds } }, { name: { notIn: keepNames } }],
        },
      ],
    },
  });
}

/** One row per specialty name — removes legacy duplicates from earlier seeds. */
async function upsertSeedDepartment(
  prisma: PrismaClient,
  seed: (typeof DEPARTMENT_SEEDS)[number]
) {
  await prisma.department.deleteMany({
    where: { name: seed.name, id: { not: seed.id } },
  });
  return prisma.department.upsert({
    where: { id: seed.id },
    update: { name: seed.name, description: seed.description },
    create: { id: seed.id, name: seed.name, description: seed.description },
  });
}

async function upsertDoctorUser(
  email: string,
  name: string,
  passwordHash: string,
  doctorId: string,
  departmentId: string,
  doctorData: {
    name: string;
    specialization: string;
    experience: string;
    qualification: string;
    imageUrl: string;
  }
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: DOCTOR_ROLE },
    create: { email, passwordHash, name, role: DOCTOR_ROLE },
  });
  return prisma.doctor.upsert({
    where: { id: doctorId },
    update: { ...doctorData, userId: user.id, departmentId, active: true },
    create: {
      id: doctorId,
      departmentId,
      userId: user.id,
      ...doctorData,
      active: true,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "super@clinic.test" },
    update: {},
    create: {
      email: "super@clinic.test",
      passwordHash,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@clinic.test" },
    update: {},
    create: {
      email: "admin@clinic.test",
      passwordHash,
      name: "Clinic Admin",
      role: Role.ADMIN,
    },
  });

  const patient = await prisma.user.upsert({
    where: { email: "patient@clinic.test" },
    update: {},
    create: {
      email: "patient@clinic.test",
      passwordHash,
      name: "Test Patient",
      role: Role.USER,
    },
  });

  await pruneLegacyDepartments(prisma);
  const departments = await Promise.all(
    DEPARTMENT_SEEDS.map((seed) => upsertSeedDepartment(prisma, seed))
  );

  const [cardio, general, peds, ortho, derm, ent, neuro] = departments;

  const doctors = await Promise.all([
    upsertDoctorUser(
      "dr.smith@clinic.test",
      "Dr. Smith",
      passwordHash,
      "seed-doc-smith",
      cardio.id,
      {
        name: "Dr. Smith",
        specialization: "Cardiologist",
        experience: "18 years in cardiovascular care",
        qualification: "MD, FACC — Board-certified cardiologist",
        imageUrl:
          "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80",
      }
    ),
    upsertDoctorUser(
      "dr.jones@clinic.test",
      "Dr. Jones",
      passwordHash,
      "seed-doc-jones",
      general.id,
      {
        name: "Dr. Jones",
        specialization: "GP",
        experience: "12 years general practice",
        qualification: "MBBS, MRCGP",
        imageUrl:
          "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&q=80",
      }
    ),
    upsertDoctorUser(
      "dr.patel@clinic.test",
      "Dr. Patel",
      passwordHash,
      "seed-doc-patel",
      peds.id,
      {
        name: "Dr. Patel",
        specialization: "Pediatrician",
        experience: "10 years in pediatric care",
        qualification: "MD, DCH",
        imageUrl:
          "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&q=80",
      }
    ),
    upsertDoctorUser(
      "dr.kumar@clinic.test",
      "Dr. Kumar",
      passwordHash,
      "seed-doc-kumar",
      ortho.id,
      {
        name: "Dr. Kumar",
        specialization: "Orthopedic surgeon",
        experience: "15 years in joint and spine surgery",
        qualification: "MS Orthopedics",
        imageUrl:
          "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop&q=80",
      }
    ),
    upsertDoctorUser(
      "dr.lee@clinic.test",
      "Dr. Lee",
      passwordHash,
      "seed-doc-lee",
      derm.id,
      {
        name: "Dr. Lee",
        specialization: "Dermatologist",
        experience: "9 years clinical dermatology",
        qualification: "MD, FAAD",
        imageUrl:
          "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&q=80",
      }
    ),
    upsertDoctorUser(
      "dr.nguyen@clinic.test",
      "Dr. Nguyen",
      passwordHash,
      "seed-doc-nguyen",
      ent.id,
      {
        name: "Dr. Nguyen",
        specialization: "ENT specialist",
        experience: "11 years otolaryngology",
        qualification: "MD, FRCS (ORL-HNS)",
        imageUrl:
          "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop&q=80",
      }
    ),
    upsertDoctorUser(
      "dr.brown@clinic.test",
      "Dr. Brown",
      passwordHash,
      "seed-doc-brown",
      neuro.id,
      {
        name: "Dr. Brown",
        specialization: "Neurologist",
        experience: "14 years neurology practice",
        qualification: "MD, PhD — Movement disorders",
        imageUrl:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80",
      }
    ),
  ]);

  const [drSmith, drJones, drPatel, drKumar, drLee, drNguyen, drBrown] = doctors;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const allDoctorIds = doctors.map((d) => d.id);
  await prisma.availability.deleteMany({ where: { doctorId: { in: allDoctorIds } } });

  await prisma.availability.createMany({
    data: [
      { doctorId: drSmith.id, date: today, startTime: "09:00", endTime: "12:00" },
      { doctorId: drSmith.id, date: tomorrow, startTime: "10:00", endTime: "14:00" },
      { doctorId: drJones.id, date: today, startTime: "08:00", endTime: "16:00" },
      { doctorId: drPatel.id, date: today, startTime: "09:00", endTime: "13:00" },
      { doctorId: drKumar.id, date: today, startTime: "10:00", endTime: "15:00" },
      { doctorId: drLee.id, date: today, startTime: "11:00", endTime: "17:00" },
      { doctorId: drNguyen.id, date: today, startTime: "08:30", endTime: "12:30" },
      { doctorId: drBrown.id, date: today, startTime: "09:30", endTime: "14:30" },
    ],
  });

  await prisma.appointment.deleteMany({ where: { userId: patient.id } });

  const slot = (hours: number, minutes: number) => {
    const d = new Date(today);
    d.setUTCHours(hours, minutes, 0, 0);
    return d;
  };

  await prisma.appointment.createMany({
    data: [
      {
        doctorId: drJones.id,
        userId: patient.id,
        scheduledAt: slot(10, 0),
        date: today,
        tokenNumber: 1,
        status: "WAITING",
        paymentRef: "mock-seed-1",
      },
      {
        doctorId: drSmith.id,
        userId: patient.id,
        scheduledAt: slot(10, 30),
        date: today,
        tokenNumber: 1,
        status: "CHECKED_IN",
        paymentRef: "mock-seed-2",
      },
      {
        doctorId: drPatel.id,
        userId: patient.id,
        scheduledAt: slot(11, 0),
        date: today,
        tokenNumber: 1,
        status: "WAITING",
        paymentRef: "mock-seed-3",
      },
      {
        doctorId: drKumar.id,
        userId: patient.id,
        scheduledAt: slot(14, 0),
        date: today,
        tokenNumber: 1,
        status: "WAITING",
        paymentRef: "mock-seed-4",
      },
    ],
  });

  console.log("Seed OK");
  console.log("  Patient: patient@clinic.test / password123");
  console.log("  Admin: admin@clinic.test / password123");
  console.log("  Doctors: dr.smith@clinic.test, dr.jones@clinic.test, dr.patel@clinic.test,");
  console.log("           dr.kumar@clinic.test, dr.lee@clinic.test, dr.nguyen@clinic.test,");
  console.log("           dr.brown@clinic.test — password123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
