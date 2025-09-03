-- Script to enable the modern ticket generator
-- Run this with: psql -h localhost -p 5434 -U admin -d esedu_tiketti_db -f enable-modern-generator.sql

UPDATE "AISettings" 
SET "ticketGeneratorVersion" = 'modern'
WHERE id = (SELECT id FROM "AISettings" LIMIT 1);

-- Verify the change
SELECT 
    "ticketGeneratorVersion",
    "chatAgentVersion"
FROM "AISettings";