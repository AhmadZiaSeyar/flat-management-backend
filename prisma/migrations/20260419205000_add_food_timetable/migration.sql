CREATE TABLE "food_timetable_days" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "day_of_week" INTEGER NOT NULL,
  "breakfast" TEXT,
  "lunch" TEXT,
  "dinner" TEXT,
  "note" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by_id" UUID,
  CONSTRAINT "food_timetable_days_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "food_timetable_days_day_of_week_check" CHECK ("day_of_week" BETWEEN 1 AND 7)
);

CREATE UNIQUE INDEX "food_timetable_days_day_of_week_key" ON "food_timetable_days"("day_of_week");
CREATE INDEX "food_timetable_days_updated_by_id_idx" ON "food_timetable_days"("updated_by_id");

ALTER TABLE "food_timetable_days"
  ADD CONSTRAINT "food_timetable_days_updated_by_id_fkey"
  FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
