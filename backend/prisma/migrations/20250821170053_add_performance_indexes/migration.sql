-- CreateIndex
-- Composite index on Ticket(status, priority) for efficient filtering by status and priority
CREATE INDEX "Ticket_status_priority_idx" ON "Ticket"("status", "priority");

-- CreateIndex
-- Composite index on Ticket(assignedToId, status) for efficient queries on assigned tickets by status
CREATE INDEX "Ticket_assignedToId_status_idx" ON "Ticket"("assignedToId", "status");

-- CreateIndex  
-- Composite index on Ticket(categoryId, status) for efficient category-based ticket filtering
CREATE INDEX "Ticket_categoryId_status_idx" ON "Ticket"("categoryId", "status");

-- CreateIndex
-- Index on Ticket(createdAt) for date range queries and sorting by creation date
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
-- Composite index on Notification(userId, read, createdAt) for efficient notification queries
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- CreateIndex
-- Composite index on AIAssistantInteraction(createdAt, userId) for efficient time-based queries with user filtering
CREATE INDEX "AIAssistantInteraction_createdAt_userId_idx" ON "AIAssistantInteraction"("createdAt", "userId");