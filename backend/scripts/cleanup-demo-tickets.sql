-- Poistaa seedin luomat demotiketit ja niihin liittyvän datan.
--
-- TAUSTA: prisma/seed.ts loi demotiketit create-kutsulla, ja docker-compose.yml
-- ajoi seedin joka käynnistyksellä. Tuotantoon kertyi siksi kopio demotiketeistä
-- jokaisen kontin uudelleenkäynnistyksen yhteydessä. Molemmat syyt on korjattu,
-- mutta aiemmin syntynyt data pitää siivota erikseen.
--
-- KÄYTTÖ (ota varmuuskopio ensin):
--   docker compose exec -T postgres pg_dump -U admin -d esedu_tiketti_db | gzip > ~/ennen-siivousta.sql.gz
--   docker compose exec -T postgres psql -U admin -d esedu_tiketti_db -f - < scripts/cleanup-demo-tickets.sql
--
-- Skripti ajetaan yhtenä transaktiona: joko kaikki poistuu tai ei mikään.
-- Tulosteessa näkyy rivimäärät ennen ja jälkeen.

\echo '--- Poistettavat tiketit ---'
SELECT title, count(*) AS kpl
FROM "Ticket"
WHERE title IN ('Esimerkki tiketti 1', 'Esimerkki tiketti 2')
GROUP BY title;

BEGIN;

-- Kerätään poistettavat tiketit väliaikaiseen tauluun
CREATE TEMP TABLE demo_tickets ON COMMIT DROP AS
SELECT id FROM "Ticket"
WHERE title IN ('Esimerkki tiketti 1', 'Esimerkki tiketti 2');

-- Riippuvuudet ensin: viiteavaimissa ei ole ON DELETE CASCADE -sääntöä,
-- joten tiketin poisto kaatuisi muuten viiteavainvirheeseen.
DELETE FROM "Comment"                       WHERE "ticketId" IN (SELECT id FROM demo_tickets);
DELETE FROM "Attachment"                    WHERE "ticketId" IN (SELECT id FROM demo_tickets);
DELETE FROM "SupportAssistantConversation"  WHERE "ticketId" IN (SELECT id FROM demo_tickets);
DELETE FROM "Notification"                  WHERE "ticketId" IN (SELECT id FROM demo_tickets);
DELETE FROM "AIAssistantInteraction"        WHERE "ticketId" IN (SELECT id FROM demo_tickets);
DELETE FROM "AITokenUsage"                  WHERE "ticketId" IN (SELECT id FROM demo_tickets);

DELETE FROM "Ticket" WHERE id IN (SELECT id FROM demo_tickets);

COMMIT;

\echo '--- Jäljellä (pitäisi olla tyhjä) ---'
SELECT title, count(*) AS kpl
FROM "Ticket"
WHERE title IN ('Esimerkki tiketti 1', 'Esimerkki tiketti 2')
GROUP BY title;

\echo '--- Tikettejä yhteensä ---'
SELECT count(*) AS tiketteja FROM "Ticket";
