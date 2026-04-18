CREATE TABLE "PackageCheckJob" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "expectedVersion" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 10,
  "lastError" TEXT NOT NULL DEFAULT '',
  "sandboxId" TEXT NOT NULL DEFAULT '',
  "startedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "readyAt" TIMESTAMP(3),
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PackageCheckJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PackageCheckJob_profileId_status_idx" ON "PackageCheckJob"("profileId", "status");
CREATE INDEX "PackageCheckJob_status_expiresAt_idx" ON "PackageCheckJob"("status", "expiresAt");

ALTER TABLE "PackageCheckJob"
ADD CONSTRAINT "PackageCheckJob_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
