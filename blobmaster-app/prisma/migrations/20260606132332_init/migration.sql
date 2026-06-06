-- CreateTable
CREATE TABLE "TelemetryLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL
);
