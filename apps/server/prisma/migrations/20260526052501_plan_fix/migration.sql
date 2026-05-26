-- CreateIndex
CREATE INDEX "AuditLog_targetType_createdAt_idx" ON "AuditLog"("targetType", "createdAt");

-- CreateIndex
CREATE INDEX "OtpCode_phone_idx" ON "OtpCode"("phone");

-- CreateIndex
CREATE INDEX "OtpCode_userId_used_idx" ON "OtpCode"("userId", "used");

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");

-- CreateIndex
CREATE INDEX "User_isBlocked_idx" ON "User"("isBlocked");

-- CreateIndex
CREATE INDEX "VodContent_type_createdAt_idx" ON "VodContent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "VodContent_title_idx" ON "VodContent"("title");

-- CreateIndex
CREATE INDEX "VodContent_genre_idx" ON "VodContent"("genre");
