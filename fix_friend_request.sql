-- 1. Remove all corrupted rows
DELETE FROM "FriendRequest";

-- 2. Drop broken enum
DROP TYPE IF EXISTS "FriendRequestStatus";

-- 3. Recreate enum correctly
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- 4. Fix column type
ALTER TABLE "FriendRequest"
ALTER COLUMN "status"
TYPE "FriendRequestStatus"
USING "status"::text::"FriendRequestStatus";

-- 5. Set default
ALTER TABLE "FriendRequest"
ALTER COLUMN "status"
SET DEFAULT 'PENDING';
