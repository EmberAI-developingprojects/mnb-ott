-- CreateIndex
CREATE INDEX "Channel_isActive_kind_orderIndex_idx" ON "Channel"("isActive", "kind", "orderIndex");

-- CreateIndex
CREATE INDEX "Purchase_userId_status_expiresAt_idx" ON "Purchase"("userId", "status", "expiresAt");
