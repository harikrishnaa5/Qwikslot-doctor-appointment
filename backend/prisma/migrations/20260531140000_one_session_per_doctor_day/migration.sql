-- Merge duplicate DoctorSession rows (same doctor + date) before enforcing one session per day.
DO $$
DECLARE
  grp RECORD;
  keeper_id TEXT;
  other_id TEXT;
  base_token INT;
BEGIN
  FOR grp IN
    SELECT "doctorId", "date"
    FROM "DoctorSession"
    GROUP BY "doctorId", "date"
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO keeper_id
    FROM "DoctorSession"
    WHERE "doctorId" = grp."doctorId" AND "date" = grp."date"
    ORDER BY "tokenCounter" DESC, "currentToken" DESC, "createdAt" ASC
    LIMIT 1;

    FOR other_id IN
      SELECT id FROM "DoctorSession"
      WHERE "doctorId" = grp."doctorId" AND "date" = grp."date" AND id <> keeper_id
    LOOP
      SELECT COALESCE(MAX("tokenNumber"), 0) INTO base_token
      FROM "Appointment"
      WHERE "sessionId" = keeper_id;

      UPDATE "Appointment" a
      SET
        "sessionId" = keeper_id,
        "tokenNumber" = base_token + sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "tokenNumber" ASC) AS rn
        FROM "Appointment"
        WHERE "sessionId" = other_id
      ) sub
      WHERE a.id = sub.id;

      UPDATE "DoctorSession" ds
      SET
        "tokenCounter" = GREATEST(
          ds."tokenCounter",
          (SELECT COALESCE(MAX("tokenNumber"), 0) FROM "Appointment" WHERE "sessionId" = keeper_id)
        ),
        "currentToken" = GREATEST(ds."currentToken", o."currentToken"),
        "openedAt" = COALESCE(ds."openedAt", o."openedAt"),
        "closedAt" = CASE
          WHEN ds."status" = 'CLOSED' OR o."status" = 'CLOSED' THEN COALESCE(ds."closedAt", o."closedAt")
          ELSE ds."closedAt"
        END,
        "status" = CASE
          WHEN ds."status" = 'OPEN' OR o."status" = 'OPEN' THEN 'OPEN'::"SessionStatus"
          WHEN ds."status" = 'PAUSED' OR o."status" = 'PAUSED' THEN 'PAUSED'::"SessionStatus"
          WHEN ds."status" = 'CLOSED' OR o."status" = 'CLOSED' THEN 'CLOSED'::"SessionStatus"
          ELSE ds."status"
        END
      FROM "DoctorSession" o
      WHERE ds.id = keeper_id AND o.id = other_id;

      DELETE FROM "DoctorSession" WHERE id = other_id;
    END LOOP;
  END LOOP;
END $$;

-- Drop per-availability session link (multiple availability blocks share one session).
DROP INDEX IF EXISTS "DoctorSession_availabilityId_key";
ALTER TABLE "DoctorSession" DROP COLUMN IF EXISTS "availabilityId";

-- One queue session per doctor per calendar day.
DROP INDEX IF EXISTS "DoctorSession_doctorId_date_startTime_endTime_key";
CREATE UNIQUE INDEX "DoctorSession_doctorId_date_key" ON "DoctorSession"("doctorId", "date");
