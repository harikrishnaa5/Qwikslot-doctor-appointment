-- Split User into patients-only User, Doctor credentials, and Admin table.

CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- Doctor login fields (copy from linked User rows first)
ALTER TABLE "Doctor" ADD COLUMN "email" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "passwordHash" TEXT;

UPDATE "Doctor" d
SET
  "email" = u."email",
  "passwordHash" = u."passwordHash"
FROM "User" u
WHERE d."userId" = u."id";

-- Admins from former User rows
INSERT INTO "Admin" ("id", "email", "passwordHash", "name", "role", "createdAt", "updatedAt")
SELECT
  u."id",
  u."email",
  u."passwordHash",
  u."name",
  CASE u."role"::text
    WHEN 'SUPER_ADMIN' THEN 'SUPER_ADMIN'::"AdminRole"
    ELSE 'ADMIN'::"AdminRole"
  END,
  u."createdAt",
  u."updatedAt"
FROM "User" u
WHERE u."role" IN ('ADMIN', 'SUPER_ADMIN');

-- RefreshToken: polymorphic account FKs
ALTER TABLE "RefreshToken" ADD COLUMN "patientId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "doctorId" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "adminId" TEXT;

UPDATE "RefreshToken" rt
SET "patientId" = rt."userId"
FROM "User" u
WHERE rt."userId" = u."id" AND u."role" = 'USER';

UPDATE "RefreshToken" rt
SET "doctorId" = d."id"
FROM "User" u
JOIN "Doctor" d ON d."userId" = u."id"
WHERE rt."userId" = u."id" AND u."role" = 'DOCTOR';

UPDATE "RefreshToken" rt
SET "adminId" = a."id"
FROM "User" u
JOIN "Admin" a ON a."id" = u."id"
WHERE rt."userId" = u."id" AND u."role" IN ('ADMIN', 'SUPER_ADMIN');

ALTER TABLE "RefreshToken" DROP CONSTRAINT IF EXISTS "RefreshToken_userId_fkey";
DROP INDEX IF EXISTS "RefreshToken_userId_idx";
ALTER TABLE "RefreshToken" DROP COLUMN "userId";

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "RefreshToken_patientId_idx" ON "RefreshToken"("patientId");
CREATE INDEX "RefreshToken_doctorId_idx" ON "RefreshToken"("doctorId");
CREATE INDEX "RefreshToken_adminId_idx" ON "RefreshToken"("adminId");

-- Remove non-patient users
DELETE FROM "User" WHERE "role" IN ('DOCTOR', 'ADMIN', 'SUPER_ADMIN');

ALTER TABLE "User" DROP COLUMN "role";
DROP INDEX IF EXISTS "User_role_idx";

ALTER TABLE "Doctor" DROP CONSTRAINT IF EXISTS "Doctor_userId_fkey";
DROP INDEX IF EXISTS "Doctor_userId_key";
ALTER TABLE "Doctor" DROP COLUMN "userId";

ALTER TABLE "Doctor" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "passwordHash" SET NOT NULL;
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");
