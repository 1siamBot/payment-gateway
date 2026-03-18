-- CreateTable
CREATE TABLE "SettlementException" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "windowDate" DATETIME NOT NULL,
    "ledgerTotal" DECIMAL NOT NULL,
    "providerTotal" DECIMAL NOT NULL,
    "deltaAmount" DECIMAL NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedReason" TEXT NOT NULL,
    "openedNote" TEXT,
    "latestOperatorReason" TEXT,
    "latestOperatorNote" TEXT,
    "resolutionActor" TEXT,
    "resolutionAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SettlementException_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SettlementExceptionAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "settlementExceptionId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementExceptionAudit_settlementExceptionId_fkey" FOREIGN KEY ("settlementExceptionId") REFERENCES "SettlementException" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SettlementException_fingerprint_key" ON "SettlementException"("fingerprint");

-- CreateIndex
CREATE INDEX "SettlementException_merchantId_providerName_status_windowDate_idx" ON "SettlementException"("merchantId", "providerName", "status", "windowDate");

-- CreateIndex
CREATE INDEX "SettlementException_status_updatedAt_idx" ON "SettlementException"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SettlementExceptionAudit_settlementExceptionId_createdAt_idx" ON "SettlementExceptionAudit"("settlementExceptionId", "createdAt");
