WITH permission_row AS (
  INSERT INTO "permissions" ("key", "description")
  VALUES ('clear_expenses', 'Clear all expenses')
  ON CONFLICT ("key") DO UPDATE
    SET "description" = EXCLUDED."description",
        "updated_at" = CURRENT_TIMESTAMP
  RETURNING "id"
)
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT "roles"."id", "permission_row"."id"
FROM "roles"
CROSS JOIN "permission_row"
WHERE "roles"."name" = 'Admin'
ON CONFLICT DO NOTHING;
