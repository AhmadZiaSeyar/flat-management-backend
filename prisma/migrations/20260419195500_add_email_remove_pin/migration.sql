ALTER TABLE "users"
  ADD COLUMN "email" TEXT;

ALTER TABLE "users"
  DROP CONSTRAINT "users_login_identifier_check";

ALTER TABLE "users"
  ADD CONSTRAINT "users_login_identifier_check"
  CHECK ("username" IS NOT NULL OR "phone" IS NOT NULL OR "email" IS NOT NULL);

ALTER TABLE "users"
  DROP COLUMN "pin_hash";

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
