-- Backfill role: existing admins become ADMIN, everyone else stays USER
UPDATE "users"
SET "role" = 'ADMIN'
WHERE "isAdmin" = true;

-- Backfill plan: admins get PRO_PLUS, existing pro users get PRO
UPDATE "users"
SET "plan" = 'PRO_PLUS'
WHERE "isAdmin" = true;

UPDATE "users"
SET "plan" = 'PRO'
WHERE "isAdmin" = false AND "aiProEnabled" = true;