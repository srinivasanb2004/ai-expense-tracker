ALTER TABLE "Notification" ADD COLUMN "cleared" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Notification_userId_cleared_read_idx" ON "Notification"("userId", "cleared", "read");
