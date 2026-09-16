# Changelog

## 2026-09-16 - Todennuksen korjaus (kriittinen)

### Security
- **Tokenin allekirjoitusta ei tarkistettu lainkaan.** `authMiddleware` käytti `jwt.decode`-kutsua eikä `jwt.verify`-kutsua (commit `07efc46` poisti JWKS-tarkistuksen 3.9.2025). Koska `roleMiddleware` hakee roolin pelkän sähköpostin perusteella, kuka tahansa pystyi luomaan itse tokenin pääkäyttäjän sähköpostilla ja saamaan täydet oikeudet.
- **`optionalAuthMiddleware` asetti `req.user`-kentän tarkistamattomasta tokenista** ennen reittikohtaista todennusta. Tunniste siirretty kenttään `req.rateLimitIdentity`, jota käytetään vain rate limit -avaimena.
- **`POST /api/auth/login` oli täysin avoin** ja loi käyttäjätilin request bodyn perusteella. Reitti vaatii nyt tarkistetun tokenin, ja sähköposti ja nimi luetaan tokenista.
- **WebSocket-yhteydet hyväksyttiin tarkistamattomalla tokenilla** (`socketService`). Nyt sama tarkistus kuin HTTP-pyynnöissä.

### Juurisyy alkuperäiseen ongelmaan
- Tarkistus poistettiin, koska tuotannossa tuli "invalid signature" -virheitä. Syy oli siinä, että frontend lähetti Microsoft Graphille tarkoitetun access tokenin (`aud` = Graph, `iss` = `sts.windows.net`). Microsoft muokkaa Graph-tokenin allekirjoitusta tarkoituksella, joten mikään JWKS-fallback ei voinut auttaa.
- Frontend vaihdettiin ID-tokeniin commitissa `f1442e9` klo 11:10, mutta tarkistus revertoitiin silti klo 12:32 samana päivänä. Jäljelle jäänyt epäilys on puuttuva tai väärä `AZURE_TENANT_ID` / `AZURE_CLIENT_ID` tuotannon `.env`-tiedostossa – sama commit poisti ne myös `.env.example`-tiedostosta.

### Added
- `src/middleware/azureTokenVerifier.ts`: keskitetty tokenin tarkistus, jota käyttävät sekä HTTP että WebSocket
  - JWKS v1/v2 -valinta issuerin perusteella ja fallback vain allekirjoitusvirheellä
  - Graph-tokenin tunnistus omalla virhekoodilla ja ohjeella
  - Virhekoodit, joista näkee suoraan mikä claim ei täsmää
- `AUTH_VERIFY_MODE=warn`: käyttöönoton diagnostiikkatila, joka lokittaa epäonnistumisen syyn hylkäämättä pyyntöä
- Käynnistysloki kertoo odotetun audiencen ja issuerit sekä varoittaa, jos konfiguraatio puuttuu

### Removed
- `DEVELOPER_EMAILS`-ohitus, joka salli tokenin hyväksymisen ilman allekirjoituksen tarkistusta sähköpostilistan perusteella

### Technical Changes
- Azure-asetukset luetaan `config/env.js`-moduulin kautta, koska moduulitason `process.env`-luku tapahtuisi ennen `dotenv.config()`-kutsua
- JWKS-clientit luodaan vasta ensimmäisellä käytöllä
- `.env.example`: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` ja `AUTH_VERIFY_MODE` dokumentoitu

## 2026-09-16 - Tikettien aihevaihtelu

### Fixed
- **AI-generoitujen tikettien yksipuolisuus**: generoidut tiketit käsittelivät aina samaa aihetta (ensin tulostimet, sitten wifi)
  - Syy 1: koodi ei valinnut aihetta lainkaan, vaan jätti sen kielimallille. Koska jokainen generointi on erillinen kutsu, malli ei voinut muistaa aiempia tikettejä ja päätyi joka kerta "tyypillisimpään" ongelmaan.
  - Syy 2: `ModernTicketGeneratorAgent`-promptin esimerkit ohjasivat verkko-ongelmiin ("netti ei toimi", "WiFi", "verkko", "yhteys") ja kielletyt termit olivat pelkkiä verkkotermejä.
  - Aihe arvotaan nyt koodissa ennen LLM-kutsua ja annetaan promptille valmiina.
  - Viimeisten 15 tiketin aiheet jätetään arvonnan ulkopuolelle.

### Added
- Aihekatalogi `ai/config/ticketTopics.ts`: 48 skenaariota (kirjautuminen, Microsoft 365, tulostus, verkko, laitteet, käyttöjärjestelmä, tiedostot, tietoturva, luokkatilat)
  - Jokaisella aiheella tarkennus, sopivat kategoriat ja vaikeustasot
  - Myös laite ja tilannekonteksti arvotaan, mikä tuo vaihtelua saman aiheen sisälle
- `ai/config/recentTopics.ts`: toiston esto, jota molemmat generaattorit käyttävät

### Technical Changes
- Aihe, laite ja tilanne lisätty sekä `ModernTicketGeneratorAgent`-promptiin että vanhan generaattorin `TICKET_GENERATOR_PROMPT`-templateen
- Poistettu verkkoaiheiset esimerkit promptin teknisen tason ohjeista
- `generatorMetadata` sisältää nyt kentät `topicId`, `topicName` ja `situation`
- Vanha generaattori tallentaa metadatan (aiemmin `undefined`), jotta toiston esto toimii myös sillä
- `aiController` tallentaa metadatan molemmilta generaattoriversioilta, ei vain modernilta
- Generaattorille voi antaa `topicId`-parametrin, jos halutaan ohittaa satunnainen arvonta

## 2025-09-16 - Discord Broadcast Feature
### Added
- **Discord Broadcast Notifications**: New feature to notify support agents about ticket creation
  - Broadcasts new tickets to a configured Discord channel
  - Support agents can see real-time notifications when tickets are created
  - Rich embed format showing ticket details (title, description, priority, category, creator)
  - Finnish language interface for all notification messages
  - Works for both web and Discord-created tickets
  - Excludes AI-generated training tickets from broadcasts
  
### Technical Changes
- Added `broadcastChannelId` and `enableBroadcast` fields to DiscordSettings model
- Created `broadcastNewTicket()` method in Discord bot for sending notifications
- Integrated broadcast calls into ticket creation flow (both web and Discord)
- Fixed AI-generated ticket filtering by setting `isAiGenerated` flag at creation time
- Added `isAiGenerated` field to CreateTicketDTO to support proper flagging
- Added API endpoints for channel validation and listing available channels
- Created new frontend component `DiscordBroadcastSettings` for configuration
- Added broadcast tab to Discord settings page in admin panel

### Database
- Migration: `add_discord_broadcast_settings` - Added broadcast configuration fields

Kaikki merkittävät muutokset tähän projektiin dokumentoidaan tässä tiedostossa.

# 15.09.2025 - Bulk Delete ja Opiskelijan Raporttityökalu

## Uusi toiminnallisuus: Tikettien massapoisto adminille

### Frontend
- **feat:** Bulk delete -toiminnallisuus TicketList-komponenttiin
  - "Valitse tikettejä" -nappi admin-käyttäjille
  - Valintaruudut jokaiselle tiketille valinta-tilassa
  - "Valitse kaikki" -toiminto
  - Visuaalinen korostus valituille tiketeille (sininen reunus)
  
- **feat:** BulkActionToolbar-komponentti
  - Kelluvat toimintopainikkeet valituille tiketeille
  - Näyttää valittujen tikettien määrän
  - "Poista valitut" -painike bulk delete -toiminnolle
  - "Tyhjennä valinta" -painike
  - Vahvistus-dialogi ennen poistoa
  
### Backend
- **feat:** Bulk delete API-endpoint
  - `DELETE /api/tickets/bulk` (vain ADMIN-rooli)
  - Hyväksyy taulukon tiketti-ID:itä request bodyssä
  - Maksimiraja: 100 tikettiä kerralla
  
- **feat:** BulkDeleteTickets-palvelu (`ticketService.ts`)
  - Transaktiopohjainen poisto atomiseen toimintaan
  - Poistaa kaikki liittyvät tiedot:
    - Liitetiedostot (myös fyysisesti levyltä)
    - Kommentit
    - Ilmoitukset
    - AI-interaktiot ja -keskustelut
    - KnowledgeArticlet (AI-generoitujen tikettien osalta)
    - Support Assistant -keskustelut
  - Discord-kanavien siivous poistetuille tiketeille
  - WebSocket-ilmoitukset jokaiselle poistetulle tiketille

# 15.09.2025 - Opiskelijan Raporttityökalu

## Uusi toiminnallisuus: Työraporttien generointi tukihenkilöille

### Frontend
- **feat:** Uusi StudentReportView-komponentti (`/reports` polku)
  - Tukihenkilöt voivat generoida raportteja käsitellyistään tiketeistä
  - Suodattimet: aikajakso, kategoria, prioriteetti
  - Pikavalitsimet: viikko, kuukausi, 3 kuukautta
  - Tilastot: ratkaistut, suljetut, käsittelyssä olevat tiketit
  - Keskimääräinen ratkaisuaika minuutteina
  - Kategorioiden ja prioriteettien jakaumat
  
- **feat:** Vientimuodot ESEDU Ossi-oppimisympäristöön
  - PDF: Virallinen raportti allekirjoitusta varten
  - CSV: Excel-yhteensopiva muoto taulukkolaskentaan
  - JSON: Strukturoitu data integraatioita varten
  
- **feat:** Navigaatiolinkki raportteihin
  - Desktop-navigaatiossa "Raportit" linkki (vihreä FileText-ikoni)
  - Mobiilinavigaatiossa oma välilehti
  - Näkyy vain SUPPORT ja ADMIN rooleille

### Backend
- **feat:** ReportService (`reportService.ts`)
  - `getUserWorkReport`: Hakee käyttäjän työraportit
  - Sisältää tiketit joissa käyttäjä on assignedTo TAI on kommentoinut
  - Laskee tilastot: ratkaistut, suljetut, käsittelyssä olevat
  - Keskimääräiset ratkaisuajat vain tiketeistä joilla processingStartedAt ja processingEndedAt
  
- **feat:** ReportController (`reportController.ts`)
  - PDF-generointi PDFKit-kirjastolla
  - CSV-vienti json2csv-kirjastolla (UTF-8 BOM Excel-yhteensopivuus)
  - JSON-vienti rakenteisena datana
  
- **feat:** API-reitit `/api/reports/`
  - `GET /my-work`: Hakee työraportin suodattimilla
  - `GET /export/pdf`: Vie PDF-muodossa
  - `GET /export/csv`: Vie CSV-muodossa
  - `GET /export/json`: Vie JSON-muodossa
  - `POST /save`: Tallentaa raportin myöhempää käyttöä varten
  - `GET /saved`: Listaa tallennetut raportit
  
### Tietokanta
- **feat:** StudentReport-malli Prisma-schemaan
  - Tallentaa generoidut raportit JSON-muodossa
  - Seuraa vientiajankohtaa (`exportedAt`)
  - Indeksit userId ja createdAt kentille

### Korjaukset
- **fix:** Tiketin sulkeminen/ratkaiseminen asettaa nyt processingEndedAt-ajan
  - Jos processingStartedAt puuttuu, asetetaan molemmat samaan aikaan
  - Mahdollistaa käsittelyaikojen laskennan raportissa
  
- **fix:** Radix UI Select-komponentin empty string value -virhe
  - Korvattu tyhjät arvot "all"-arvolla
  - Käsittely onValueChange-funktiossa takaisin tyhjäksi

# 03.09.2025 - EnhancedModernChatAgent with Style Synchronization & Full Ticket Generator Integration

## Fix: Azure AD token validation in production (v1 vs v2 JWKS)
- fix: Resolved `invalid signature` errors for Azure AD tokens with issuer `https://sts.windows.net/{tenant}/`.
  - Root cause: Middleware fetched only v2 JWKS (`.../discovery/v2.0/keys`) even when tokens were v1 (`sts.windows.net/...`).
  - Solution: Added dynamic JWKS selection and fallback between v1 (`.../discovery/keys`) and v2 (`.../discovery/v2.0/keys`) based on token issuer.
  - Improved diagnostics to log audience/issuer and JWKS client used.
  - Documented guidance that backend only accepts tokens with `aud = AZURE_CLIENT_ID` and will reject Microsoft Graph tokens (`aud = 00000003-0000-0000-c000-000000000000`).

## Complete Ticket Generator Frontend Integration (Fixed)
- **feat:** Full integration of ModernTicketGeneratorAgent with frontend ticket generator
  - Added metadata display in ticket previews showing generator version, writing style, technical level
  - Enhanced logging to show generation details in the Lokit (logs) panel
  - Added manual override controls in advanced settings for style and technical level
  
- **manual controls added:**
  - Optional checkbox to enable manual overrides (disabled by default for automatic mode)
  - Writing style selector: panic, confused, frustrated, polite, brief
  - Technical level selector: beginner, intermediate, advanced
  - Controls only appear in advanced settings section
  - Clear indication that these only work with ModernTicketGenerator
  
- **metadata tracking:**
  - Both legacy and modern generators now return metadata
  - Legacy returns: `{ generatorVersion: 'legacy', writingStyle: 'standard', technicalLevel: 'mixed', technicalAccuracy: 0.7 }`
  - Modern returns actual values: style used, technical level applied, accuracy score
  - Metadata displayed as badges in preview cards
  - Logs show generator version and configuration used
  
- **backend enhancements:**
  - ModernTicketGenerator accepts optional `manualStyle` and `manualTechnicalLevel` parameters
  - Falls back to automatic selection when not provided
  - Controller passes through manual overrides from frontend
  - Metadata included in preview response for display
  
- **fixes applied:**
  - Manual override controls only shown when ModernTicketGenerator is enabled
  - Legacy generator no longer returns metadata (was showing incorrectly)
  - Metadata badges and logs only displayed for modern generator
  - Fixed AI settings detection to conditionally show controls
  - Fixed chatAgentSyncWithGenerator not saving - added to Zod validation schema
  
- **metadata persistence:**
  - Added `generatorMetadata` JSON field to Ticket model
  - ModernTicketGenerator metadata (style, level, accuracy) stored with ticket
  - EnhancedModernChatAgent retrieves metadata from ticket and maintains consistency
  - Writing style and technical level properly passed from generator to chat agent
  
- **style improvements (EnhancedModernChatAgent only - when sync is enabled):**
  - Toned down panic style to be more realistic (max 2 exclamation marks, coherent responses)
  - Made confused style more genuine (natural questions, less theatrical)
  - Adjusted frustrated style to be civil and cooperative
  - Added instructions for human-like, conversational responses
  - Emphasized that users want help, not drama
  - NOTE: ModernTicketGenerator remains unchanged - generates expressive tickets as before

# 03.09.2025 - EnhancedModernChatAgent with Style Synchronization

## Enhanced Chat Agent with Writing Style Sync
- **feat:** Created EnhancedModernChatAgent that syncs with ModernTicketGeneratorAgent
  - Maintains consistent writing style (panic, confused, frustrated, polite, brief) throughout conversation
  - Implements same technical level configurations as ticket generator
  - Auto-detects writing style from ticket description
  - Dynamic technical level determination based on user profile
  
- **technical implementation:**
  - Created `/backend/src/ai/agents/enhancedModernChatAgent.ts`
  - Writing style detection from ticket description patterns
  - Technical configurations matching ModernTicketGenerator:
    - Beginner: max 1 term, 150 chars, high vagueness, avoid technical terms
    - Intermediate: max 3 terms, 250 chars, medium vagueness
    - Advanced: max 10 terms, 400 chars, low vagueness, full technical vocabulary
  - Style-specific prompt instructions for each writing style
  - Vocabulary restrictions based on technical level
  
- **database changes:**
  - Added `chatAgentSyncWithGenerator` boolean field to AISettings
  - Migration: `20250903004211_add_chat_agent_sync_toggle`
  - Toggle to enable/disable style synchronization
  - Only works when ModernTicketGenerator is also enabled
  
- **frontend updates:**
  - Added sync toggle in AI Settings page
  - Shows sync option only when ModernChatAgent is selected
  - Disabled with warning when ModernTicketGenerator is not active
  - Clear visual indicators for dependencies
  
- **benefits:**
  - More immersive training experience with consistent personas
  - Realistic user behavior throughout conversation
  - Better alignment between ticket creation and chat responses
  - Maintains personality traits from initial ticket
  - Example: A panicked beginner who writes "APUA!! Kaikki on rikki!!" continues responding in panic style

# 03.09.2025 - Hint System Architecture Refactor, Granularity Improvements & Modern Ticket Generator

## Modern Ticket Generator V2
- **feat:** Created ModernTicketGeneratorAgent with realistic user simulation
- **problem solved:** Legacy generator created overly technical tickets for beginners
  - Students writing about "DHCP-asiakasosoite 169.254.x.x" and "DNS-haku epäonnistuu"
  - Too many troubleshooting steps listed for beginner users
  - Overly structured and formal tickets
  
- **technical level scaling:**
  - **Beginners**: Max 150 chars, vague descriptions like "netti ei toimi", no technical terms
  - **Intermediate**: Max 250 chars, some basic terms, 1-3 troubleshooting steps
  - **Advanced**: Max 400 chars, appropriate technical terms, organized structure
  
- **variety system:** 
  - Multiple writing styles: panic, confused, frustrated, polite, brief
  - Random style selection for diversity
  - Realistic emotional states matching user profiles
  
- **integration:**
  - Added `ticketGeneratorVersion` to AISettings schema (default: 'legacy')
  - Version switching in aiController.ts
  - Backwards compatible - legacy generator remains available
  
- **expected results:**
  - Beginner: "hei, mulla ei toimi netti. oon yrittänyt laittaa wifin pois ja päälle mut ei auta"
  - Instead of: "DHCP-palvelu ei jaa IP-osoitetta WLAN-verkossa..."

# 02.01.2025 - Hint System Architecture Refactor & Granularity Improvements

## Improved Hint System Architecture
- **refactor:** Simplified hint system to use direct instructions instead of rules
  - StateMachine now has sole authority over when to provide hints
  - AI agent receives direct "give hint" instruction rather than evaluating rules itself
  - Changed from `shouldRevealHint` to `hintGiven` in AI response schema to reflect actual behavior
  - Replaced complex `HintConfiguration` with simpler `HintInstruction` interface
  
- **technical:** Cleaner separation of concerns
  - StateMachine decides WHEN to hint based on configurable thresholds
  - AI agent simply follows instructions on HOW to hint
  - Single source of truth for hint logic (no redundant decision-making)
  - More deterministic and predictable behavior

## Progressive Hint Granularity
- **feat:** Implemented progressive hint intensity based on evaluation stage and hint number
  - Removed generic "mention specific symptoms" instruction that was too revealing for early hints
  - Type-specific hint instructions with appropriate detail levels
  
- **EARLY stage hints (support is lost):**
  - Hint #1: Ultra vague - "En ymmärrä mikä tässä on vialla..." (just confusion)
  - Hint #2: Slightly less vague - "Tuntuu että jotain verkossa on pielessä..." (broad category)
  - Hint #3: Category mention - "Luulen että ongelma on jossain asetuksissa..." (general area)
  
- **PROGRESSING stage hints (right area identified):**
  - Can mention observed symptoms: "Huomasin että sivut eivät lataudu vaikka WiFi on päällä..."
  - Later hints more specific: "DNS-asetukset näyttävät oudoilta..."
  
- **CLOSE stage hints (almost there):**
  - Very specific details: "DNS on 0.0.0.0, pitäisikö sen olla jotain muuta?"
  - Can reference exact values from solution
  
- **benefits:**
  - More realistic user simulation - doesn't give away solution immediately
  - Better training value for support students
  - Progressive difficulty maintains learning curve
  - Hints appropriately matched to how stuck the support person is

# 03.09.2025 - Docker AI Response Generation Fix

## Bug Fixes
- **fix:** Fixed AI response generation failure in Docker environment
  - Problem: Backend was using FRONTEND_URL to make self-referential API calls, causing networking issues in Docker
  - Solution: Introduced BACKEND_URL environment variable for proper self-referencing
  - Changed ticketController.ts to use BACKEND_URL instead of FRONTEND_URL
  - Added BACKEND_URL to .env.example with appropriate defaults
  - Updated docker-compose.yml to set BACKEND_URL=http://backend:3001 for container networking
  - This ensures AI responses work correctly in both development and Docker environments

# 02.09.2025 - Discord User Management & Channel Cleanup Improvements

## Discord Security Features
- **feat:** User blocking system for Discord integration
  - Added `isBlocked` field to User model for tracking blocked Discord users
  - Instant rejection at `/tiketti` command - no channel creation for blocked users
  - Block/unblock toggle in Discord users management UI (admin panel)
  - New API endpoint: `PUT /api/discord/users/:id/block`
  - Blocked users receive ephemeral error message in Discord

- **feat:** Ticket creation cancellation button
  - Cancel button appears during ticket creation conversation flow
  - Users can abort ticket creation at any point
  - Channel automatically deleted 3 seconds after cancellation
  - No database records created for cancelled tickets
  - Prevents spam and accidental channel creation

## Channel Management Improvements  
- **feat:** Orphaned channel cleanup system
  - Detects channels without corresponding tickets in database
  - Checks for user activity before deletion (prevents data loss)
  - Cleans up failed/cancelled ticket creation attempts
  - Runs in same hourly cycle as regular cleanup (efficiency)
  - Uses configurable TTL with 1-hour minimum for orphaned channels

- **fix:** Discord user deletion cascade handling
  - Proper foreign key constraint resolution when deleting users with tickets
  - Deletion order: Notifications → Attachments → Comments → AI Interactions → Tickets
  - Automatic Discord channel deletion when user is removed
  - Uses global bot reference: `(global as any).discordBot`

## Frontend Updates
- **feat:** Three-dots dropdown menu for Discord user actions
  - Replaced separate action buttons with dropdown menu using `MoreVertical` icon
  - React Portal implementation prevents table overflow issues
  - Actions: Block/Unblock, Sync user data, Delete user
  - Fixed positioning calculation for proper dropdown placement
  - Click-outside-to-close functionality

## Backend Services
- **feat:** Enhanced Discord settings service (`discordSettingsService.ts`)
  - New `toggleBlockUser()` method for managing user blocks
  - Updated `deleteDiscordUser()` with Discord channel cleanup
  - Improved error handling for cascade deletions
  - Real-time settings refresh without server restart

- **fix:** Channel cleanup service improvements (`channelCleanup.ts`)
  - Added `cleanupOrphanedChannels()` method
  - Single timer system for all cleanup operations
  - Uses database settings instead of hardcoded values
  - Better logging for orphaned channel detection

# 02.09.2025 - Discord Bot Improvements & Real-time Updates

## Major Improvements
- **feat:** Complete Discord bot status system overhaul
  - Real-time ticket count display (Open, In Progress, Total)
  - Rotating status messages with cleanup countdown
  - Event-driven updates instead of polling
  - Removed caching system for direct DB queries
  - Instant updates when tickets change from any source

- **feat:** Enhanced WebSocket real-time updates
  - Fixed duplicate event listeners and connection issues
  - Optimized socket connection as singleton pattern
  - Reduced console noise and improved error handling
  - All pages now update in real-time without refresh
  - MyTickets, Admin, and MyWork views sync instantly

- **fix:** Discord ticket closure now creates timeline entries
  - Added automatic comment creation when closing from Discord
  - Timeline (aikajana) properly shows Discord closure events
  - WebSocket emission for timeline updates

- **fix:** Category dropdown in ticket creation
  - Fixed API response handling for categories
  - Categories now load properly in NewTicketForm

## Performance Optimizations
- **perf:** Eliminated unnecessary database queries
  - Discord bot uses event-driven updates instead of polling
  - Removed 5-minute cache refresh (was 288 queries/day)
  - Now only queries DB on startup and uses events for updates
  - 99.9% reduction in recurring DB queries

- **perf:** WebSocket connection improvements
  - Prevented duplicate subscriptions
  - Fixed reconnection handling
  - Eliminated rate limiting issues
  - Single persistent connection per client

## Backend Enhancements
- **feat:** Discord bot integration with ticket service
  - Added onTicketChanged events to ticketService
  - Automatic Discord bot updates for all ticket operations
  - Works for tickets created from both web and Discord

- **fix:** WebSocket event emissions
  - Added missing emitTicketCreated for Discord tickets
  - Added missing emitTicketDeleted for web deletions
  - Fixed status change events to emit both specific and general updates
  - All ticket state changes now properly broadcast

## Frontend Improvements
- **fix:** useSocket hook optimization
  - Fixed socket.io listener management
  - Prevented memory leaks from duplicate listeners
  - Improved reconnection logic
  - Reduced console logging noise

- **fix:** Real-time updates for all views
  - Admin page updates when tickets change
  - MyWork view syncs across windows
  - MyTickets refreshes on any relevant change
  - TicketDetailsModal properly subscribes to events

# 02.09.2025 - Discord Integration (Initial)
- **feat:** Discord bot integration for ticket creation
  - Slash command `/tiketti` to create support tickets
  - Private channel creation for each ticket
  - Conversational ticket creation flow in Finnish/English
  - No account linking required - automatic user creation

- **feat:** Bidirectional message synchronization
  - Discord messages sync to web app as comments
  - Web app comments appear in Discord as embeds
  - Attachment support (images/videos)
  - Real-time synchronization via message collectors

- **feat:** Status update notifications in Discord
  - Automatic status change notifications in ticket channels
  - Formatted embeds showing status transitions
  - Support for ticket closure with channel notification

## Database
- **database:** Added Discord integration fields
  - User: isDiscordUser, discordId, discordUsername, discordServerId
  - Ticket: sourceType, discordChannelId, discordServerId
  - Comment: discordMessageId, isFromDiscord
- **migration:** Applied schema changes via Prisma db push

## Backend Implementation
- **feat:** Discord bot service (`discord/bot.ts`)
  - Slash command registration
  - Private channel creation with permissions
  - Graceful shutdown handling
  
- **feat:** Ticket conversation handler (`discord/ticketConversation.ts`)
  - Step-by-step ticket creation flow
  - Bilingual prompts (Finnish/English)
  - Automatic Discord user creation
  
- **feat:** Message synchronization (`discord/messageSync.ts`)
  - Channel message collectors for Discord→Web sync
  - sendMessageToDiscord for Web→Discord sync
  - Status update formatting and delivery
  
- **feat:** Integration with existing controllers
  - Updated comment controller for Discord sync
  - Status update controller integration
  - Socket service extension for ticket updates

## Configuration
- **config:** Added Discord environment variables
  - DISCORD_BOT_TOKEN for bot authentication
  - DISCORD_CLIENT_ID for command registration
  - Optional DISCORD_TICKET_CATEGORY_ID for channel organization

## Documentation
- **docs:** Created comprehensive Discord integration guide
  - Setup instructions
  - Configuration details
  - Usage flow documentation
  - Troubleshooting guide

# 29.08.2025 - Token Usage Tracking and AI Model Selection

## New Features
- **feat:** Comprehensive token usage tracking system for all AI agents
  - Real-time token counting using LangChain callbacks
  - Cost calculation based on OpenAI pricing (GPT-5, GPT-4.1, O4 models)
  - Detailed analytics dashboard with multiple visualizations
  - Per-agent, per-model, and per-user tracking
  
- **feat:** Individual model selection for each AI agent
  - Separate model configuration for ChatAgent, SupportAssistant, TicketGenerator, and Summarizer
  - Dropdown selectors in AI Settings with Finnish translations
  - Default models set to current production values (gpt-4o-mini)
  
- **feat:** Advanced Token Analytics Dashboard
  - Exact token counts with proper number formatting (no rounding)
  - Daily/weekly/monthly usage charts
  - Hourly usage patterns with heatmap
  - Error analytics with failure tracking
  - Response time distribution analysis
  - Interactive agent-specific deep dive analysis
  - Request-level breakdown with search and filters
  - Model efficiency scatter plot
  - Top users by token consumption

## Database
- **database:** Added AITokenUsage model for tracking
  - Fields: agentType, modelUsed, promptTokens, completionTokens, totalTokens, estimatedCost
  - Links to tickets and users for detailed attribution
  - Response time and error tracking
- **database:** Added model selection fields to AISettings
  - chatAgentModel, supportAssistantModel, ticketGeneratorModel, summarizerAgentModel
- **migration:** Created migrations for token tracking and model settings

## Backend Implementation  
- **feat:** TokenTrackingCallbackHandler for automatic usage capture
  - Extracts token data from multiple OpenAI response formats
  - Handles errors and tracks failed requests
  - Calculates response times automatically
- **feat:** TokenTrackingService with cost calculation
  - Updated pricing for GPT-5, GPT-4.1, and O4 model families
  - Aggregated analytics with multiple grouping options
  - Daily usage patterns and top user analysis
- **feat:** Token Analytics API endpoints
  - GET `/ai/token-analytics` - Comprehensive analytics with filters
  - GET `/ai/token-analytics/daily` - Daily usage for charts
  - GET `/ai/token-analytics/top-users` - Top consumers
  - GET `/ai/token-analytics/summary` - Monthly summary with comparisons

## Frontend Components
- **feat:** TokenAnalytics component with rich visualizations
  - Line charts for usage trends
  - Pie charts for agent distribution
  - Bar charts for response time distribution
  - Area charts for hourly patterns
  - Scatter plots for efficiency analysis
- **feat:** Interactive filtering and search
  - Search by user, ticket, agent, or model
  - Filter by request type with Finnish labels
  - Model-specific filtering
  - Collapsible detailed breakdown table
- **feat:** Deep agent analysis on click
  - Performance metrics (min/max/median response times)
  - Token efficiency metrics
  - Cost analysis with ROI calculations
  - Usage timeline for last 20 requests
  - Request type breakdown

## UI/UX Improvements
- **ui:** Exact number display without K/M abbreviations
  - Full token counts with thousand separators (Finnish format)
  - Precise cost display with 4 decimal places for small amounts
  - No rounding - shows exact values
- **ui:** Interactive agent selection in pie chart
  - Click to select agent for detailed analysis
  - Highlighted selection with visual feedback
  - "Syväanalyysi" card appears with comprehensive metrics

# 25.08.2025 - Comprehensive Hook Refactoring & Authorization Fixes

## Frontend - Major Hook Architecture Overhaul
- **feat:** Created comprehensive set of centralized React Query hooks
  - `useUsers` - User list with role-based access (ADMIN/SUPPORT only)
  - `useAIAnalytics` - AI dashboard analytics (ADMIN only)
  - `useRoleChange` - Role management for development and admin
  - `useAITicketGenerator` - AI ticket generation with preview/confirm
  - `useConversation` - Ticket conversations and summaries
  - `useSupportAssistant` - Support assistant with streaming responses
- **fix:** Resolved 403 Forbidden errors for non-admin users
  - Problem: useUsers hook was making API calls even for unauthorized users
  - Solution: Modified hook to bypass React Query entirely for USER role
  - Added `useCanAccessUsers` helper hook for permission checks
- **fix:** Fixed React hooks order violations in multiple components
  - TicketDetailsModal: Moved useMemo before conditional returns
  - TicketPage: Defined ticketData before using in useMemo
- **fix:** Corrected import names in useTickets hook
  - Changed getMyTickets → fetchMyTickets to match actual exports

## Backend - Authorization Updates
- **fix:** Updated /users endpoint to allow SUPPORT role access
  - Changed from `requireRole(UserRole.ADMIN)` to `requireRole([UserRole.ADMIN, UserRole.SUPPORT])`
  - Fixed incorrect requireRole syntax (was passing multiple args instead of array)
  - Support staff can now see user lists for ticket assignment

## Bug Fixes
- **fix:** UserManagementDialog missing `saving` state variable
  - Added useState for saving state management
  - Updated handleSave to properly set loading state
- **fix:** AITicketGenerator category dropdown stuck on "Ladataan..."
  - Component wasn't using the useCategories hook properly
  - Fixed to use categories from hook instead of local state
- **fix:** fetchCategories handling both array and object responses
  - Added logic to handle different API response formats

## Performance Improvements
- **perf:** Optimized unnecessary API calls
  - Hooks now check permissions before making requests
  - Reduced 403 errors in browser console
  - Better cache management with role-based query keys

## Code Quality
- **refactor:** Consistent error handling across all hooks
  - Silent 403 handling for unauthorized access
  - Proper retry logic (disabled for 403s)
  - Toast notifications for user feedback

# 24.08.2025 - API Request Optimization

## Performance Fixes
- **fix:** Eliminated multiple concurrent API requests causing race conditions
  - **Problem:** 20+ concurrent requests on profile page load, database unique constraint violations
  - **Root Causes:** 
    - React.StrictMode double mounting (development only)
    - Multiple components fetching same data independently
    - No request deduplication or caching strategy
  - **Solution:** Centralized data management with React Query hooks
  - **Results:** Reduced API calls from 20+ to 3-5 maximum

## Frontend
- **feat:** Created centralized React Query hooks for shared data
  - `useUserData` - Prevents duplicate /users/me calls
  - `useNotificationSettings` - Shared notification settings across components
  - `useAISettings` - Centralized AI settings management
  - `useTickets` - Unified ticket data fetching
  - `useCategories` - Cached category data
  - `useNotifications` - Consolidated notification queries
- **fix:** Conditional React.StrictMode (development only)
  - Production builds no longer have double-mounting issues
- **feat:** Global QueryClient for cross-component cache sharing
- **refactor:** Updated ProfileView and NotificationSettings to use centralized hooks

## Backend  
- **fix:** Notification settings now created during login
  - Prevents race conditions from multiple components trying to create settings
  - Single atomic operation during authentication
- **refactor:** Auth controller returns complete user data with settings
  - Reduces follow-up API calls after login

## Database
- **fix:** Removed unused fields from schema
  - Deleted `emailNotifications` and `notifyOnDeadline` fields
  - Migration: `20250821170053_add_performance_indexes`

# 21.08.2025 - AI Settings Configuration System & Advanced Hint Logic

## New Features
- **feat:** Implemented comprehensive AI Settings configuration system
  - Admins can now configure AI behavior through UI instead of environment variables
  - Switch between ModernChatAgent and legacy ChatAgent
  - Full control over hint system behavior
  - Settings stored in database with singleton pattern

## Database
- **database:** Added new AISettings model
  - `chatAgentVersion` - Choose between "modern" or "legacy" agent
  - `hintSystemEnabled` - Enable/disable hint system entirely
  - `hintOnEarlyThreshold` - Consecutive EARLY evaluations before hint (default: 3)
  - `hintOnProgressThreshold` - Optional threshold for PROGRESSING state hints
  - `hintOnCloseThreshold` - Optional threshold for CLOSE state hints
  - `hintCooldownTurns` - Minimum turns between hints (default: 0 = no cooldown)
  - `hintMaxPerConversation` - Maximum hints per conversation (default: 999 = unlimited)
- **migration:** Created migrations for AISettings table
  - `20250824201134_add_ai_settings` - Initial AISettings model
  - `20250824203148_update_ai_settings_defaults` - Updated defaults to unlimited

## Backend
- **feat:** Created aiSettingsController with CRUD operations
  - GET `/api/ai/settings` - Fetch current settings
  - PUT `/api/ai/settings` - Update settings (admin only)
  - POST `/api/ai/settings/reset` - Reset to defaults (admin only)
- **feat:** Created aiSettingsService with caching
  - 1-minute cache for performance
  - Automatic default creation if no settings exist
- **feat:** Enhanced ConversationStateMachine with configurable hint logic
  - Tracks separate counters for EARLY, PROGRESSING, and CLOSE states
  - Supports configurable thresholds per state
  - Implements cooldown periods between hints
  - Enforces maximum hints per conversation
- **refactor:** Updated aiController to use database settings
  - Removed hardcoded USE_MODERN_CHAT_AGENT environment variable
  - Now reads chat agent version from database
  - Passes all hint settings to ConversationStateMachine

## Frontend
- **feat:** Created AISettings component in admin panel
  - Professional UI matching existing design system
  - Toggle switches consistent with NotificationSettings
  - Real-time change detection with proper state management
  - Collapsible advanced settings section
- **feat:** Enabled AI-asetukset tab in AITools page
  - Previously disabled tab now fully functional
  - Integrated with toast notifications for feedback
- **fix:** Fixed validation to allow max hints up to 999
- **fix:** Fixed change detection to properly track unsaved changes

## Bug Fixes
- **fix:** Hint system now actually provides hints in AI responses
  - Added `forceHint` parameter to ModernChatAgent.respond()
  - Updated prompt to include hint instructions when needed
  - Hints are naturally embedded in AI responses
- **fix:** UI properly displays hint badges
  - Support students see "Vihje annettu" badge
  - Admins see full details in ConversationModal
  - Internal AI reasoning hidden from student view

## UI/UX Improvements
- **ui:** Differentiated views for different user roles
  - **Support/Student view (CommentSection.jsx):**
    - Shows only AI response text and "Vihje annettu" badge
    - Hides internal evaluation states and reasoning
  - **Admin view (ConversationModal.jsx):**
    - Shows all ModernChatAgent fields
    - Evaluation badges with tooltips
    - Emotional states with emojis
    - Collapsible reasoning sections
- **ui:** Consistent design system
  - Uses existing Button component
  - Matches toggle switch styles from NotificationSettings
  - Professional card layout with proper spacing
  - Toast notifications for all actions

# 24.08.2025 - ModernChatAgent Fields Added to Database & Documentation Updates

## Documentation
- **docs:** Updated ChatAgent documentation to accurately reflect current implementation
  - Documented the two-phase LLM process (evaluation then response generation)
  - Added detailed interface definitions matching actual code
  - Clarified how technical skill level is determined from ticket priority
  - Documented the flexible evaluation criteria (EARLY/PROGRESSING/CLOSE/SOLVED)
  - Added information about logging and error handling
  - Updated integration points to reflect actual API flow
- **docs:** Created comprehensive ModernChatAgent documentation
  - Documented single LLM call architecture with structured outputs
  - Added Zod schema definitions and validation flow
  - Documented emotional state tracking and hint system
  - Created detailed flowcharts for ModernChatAgent, StreamingChatAgent, and ConversationStateMachine
  - Explained feature flag system for gradual migration
  - Added performance comparison with traditional ChatAgent
  - Documented all three implementation variants (Modern, Streaming, React)
- **docs:** Corrected documentation to match actual implementation:
  - Fixed database table references: Uses `Comment` table, not `AITrainingConversation`
  - Clarified that `emotionalState`, `reasoning`, and `shouldRevealHint` are NOT saved to database
  - Marked StreamingChatAgent and ConversationStateMachine as "NOT IN USE" 
  - Updated flowcharts to show correct database fields
  - Added notes about which ModernChatAgent features are theoretical vs actually implemented

## Backend Implementation
- **feat:** Added ModernChatAgent fields to Comment model in database
  - `emotionalState` - tracks AI's simulated emotional state (frustrated/hopeful/excited/satisfied/confused)
  - `reasoning` - stores internal reasoning about the evaluation for analytics
  - `shouldRevealHint` - indicates whether AI decided to provide hints
- **feat:** Updated aiController to save all ModernChatAgent fields when USE_MODERN_CHAT_AGENT=true
- **refactor:** Removed unused agent implementations
  - Deleted StreamingChatAgent (was never used in production)
  - Deleted ReactChatAgent (experimental code never used)
  - Kept ConversationStateMachine for future implementation
- **database:** Created migration `20250824185234_add_modern_chat_agent_fields`
  - Added three new nullable fields to Comment table
  - Fields are populated only when ModernChatAgent is active

## Frontend UI Enhancements
- **feat:** Enhanced ConversationModal to display ModernChatAgent fields
  - Added emotional state display with emojis (😤 Turhautunut, 🤔 Toiveikas, 😃 Innostunut, 😊 Tyytyväinen, 😕 Hämmentynyt)
  - Added collapsible reasoning section showing AI's internal decision logic
  - Added hint indicator badge when AI provides hints to stuck students
  - All new fields integrate seamlessly with existing conversation analysis view
  - Admins can now see complete AI behavior insights in "Keskusteluanalyysi"

## ConversationStateMachine Integration
- **feat:** Integrated ConversationStateMachine with ModernChatAgent
  - Tracks conversation flow through states: initial → diagnosing → attempting → verifying → resolved
  - Maintains stuck counter for consecutive EARLY evaluations
  - Provides hints only after 3+ consecutive stuck turns (not just total message count)
  - Resets stuck counter when progress is made (smarter hint timing)
  - In-memory state management (state persists during conversation, cleared on resolution)
  - State machine info added to reasoning field for debugging
- **improvement:** Much smarter hint logic
  - OLD: Hints given when `conversationHistory.length > 3 && evaluation === "EARLY"`
  - NEW: Hints given when stuck for 3+ consecutive turns, resets on progress
  - Prevents confusing scenarios where hints appear after temporary success
- **fix:** Fixed hint system to actually provide hints in AI responses
  - Previously, `shouldRevealHint` was only a flag without affecting the response
  - Now, when stuck for 3+ turns, the AI is explicitly told to include subtle hints
  - Hints guide students toward the solution area without giving away the answer
  - Example hints: "Hmm, ongelma tuntuu liittyvän [specific area]..." or "Olen huomannut että [symptom]..."

# 22.01.2025 - Modern Chat Agent with Single LLM Call

## Backend Improvements

### AI Chat Agent Rewrite
- **feat:** Uusi moderni chat agent arkkitehtuuri (`backend/src/ai/agents/modernChatAgent.ts`)
  - Yksittäinen LLM-kutsu yhdistää arvioinnin ja vastauksen generoinnin
  - Strukturoitu output käyttäen Zod-skeemoja OpenAI:n JSON-moodin kanssa
  - Tunnelmatilan seuranta realistisempaa käyttäjäsimulaatiota varten
  - Vihjeiden paljastuslogiikka keskustelun tilan perusteella

### Kolme Arkkitehtuurivaihtoehtoa
1. **ModernChatAgent:** Yksittäinen kutsu strukturoidulla outputilla tuotantokäyttöön
2. **ReactChatAgent:** Tool-calling lähestymistapa eksplisiittisiin päättelyaskeliin (kokeellinen)
3. **StreamingChatAgent:** Oikea streaming-tuki ilman hakkerointia

### Feature Flag System
- **Lisätty:** `USE_MODERN_CHAT_AGENT` ympäristömuuttuja asteittaiseen migraatioon
- Säilyttää taaksepäin yhteensopivuuden olemassa olevan chat agentin kanssa
- Nolla-downtime deployment polku

### Tekniset Parannukset
- **Suorituskyky:** Poistaa turhat kaksinkertaiset LLM-kutsut (arviointi + vastaus)
- **Tyyppiturvallisuus:** Täydet TypeScript-tyypit Zod-validoinnilla
- **Streaming:** Hybridi-lähestymistapa nopealla arvioinnilla ja streamatulla vastauksella
- **Tilanhallinta:** Keskustelun tilakone edistymisen seuraamiseen ja jumittumisen havaitsemiseen

### Riippuvuudet
- Lisätty `zod-to-json-schema` paketti OpenAI:n strukturoidun outputin tueksi

### Migraatiopolku
1. Aseta `USE_MODERN_CHAT_AGENT=false` (oletus) käyttääksesi vanhaa toteutusta
2. Testaa `USE_MODERN_CHAT_AGENT=true` kehitysympäristössä
3. Asteittainen käyttöönotto tuotannossa feature flagin avulla

# 22.08.2025 - AI Ticket Attachment Restriction

## Frontend Changes

### CommentSection Component
- **fix:** Disabled attachment/media upload functionality for AI-generated tickets
- Modified `canAddMediaComment()` function to check `ticket.isAiGenerated` flag
- Prevents users from adding images or videos to AI-generated training tickets
- Ensures training scenarios remain consistent without external media interference

# 21.08.2025 - Major Infrastructure Improvements

## Backend Improvements

### Error Handling & Logging
- **Keskitetty virheenkäsittely:** Lisätty `errorHandler.ts` middleware custom error-luokilla (ValidationError, AuthenticationError, NotFoundError, etc.)
- **Strukturoitu lokitus:** Migrated from console.log to Winston logger throughout the application
- **Request ID tracking:** Jokainen pyyntö saa uniikin ID:n seurantaa varten (X-Request-ID header)
- **API Response standardization:** Lisätty `apiResponse.ts` utility yhtenäisille vastauksille ja sivutukselle

### Environment & Configuration
- **Zod-pohjainen validointi:** Lisätty `config/env.ts` ympäristömuuttujien validointiin
- **Prisma client singleton:** Keskitetty Prisma client (`lib/prisma.ts`) hot-reload-ongelmien välttämiseksi
- **Enhanced security:** Helmet integration, CORS whitelist, rate limiting (200 req/min general, 5 req/15min auth)

### Health Monitoring
- **Uudet health check endpointit:**
  - `GET /api/health` - Täysi järjestelmän terveys ja metriikat
  - `GET /api/health/live` - Kubernetes liveness probe
  - `GET /api/health/ready` - Readiness probe tietokantayhteyden tarkistuksella

### Database Optimization
- **Performance indexes migration:** Lisätty strategisia composite-indeksejä:
  - Ticket filtering (status, priority)
  - Assignment queries
  - Category filtering
  - Date-based sorting
  - Notification and AI analytics queries

### API Enhancements
- **Uusi endpoint:** `GET /api/tickets/my-work` - Optimoitu MyWorkView-näkymälle
- **Parannettu autentikointi:** Tuki sekä Azure AD (RS256) että local JWT (HS256) tokeneille
- **Developer support:** DEVELOPER_EMAILS environment variable kehitystä varten

### AI Agents Improvements
- **Strukturoitu lokitus:** Kaikki AI-agentit käyttävät nyt Winston loggeria
- **Keskitetty Prisma:** Kaikki agentit käyttävät jaettua Prisma singletonia
- **TicketGeneratorAgent:** Etsii nyt dedikoidun AI-käyttäjän ennen admin-käyttäjiä

### Development Tools
- **JWT Token Generator:** Lisätty `scripts/generateTestToken.js` testaukseen
- **Parannetut npm scriptit:** `dev:server` ja `dev:studio` erillisinä komentoina

## Frontend Improvements

### React Query Optimization
- **Optimoitu cache-konfiguraatio:** 30s staleTime, 5min cacheTime
- **Real-time integration:** WebSocket-tapahtumat päivittävät React Query cachen automaattisesti

### WebSocket Enhancements
- **Singleton pattern:** Välttää useita yhteyksiä
- **Uudet tapahtumat:** ticketCreated, ticketUpdated, ticketStatusChanged, ticketAssigned, etc.
- **Automaattinen uudelleenyhdistäminen:** Parannettu yhteyden hallinta

### Authentication & Error Handling
- **401 error handling:** Automaattinen uloskirjautuminen ja session-pohjainen alerttien esto
- **Standardized API responses:** Yhtenäinen response.data.data käsittely
- **Request tracking:** X-Request-ID header integration

### Performance
- **Poistettu polling:** Korvattu WebSocket-pohjaisilla reaaliaikaisilla päivityksillä
- **Optimoidut kyselyt:** Vähemmän tarpeettomia API-kutsuja
- **Parannettu cache-strategia:** Käytetään setQueryData immediate UI päivityksiin

## Dependencies Updates
- **Backend additions:** winston, zod, express-rate-limit, helmet
- **Backend removals:** cookie-parser, csurf (unused)
- **Type definitions:** Added missing TypeScript types

# 11.05.2025 - fix: foreign key constraint violation

- Fixed a foreign key constraint violation (P2003) when deleting tickets. Ensured that related `SupportAssistantConversation` records are deleted within the same transaction before deleting the ticket itself in `ticketService.ts`. 

# 09.05.2025 - fix: Parannettu AI-assistentin palautteenkäsittelyä latauksen jälkeen

- **Ongelma:** Käyttäjä pystyi antamaan palautetta samaan viestiin useita kertoja, jos chat-ikkuna suljettiin ja avattiin uudelleen välissä. Myös alun perin ladatuille viesteille palautteenanto ei toiminut, koska `interactionId` puuttui.
- **Korjaukset (Frontend - `SupportAssistantChat.jsx`):
  - Lisätty `messageToInteractionMap`-tila seuraamaan viestien ja niiden `interactionId`:iden välistä yhteyttä.
  - Muokattu `parseConversationHistory`-funktiota erottelemaan `interactionId` viestihistoriasta (jos tallennettu muodossa `[interaction:uuid]`).
  - `handleFeedback`-funktio käyttää nyt ensisijaisesti viestikohtaista `interactionId`:tä `messageToInteractionMap`:sta tai toissijaisesti `currentInteractionId`:tä.
  - Laajennettu `loadConversationHistory`-funktiota hakemaan myös tiketin aiemmin annetut palautteet (`supportAssistantService.getFeedbackHistory`).
  - `messageFeedback`-tila päivitetään nyt myös haetulla palautetiedolla, estäen jo palautetun viestin uudelleenarvioinnin.
  - Palautteen lähetys estetään nyt, jos `messageFeedback`-tilasta löytyy jo merkintä kyseiselle `interactionId`:lle.
- **Korjaukset (Frontend - `supportAssistantService.js`):
  - Lisätty uusi funktio `getFeedbackHistory(ticketId)` hakemaan palvelimelta kaikki tikettiin liittyvät annetut palautteet.
- **Korjaukset (Backend - `aiController.ts`):
  - `getSupportAssistantResponse`-metodia muokattu siten, että se tallentaa nyt `interactionId`:n osaksi keskusteluhistoriaa käyttäen merkintää `[interaction:uuid] Assistantin vastauksen perässä.
  - Korjattu `getFeedbackByTicket`-funktiossa virhe, jossa yritettiin hakea `updatedAt`-kenttää, jota ei ole olemassa `AIAssistantInteraction`-mallissa. Kenttä vaihdettu `createdAt`-kenttään ja palautetaan frontendille `timestamp`-nimellä.
  - Korjattu `getFeedbackByTicket`-funktion `prisma.AIAssistantInteraction`-mallinimen kirjainkoko vastaamaan Prisma-skeemaa (`aIAssistantInteraction`).
- **Korjaukset (Backend - `aiAnalyticsController.ts`):
  - Lisätty uusi kontrollerifunktio `getFeedbackByTicket` hakemaan kaikki tiettyyn tikettiin liittyvät vuorovaikutukset, joille on annettu palaute.
  - Korjattu `AIAssistantInteraction`-mallinimen kirjainkoko vastaamaan Prisma-skeemaa (`aIAssistantInteraction`) `getFeedbackByTicket`-funktiossa.
- **Korjaukset (Backend - `aiAnalyticsRoutes.ts`):
  - Lisätty uusi reitti `GET /interactions/feedback/ticket/:ticketId` kutsumaan `aiAnalyticsController.getFeedbackByTicket`.
- **Dokumentaation päivitys:**
  - Lisätty uusi päätepiste `GET /ai-analytics/interactions/feedback/ticket/:ticketId` tiedostoon `new_docs/api-endpoints.md`.

# 09.05.2025 - feat: Lisätty tukihenkilöassistenttiin keskusteluhistorian tallennus ja palautus

- **SupportAssistantAgent - Toiminnallisuuden laajennus:**
  - Toteutettu tietokannan taulurakenne keskusteluhistorian tallentamiseen (`SupportAssistantConversation`).
  - Implementoitu backend-logiikka keskusteluhistorian tallentamiseen, noutamiseen ja tyhjentämiseen.
  - Keskusteluhistoria pysyy nyt tallessa tikettien välillä ja ratkaisun löytäminen on kumulatiivinen prosessi.
  - Tukihenkilö voi nyt jatkaa keskustelua aiemmin aloitetusta kohdasta, vaikka välillä sulkisi sovelluksen.
  - Keskustelun tyhjennys-toiminto tyhjentää keskustelun nyt myös tietokannasta.
- **Backend-toteutus:**
  - Luotu uusi tietokantataulun malli `SupportAssistantConversation` Prisma-skeemaan.
  - Lisätty uudet API-päätepisteet keskusteluhistorian noutamista ja tyhjentämistä varten.
  - Muokattu nykyistä tukihenkilöassistenttirajapintaa käyttämään ja päivittämään keskusteluhistoriaa.
- **Frontend-toteutus:**
  - Luotu uusi `supportAssistantService.js` API-kommunikointia varten.
  - Päivitetty `SupportAssistantChat.jsx` hakemaan keskusteluhistoria automaattisesti avatessa.
  - Toteutettu keskusteluhistorian parsiminen viestiobjekteiksi.
  - Tiketin tyhjennys-painike tyhjentää nyt sekä paikallisen että palvelimella olevan keskusteluhistorian.
  - Lisätty latausanimaatio keskusteluhistorian hakemisen ajaksi.
- **Dokumentaation päivitys:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` kuvaamaan uusia API-päätepisteitä.
  - Lisätty kuvaus keskusteluhistorian tallennuksen ja tyhjentämisen toiminnallisuudesta.
  - Merkitty aiemmin listattuna ollut "lisättävä ominaisuus" valmiiksi.

# 09.05.2025 - feat: SupportAssistantAgentille lisätty keskustelumuisti oman dialoginsa osalta

- **SupportAssistantAgent - Toiminnallisuuden laajennus:**
  - Agentti ottaa nyt vastaan oman aiemman keskusteluhistoriansa opiskelijan kanssa (`studentAssistantConversationHistory`) osana promptin syötettä.
  - Tämä mahdollistaa agentille paremman kontekstin ylläpidon, aiemmin annettuihin neuvoihin viittaamisen ja itsensä toistamisen välttämisen saman session aikana.
  - Muutokset tehty `SupportAssistantAgent.ts` (parametrin lisäys) ja `supportAssistantPrompt.ts` (uusi kenttä ja ohjeistus).
- **Dokumentaation päivitys:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` kuvaamaan uutta keskustelumuistia ja sen vaikutusta toimintaan.
  - Lisätty huomio tarvittavista backend-muutoksista tämän historian keräämiseksi ja välittämiseksi agentille.
- **Huom:** Tämä on osittainen toteutus. Agentti on valmis vastaanottamaan historian, mutta backend-logiikka historian keräämiseksi `AIAssistantInteraction`-tietueista ja välittämiseksi agentille tulee vielä toteuttaa erikseen.

# 09.05.2025- fix: SupportAssistantAgent huomioi nyt eksplisiittisemmin ChatAgent-keskustelun

- **SupportAssistantAgent - Promptin tarkennus:**
  - Lisätty ohjeistus (`backend/src/ai/prompts/supportAssistantPrompt.ts`) agentille mainitsemaan vastauksensa alussa, kun se huomioi uutta tietoa opiskelijan ja ChatAgentin (loppukäyttäjän simulaatio) välisestä keskusteluhistoriasta. Tämä parantaa dialogin luonnollisuutta.

# 09.05.2025 - fix: Edelleen tarkennettu SupportAssistantAgent-promptia proaktiivisemmaksi

- **SupportAssistantAgent - Promptin lisätarkennus:**
  - Vahvistettu ohjeistusta (`backend/src/ai/prompts/supportAssistantPrompt.ts`) niin, että agentti tarjoaa selkeämmin konkreettisia ensiaskeleita, kun opiskelija on jumissa tai kysyy yleisluontoista apua. Vältetään tilanteita, joissa agentti vastaa vain avoimilla vastakysymyksillä.
  - Muokattu promptin aloituskohtaa, ohjetta #1 ja lopun toimintakehotusta korostamaan tätä proaktiivista ensiaskelten ehdottamista.

# 09.05.2025 - fix: Hienosäädetty SupportAssistantAgent-promptia yhteistyöhaluisemmaksi

- **SupportAssistantAgent - Promptin tarkennus:**
  - Päivitetty prompt (`backend/src/ai/prompts/supportAssistantPrompt.ts`) ohjeistamaan agenttia olemaan aktiivisempi ehdottamaan seuraavia vianetsintäaskeleita ja toimimaan enemmän yhteistyökumppanina opiskelijan kanssa.
  - Tavoitteena on tasapainottaa ohjaavat kysymykset konkreettisilla neuvoilla, jotta opiskelija etenee ongelmanratkaisussa eikä koe agenttia pelkästään kyselijänä.
- **Dokumentaation päivitys:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` heijastamaan agentin proaktiivisempaa ja yhteistyökykyisempää roolia.

# 09.05.2025 - feat: Muokattu SupportAssistantAgent opastavaksi IT-opiskelijoille

- **SupportAssistantAgent - Toiminnallisuuden muutos:**
  - Agentin rooli muutettu suorien ratkaisujen tarjoajasta pedagogiseksi oppaaksi IT-alan opiskelijoille.
  - Sen sijaan, että antaisi vastauksia suoraan, agentti nyt ohjaa opiskelijaa kysymyksillä, vihjeillä ja vaiheittaisilla neuvoilla kohti ratkaisun itsenäistä löytämistä.
  - Tietopankin artikkeleita käytetään hienovaraisesti taustatiedoksi ohjauksessa, ei suorien vastausten lähteenä.
- **Promptin päivitys (`backend/src/ai/prompts/supportAssistantPrompt.ts`):
  - Promptia muokattu merkittävästi ohjeistamaan AI:ta toimimaan mentorina ja opettajana.
  - Lisätty selkeät ohjeet olla paljastamatta ratkaisuja suoraan ja keskittymään opiskelijan oman ajattelun tukemiseen.
- **Dokumentaation päivitykset:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` kuvaamaan uutta toimintalogiikkaa ja pedagogista lähestymistapaa.
  - Päivitetty `new_docs/ai-agents/index.md` agentin kuvaus vastaamaan uutta roolia.

# 05.05.2025 - feat: Näkymäasetusten tallentaminen selaimen muistiin

- **Käyttöliittymän parannukset:**
  - Lisätty näkymäasetusten (kortti/listanäkymä) tallennus selaimen localStorage-muistiin
  - Käyttäjien valitsemat näkymäasetukset säilyvät nyt selainikkunan sulkemisen ja uudelleen avaamisen välillä
  - Toteutettu seuraavilla sivuilla:
    - Kaikki tiketit (Tickets.jsx)
    - Omat tikettini (MyTickets.jsx)
    - Oma työnäkymä (MyWorkView.jsx)
  - Lisätty myös tuki Oma työnäkymä -välilehden aktiivisen välilehden muistamiselle
  - Uudelleenkäytettävät custom hookit:
    - useViewMode: näkymäasetusten käsittelyyn
    - useLocalStorage: yleiseen localStorage-tallennukseen
  - Parempi käyttäjäkokemus: käyttäjän ei tarvitse vaihtaa näkymää joka kerta sivuille palatessaan

# 05.05.2025 - feat: Lisätty interaktiivinen demo tukihenkilöassistentille

- **AI-avustaja-välilehden parannukset:**
  - Toteutettu enterprise-tason interaktiivinen demo tukihenkilöassistentille
  - Lisätty demo-komponentti `AIAssistantDemo.jsx` tukihenkilöassistentin simuloimiseksi
  - Mahdollisuus testata avustajaa kolmella erilaisella tikettiskenaariolla
  - Toteutettu ammattimainen kaksiosainen käyttöliittymä, jossa tiketin tiedot ja keskusteluhistoria
  - Lisätty tuki tietopankin artikkelien selaamiselle 
  - Simuloitu AI-avustajan chat-käyttöliittymä, joka reagoi käyttäjän kysymyksiin
  - Lisätty kirjoitusindikaattori, esimerkkikysymykset ja keskusteluhistoria
  - Käytetty edistyksellisiä UI-komponentteja: animaatiot, konfiguroidontipaneeli, responsiivinen asettelu
  - Toteutettu toimiva markdown-muotoilu AI-vastauksissa (lihavointi, kursivointi, listat)

# 05.05.2025 - feat: Aktivoitu tukihenkilöassistentin AITools-välilehti

- **AITools-käyttöliittymän parannus:**
  - Aktivoitu "AI-avustaja"-välilehti AITools-sivulla (`AITools.jsx`)
  - Integroitu AIAssistantInfo-komponentti tukihenkilöassistentti-välilehdelle
  - Poistettu "Tulossa"-merkintä välilehdestä
  - Korvattu placeholder-sisältö informatiivisella AIAssistantInfo-komponentilla
  - Päivitetty välilehden tila aktiiviseksi (`disabled: false`)

# 05.05.2025 - feat: Uudistettu tukihenkilöassistentin käyttöliittymä ammattimaisemmaksi

- **SupportAssistantChat-käyttöliittymän uudistus:**
  - Uudistettu käyttöliittymän visuaalinen ilme modernimmaksi ja ammatimaisemmaksi
  - Lisätty hienovaraisia gradientteja ja varjostuksia luomaan syvyysvaikutelmaa
  - Parannettu elementtien välistystä, marginaaleja ja pyöristyksiä
  - Lisätty visuaalisia tehosteita (taustakuviot, animaatiot, hover-tyylit)
  - Paranneltu painikkeiden ja vuorovaikutuselementtien tyylejä
  - Optimoitu käyttöliittymän responsiivisuutta ja selkeyttä
  - Tehostettu tekstin luettavuutta ja hienovaraisuutta
  - Lisätty hienostuneempia animaatioita ja siirtymiä
  - Parannettu tiketin tietojen näkyvyyttä otsikossa

# 05.05.2025 - fix: Korjattu tukihenkilöassistentin tekstialueen automaattinen koon muutos

- **SupportAssistantChat-tekstialue korjaus:**
  - Korjattu ongelma, jossa pitkän tekstin syöttäminen ei kasvattanut tekstialueen korkeutta automaattisesti
  - Toteutettu automaattinen tekstialueen koon muutos, joka huomioi sekä rivinvaihdot että pitkät rivit
  - Käytetty scrollHeight-arvoa tekstialueen korkeuden dynaamiseen säätämiseen
  - Parannettu käyttöliittymän reagointia reaaliajassa kirjoitettaessa
  - Korjattu vierityspalkkien näkyvyys: vierityspalkit ilmestyvät automaattisesti, kun teksti ylittää maksimikoon
  - Lisätty dynaaminen overflow-tyylin hallinta tekstisisällön pituuden perusteella

# 05.05.2025 - fix: Paranneltu tukihenkilöassistentin käyttöliittymää

- **SupportAssistantChat-parannukset:**
  - Vaihdettu yhden rivin tekstikenttä moniriviseksi tekstialueeksi (textarea)
  - Tekstialue kasvaa automaattisesti tekstin määrän mukaan (max 4 riviä)
  - Lisätty tuki Enter-näppäimen käyttöön viestin lähettämiseen (Shift+Enter lisää rivinvaihdon)
  - Muutettu aikaleimoja käyttämään suomalaista aika- ja päivämäärämuotoa (24h kello)
  - Muokattu tekstialueen ulkoasua helpommin käytettäväksi (pyöristetty reunat)
  - Päivitetty ohjeteksti osoittamaan uusia näppäinkomentoja

# 05.05.2025 - fix: Paranneltu tukihenkilöassistentin tietämysartikkelien hakua

- **SupportAssistantAgent-parannukset:**
  - Muutettu assistentin tapa hakea tietämysartikkeleita
  - Poistettu kategoriaperusteinen haku, joka palautti yleiset artikkelit
  - Muokattu haku käyttämään vain tiketin ID:tä `relatedTicketIds`-kentässä
  - Tämä varmistaa, että assistentti antaa ainoastaan suoraan tikettiin liittyvää täsmällistä tietoa
  - Päivitetty dokumentaatio muutosten mukaisesti (`supportAssistantAgent.md`)

# 04.05.2025 - feat: Tukihenkilön AI assistentti

# 30.04.2025 - fix: Korjattu AI-chatin toimintaa ja lisätty kirjoitusindikaattori
- **AI Chat Agent -korjaukset (`TicketDetailsModal`, `CommentSection`):
  - Korjattu ongelma, jossa AI-agentin vastaukset saattoivat näkyä väärässä järjestyksessä (ennen käyttäjän viestiä).
  - Varmistettu kommenttien tallennusjärjestys backendissä (`ticketController.ts`) ennen AI-vastauksen generointia.
  - Lisätty ID toissijaiseksi lajitteluavaimeksi frontendin kommenttilistoihin (`TicketDetailsModal.jsx`) aikaleimojen ollessa identtiset.
  - Korjattu ongelma, jossa AI-vastaukset eivät päivittyneet reaaliaikaisesti käyttöliittymään ilman modaalin uudelleenavaamista.
  - Toteutettu WebSocket-kuuntelija (`CommentSection.jsx`, `TicketDetailsModal.jsx`) vastaanottamaan `'newComment'`-tapahtumia ja päivittämään näkymä.
  - Lisätty backend-logiikka (`socketService.ts`, `ticketController.ts`, `aiController.ts`) lähettämään `'newComment'`-tapahtumat asiaankuuluville käyttäjille.
  - Korjattu bugi, jossa `@mentions` välilyönneillä ei tunnistettu oikein (`ticketController.ts`).
  - Korjattu bugi, jossa profiilikuvat eivät näkyneet kommenteissa (`CommentSection.jsx`).
- **Uusi ominaisuus: AI Typing Indicator:**
  - Lisätty reaaliaikainen kirjoitusindikaattori (`CommentSection.jsx`), joka näyttää, kun AI-agentti käsittelee ja generoi vastausta.
  - Lisätty backend-logiikka (`socketService.ts`, `aiController.ts`) lähettämään `'updateTypingStatus'` (start/stop) -tapahtumat WebSocketin kautta.

# 17.04.2025 - feat: Parannettu tiketin poistoprosessia ja käyttöliittymää + bulk-generointi AI-tiketeille
- **Käyttöliittymän parannukset (TicketList):**
  - Korvattu tiketin poiston vahvistusdialogi (`AlertDialog`) `react-hot-toast`-ilmoituksella, joka sisältää vahvistus- ja peruutuspainikkeet.
  - Korjattu `AlertDialog`-importtivirhe ja parannettu käyttökokemusta poiston vahvistuksessa.
  - Varmistettu `authService.acquireToken()`-metodin käyttö tokenin hakemiseen poisto-operaatiossa `localStorage`:n sijaan.
- **Backendin korjaukset (Ticket Deletion):**
  - Muokattu `ticketService.deleteTicket`-funktiota merkittävästi vankemmaksi.
  - Varmistettu, että kaikki tikettiin liittyvät tietueet (Kommentit, Liitetiedostot tietokannasta, Mahdolliset KnowledgeArticlet AI-tiketeille) poistetaan *ennen* itse tiketin poistamista.
  - Kaikki poistotoiminnot suoritetaan nyt yhden Prisma-transaktion (`prisma.$transaction`) sisällä atomisuuden takaamiseksi.
  - Lisätty toiminnallisuus poistamaan myös liitetiedostot palvelimen tiedostojärjestelmästä (`fs.unlink`) osana transaktiota.
  - Korjattu `P2003` (Foreign key constraint violation) -virheet, jotka saattoivat ilmetä kommenttien tai liitetiedostojen takia.
  - Estetty orpojen tietueiden (kommentit, liitteet, knowledge articles) ja tiedostojen jääminen järjestelmään tiketin poiston jälkeen.
  Tikettigeneraattori:
    - **Bulk-generointi:**
    - Lisätty määrä-kenttä (`ticketCount`), jolla voi generoida useita tikettejä kerralla.
    - Esikatselunäkymä näyttää nyt listan generoiduista tiketeistä.
    - Vahvistus luo kaikki jäljellä olevat esikatsellut tiketit kerralla.
  - **Esikatselun hallinta:**
    - Lisätty "Poista"-painike jokaiseen esikatselukohtaan, jolla voi poistaa ei-toivotut tiketit ennen vahvistusta.
    - Lisätty "Generoi uudelleen"-painike jokaiseen esikatselukohtaan, jolla voi generoida kyseisen tiketin ja ratkaisun uudelleen.
  - **Käyttöliittymäparannukset:**
    - Luotujen tikettien listassa "Avaa"-painike avaa nyt `TicketDetailsModal`-ikkunan uuden sivun sijaan.
    - Lokit tyhjennetään nyt automaattisesti, kun uusi generointi aloitetaan.
    - Päivitetty painikkeiden tekstejä ja tiloja vastaamaan bulk-toiminnallisuutta.
    - Estetty tiketin osoitus tukihenkilölle, jos generoidaan useampi kuin yksi tiketti.

# 16.04.2025 - feat: Lisätty esikatselu- ja vahvistusvaihe AI-tikettien luontiin
- **AI-tikettien luonnin työnkulku:**
  - Muokattu tiketin luontia sisältämään esikatseluvaiheen ennen tallennusta.
  - Admin/Tukihenkilö luo nyt ensin esikatselun ja vahvistaa sen jälkeen tiketin luonnin.
  - Ratkaisu luodaan nyt *esikatseluvaiheessa* ja näytetään käyttäjälle.
  - Backend API jaettu `/generate-ticket-preview`- ja `/confirm-ticket-creation`-päätepisteisiin.
  - Frontend (`AITicketGenerator.jsx`) päivitetty käsittelemään kaksivaiheisen prosessin (esikatseludata, vahvista/peruuta-painikkeet).
- **AI-kontekstin parannukset:**
  - `userProfile` (student, teacher, jne.) käännetään nyt suomeksi ennen sen käyttöä prompteissa sekä `TicketGeneratorAgent`- että `ChatAgent`-agenteille paremman kontekstuaalisen tarkkuuden saavuttamiseksi.
- **Backend (`TicketGeneratorAgent`):**
  - Lisätty uusi metodi `generateSolutionForPreview` luomaan ratkaisu raakadatan perusteella (ilman tallennettua ID:tä).
  - Alkuperäinen `generateSolution(ticketId)`-metodi säilytetty on-demand-generointia varten erillisen päätepisteen (`/api/ai/tickets/:ticketId/generate-solution`) kautta.
  - Lisätty kattava `console.debug`-lokitus agentin suorituksen seurantaan, mukaan lukien lopulliset LLM-syötteet.
- **Virheenkorjaukset:**
  - Korjattu `toast.info is not a function` -virhe `AITicketGenerator.jsx`:ssä korvaamalla se standardilla `toast()`-kutsulla.

# 14.04.2025 - feat: Parannettu AI-tikettianalyysiä ja lisätty yhteenvetoagentti
- **Tikettien analyysin käyttöliittymäparannukset:**
  - Korvattu sivulla olleet suodattimet modaali-ikkunalla ("Suodattimet").
  - Lisätty suodatusvaihtoehdot dialogiin: Kategoria, Vastuuhenkilö (automaattitäydennyksellä), Tila, AI-interaktioiden vähimmäismäärä, Luontipäivämääräväli.
  - Lisätty dialogiin "Tyhjennä suodattimet" -painike.
  - Toteutettu taulukon sarakkeiden lajittelu (Otsikko, Kategoria, Vastuuhenkilö, Luotu, Tila, AI Interaktiot).
  - Toteutettu sivutus tikettilistalle.
  - Lisätty yhteenvetotilastojen osio taulukon yläpuolelle (Tikettejä yhteensä, Keskim. AI Interaktiot, Tikettien jakauma tilan mukaan).
- **AI-keskustelun yhteenveto:**
  - Lisätty ominaisuus AI-yhteenvetojen luomiseksi tikettikeskusteluista Keskustelu-modaalissa.
  - Yhteenvedon luonti käynnistetään painikkeella laajennettavassa osiossa.
  - Luodut yhteenvedot tallennetaan `Ticket`-mallin `aiSummary`-kenttään.
  - Toteutettu yhteenvedon uudelleengenerointi.
  - Suodatettu järjestelmäviestit pois yhteenvedon AI:lle annettavasta keskusteluhistoriasta.
  - Annettu tiketin nykyinen tila yhteenvedon AI:lle paremman kontekstin saamiseksi.
- **Uusi agentti: SummarizerAgent:**
  - Luotu `SummarizerAgent` (`backend/src/ai/agents/summarizerAgent.ts`) käsittelemään keskusteluyhteenvetojen logiikkaa.
  - Luotu `CONVERSATION_SUMMARY_PROMPT` (`backend/src/ai/prompts/conversationSummaryPrompt.ts`).
  - Refaktoroitu backend-kontrolleri (`aiController.ts`) käyttämään uutta agenttia.
- **Backend-päivitykset:**
  - Muokattu `/api/ai/analysis/tickets` -päätepistettä tukemaan uusia suodattimia, lajittelua ja sivutusta, sekä palauttamaan aggregaatit/sivutustiedot.
  - Lisätty Prisma-migraatio lisäämään `aiSummary`-kenttä `Ticket`-malliin.
  - Lisätty `/api/ai/tickets/:id/summarize` -päätepiste.
  - Päivitetty `/api/ai/analysis/tickets/:ticketId/conversation` -päätepiste palauttamaan tallennettu yhteenveto.
- **Frontend-päivitykset:**
  - Päivitetty `AiTicketAnalysis.jsx` sisältämään suodatindialogin integraation, tilastojen näytön, lajittelukäsittelijät, sivutuksen integraation.
  - Luotu `FilterDialog.jsx` ja `PaginationControls.jsx` -komponentit.
  - Päivitetty `ConversationModal.jsx` käsittelemään yhteenvedon näyttämisen, luonnin, tallennuksen ja uudelleengeneroinnin laajennettavassa osiossa.

# 14.04.2025 - feat: Lisätty AI-tikettianalyysi-välilehti
- Lisätty uusi "Tikettien analyysi" -välilehti AI Tools -sivulle Admin-käyttäjille.
- Välilehti näyttää listan AI-generoiduista tiketeistä.
- Adminit voivat tarkastella tukihenkilöiden ja ChatAgentin välistä keskusteluhistoriaa kullekin AI-tiketille modaalin kautta.
- Lisätty arviointimerkit (EARLY, PROGRESSING, CLOSE, SOLVED, ERROR) AI-kommentteihin keskustelumodaalissa, sisältäen tooltipit kunkin tilan selittämiseksi.
- Lisätty AI-generoidun oikean ratkaisun näyttö keskustelumodaaliin (laajennettava osio).
- Lisätty mahdollisuus avata ratkaisu erilliseen ikkunaan keskustelumodaalin viereen.
- Varmistettu responsiivinen suunnittelu modaalin ja ikkunan pinoamiseksi mobiililaitteilla.
- Käännetty käyttöliittymäelementit suomeksi.
- Toteutettu backend-päätepisteet (`/api/ai/analysis/tickets`, `/api/ai/analysis/tickets/:ticketId/conversation`, `/api/ai/tickets/:ticketId/solution`).
- Luotu/päivitetty frontend-komponentit (`AiTicketAnalysis.jsx`, `ConversationModal.jsx`, `SolutionWindow.jsx`) käyttäen Tailwind/Lucide/Axiosia.

# 10.04.2025 (Implemented chat agent for AI tickets and improved solution format)

- Toteutettu ChatAgent keskustelemaan tukihenkilöiden kanssa AI-generoiduissa tiketeissä:
  - Uusi tekoälyagentti, joka simuloi käyttäjää tikettikeskusteluissa
  - Agentti arvioi, kuinka lähellä tukihenkilön ehdotus on oikeaa ratkaisua
  - Agentti osoittaa tilanteeseen sopivia tunteita (turhautuminen, kiitollisuus) keskustelussa
  - Automaattinen aktivointi kun tukihenkilö kommentoi AI-generoitua tikettiä
  - Luotu dokumentaatio chatAgent-toiminnallisuudesta

- Parannettu tekoälyn tikettien ratkaisugeneraattoria:
  - Korjattu ongelma, jossa tikettigeneraattori ei määritellyt selkeästi mikä toimenpide lopulta ratkaisi ongelman
  - Luotu erillinen SOLUTION_GENERATOR_PROMPT-tiedosto parempaa modulaarisuutta varten
  - Päivitetty ratkaisupromptia sisältämään selkeä osio "Mikä lopulta korjasi ongelman"
  - Muokattu ratkaisun otsikkorakennetta sisältämään sekä ongelma että ratkaisu
  - Paranneltu ratkaisujen jäsentelyä analyysistä konkreettiseen ratkaisuun
  - Tehty tietokantaintegraatio tunnistamaan ja käyttämään ratkaisun otsikkomuotoa

# 10.04.2025 (Containerized backend application with Docker)

- Lisätty Docker-kontitus backend-sovellukselle:
  - Luotu Dockerfile backend-sovellukselle multi-stage buildilla
  - Päivitetty docker-compose.yml sisältämään sekä backend- että PostgreSQL-kontit
  - Siirretty tarvittavat kehitysriippuvuudet (@prisma/client, langchain, ym.) tuotantoriippuvuuksiksi Docker-kontissa
  - Toteutettu automaattinen tietokannan migraatioiden suoritus kontin käynnistyessä
  - Lisätty volumet tietokannan ja upload-tiedostojen persistoimiseksi
  - Päivitetty dokumentaatio Docker-konttien käytöstä (docs.md)

# 12.03.2025 (Improved AI documentation structure)

- Selkeytetty tekoälydokumentaation rakennetta:
  - Virtaviivaistettu ai-docs.md sisältöä poistamalla päällekkäisyyksiä
  - Tiivistetty tikettigeneraattorin kuvaus yleiseksi esittelyksi
  - Ohjattu käyttäjät erillisiin agenttidokumentteihin yksityiskohtia varten
  - Parannettu linkkejä dokumenttien välillä navigoinnin helpottamiseksi

# 12.03.2025 (Restructured AI agent documentation)

- Uudistettu tekoälyagenttien dokumentaatiorakennetta:
  - Luotu erillinen `ai-agents` hakemisto yksityiskohtaiselle agenttidokumentaatiolle
  - Siirretty tikettien generaattorin dokumentaatio omaan tiedostoonsa `ticketGenerator.md`
  - Luotu `index.md` hakemistosivu, joka listaa kaikki saatavilla ja tulevat agentit
  - Päivitetty pääasiallinen `ai-docs.md` dokumentaatio viittaamaan uuteen rakenteeseen
  - Parannettu dokumentaatiorakennetta tulevien agenttien lisäämisen helpottamiseksi

# 12.03.2025 (Fixed responseFormat parameter in AI ticket generator and improved documentation)

- Korjattu tekoälygeneraattorin vastausmuodon (responseFormat) käsittely:
  - Korjattu bug, jossa käyttäjän valitsemaa vastausmuotoa ei huomioitu
  - Lisätty responseFormat-parametrin validointi
  - Päivitetty aiController välittämään responseFormat-parametri agentille
  - Lisätty lokiviestit vastausmuodon käsittelyn seurantaan
- Paranneltu tekoälydokumentaatiota:
  - Luotu erillinen ai-agents.md -dokumentti tekoälyagenttien dokumentaatiota varten
  - Siirretty agenttien yksityiskohtainen dokumentaatio erilliseen tiedostoon
  - Päivitetty yleinen ai-docs.md viittaamaan uuteen agenttidokumentaatioon
  - Lisätty ohjeistusta vastausmuoto-ongelmien ratkaisuun

# 11.03.2025 (Korjattu tekoälytyökalujen kieliasetus ja konfiguraation käyttö)

- Paranneltu tekoälytyökalujen suomenkielistä toteutusta:
  - Muutettu tikettien generointipromptit tuottamaan sisältöä suomeksi
  - Lisätty selkeät ohjeet suomen kielen käyttöön prompteissa
  - Varmistettu asianmukaisen IT-terminologian käyttö suomeksi
- Optimoitu AI_CONFIG-konfiguraation hyödyntämistä:
  - Lisätty automaattinen prioriteettien määritys vaikeustason perusteella (helppo → LOW, jne.)
  - Implementoitu kuvauksen maksimipituuden rajoitus konfiguraation mukaisesti
  - Parannettu vastausformaatin validointia hyödyntäen konfiguraatiomäärityksiä
  - Lisätty virheenkäsittely puuttuville tai virheellisille parametreille
- Päivitetty tekoälytyökalujen dokumentaatiota (ai-docs.md):
  - Lisätty osio kieliasetusten selventämiseksi
  - Dokumentoitu konfiguraation käyttö tarkemmin
  - Lisätty esimerkkejä keskeisimmistä konfiguraatioasetuksista

# 11.03.2025 (Implemented AI ticket generator and tools infrastructure)

- Lisätty tekoälytyökalut järjestelmään:
  - Toteutettu AI-tikettien generointijärjestelmä koulutuskäyttöön (mahdollisuus generoida useita tikettejä kerralla).
  - Integroitu LangChain.js-kirjasto tekoälysovelluksia varten
  - Lisätty backend API tikettigeneraattorin käyttöön
  - Luotu käyttöliittymä AI-työkaluille (/ai-tools)
  - Näytetään AI-työkalujen linkit navigaatioissa admin- ja tukikäyttäjille
  - Lisätty kattava dokumentaatio tekoälyominaisuuksista (ai-docs.md)
- Paranneltu järjestelmän modulaarisuutta:
  - Erotettu tekoälykomponentit omiin tiedostoihinsa
  - Lisätty konfiguraatiojärjestelmä AI-mallin asetuksille
  - Toteutettu parametrisoitavat promptit tekoälyominaisuuksia varten

# 10.03.2025 (Optimized Microsoft Graph API profile picture integration)

- Optimized profile picture fetching to reduce API calls to Microsoft Graph:
  - Profile pictures are now cached in the database
  - Microsoft Graph API is only called when necessary:
    - When a user first logs in
    - Once a week during login to refresh the profile picture
    - Once a day when visiting the profile page (if needed)
  - Added frontend caching using localStorage to track last refresh time
- Improved loading performance by checking for cached profile pictures first
- Maintained the ability to display profile pictures throughout the application
- Added informative message on profile page about Microsoft synchronization

## 10.03.2025 (Integrated profile pictures with Microsoft Graph API)

- Modified the profile picture system to exclusively use Microsoft Graph API
- Added backend caching to store Microsoft profile pictures in the database
- Removed the ability for users to upload custom profile pictures
- Synchronizes profile pictures when users log in and visit their profile page
- Added profile pictures to user interfaces throughout the application
- Profile pictures are now displayed for all users across the system

## 10.03.2025 (Added jobTitle badges to User Management dialog)

- Lisätty käyttäjien ryhmätiedot (jobTitle) näkyviin käyttäjänhallintadialogiin
  - Ryhmätieto näytetään pienenä badgena käyttäjän nimen vieressä
  - Tieto haetaan Microsoft-kirjautumisen yhteydessä MSAL-tokenista
  - Tietokantarakennetta päivitetty tallentamaan jobTitle-kenttä
  - Hakutoiminto etsii myös ryhmätiedon perusteella
  - Toteutettu sekä työpöytä- että mobiiliversioissa
- Lisätty ryhmätieto myös käyttäjän profiilisivulle
  - Näytetään visuaalisena badgena roolitiedon vieressä
  - Lisätty myös profiilitietoihin omana kenttänään

## 10.03.2025 (Added search functionality to User Management dialog)

- Lisätty hakutoiminto käyttäjänhallintadialogiin
  - Mahdollisuus hakea käyttäjiä nimen tai sähköpostin perusteella
  - Hakukenttä ja tulosten suodatus reaaliajassa
  - Hakutulosten määrän näyttäminen
  - Hakutulosten tyhjentäminen -painike
  - Tyylitelty yhtenäisesti muun käyttöliittymän kanssa

## 10.03.2025 (Added User Management button for admins in mobile view)

- Lisätty Käyttäjänhallinta-painike admin-käyttäjille mobiilinavigaatioon
  - Painike avaa käyttäjänhallintadialogin suoraan mobiilinavigaatiosta
  - Muokattu mobiilinavigaation asettelua admin-käyttäjille (5 painiketta 4:n sijaan)
  - Varmistettu yhtenäinen käyttökokemus työpöytä- ja mobiiliversioiden välillä

## 09.03.2025 (Improved media comment handling in tickets)

- Paranneltu mediakommenttien työnkulkua tiketeissä:
  - Tukihenkilöiden on nyt lisättävä mediavastaus (kuva/video) ensin ennen tekstikommentteja tiketeissä, jotka vaativat mediaa
  - Lisätty selkeä käyttäjäpalaute, kun yritetään lisätä tekstikommenttia ennen mediaa
  - Toteutettu automaattinen tunnistus, kun mediavastaus on jo annettu
- Lisätty mediakommenttien tuki tiketin luojille: 
  - Tiketin luojat voivat nyt lisätä kuvia ja videoita kommentteihin missä tahansa vaiheessa tiketin käsittelyä
  - Paranneltu mediasisällön näyttämistä kommenteissa selkeämmäksi
- Paranneltu virheenhallintaa kommentoinnissa:
  - Lisätty käyttäjäystävälliset virheilmoitukset suoraan käyttöliittymään
  - Tarkennettu ohjeistus median lisäämisestä selkeämmäksi
  - Pidennetty virheilmoitusten näyttöaikaa käyttökokemuksen parantamiseksi

## 09.03.2025 (Added profile pictures and improved responsiveness)

- Lisätty Microsoft-profiilikuvien tuki käyttäjille käyttäen Microsoft Graph API:a
- Toteutettu profiilikuvien näyttäminen headerissa, käyttäjäprofiilissa ja kommenteissa
- Lisätty automaattinen fallback käyttäjien nimikirjaimiin, jos profiilikuvaa ei ole saatavilla
- Parannettu tiketinnäkymän responsiivisuutta mobiililaitteilla
- Uudistettu kommenttiosion ulkoasua profiilikuvien kanssa selkeämmäksi
- Paranneltu toimintovalikkoa (dropdown) mobile-käyttöliittymässä
  - Lisätty fullscreen-overlay mobiililaitteilla
  - Siirretty valikko näytön alalaitaan mobiililaitteilla
  - Suurennettu painikkeiden kokoa kosketuskäyttöä varten
  - Lisätty sulkemispainike mobiiliversioon
- Parannettu kaikkien lomakkeiden ja komponenttien responsiivisuutta eri näyttökoilla
- Muokattu ilmoitusasetuksia selkeämmiksi ja responsiivisemmiksi

## 09.03.2025 (Improved ticket actions with dropdown menu)

- Lisätty dropdown-valikko tiketin toiminnoille (Vapauta, Siirrä toiselle, Merkitse ratkaistuksi, Sulje tiketti)
- Parannettu käyttöliittymän tilankäyttöä korvaamalla useat painikkeet yhdellä toimintovalikolla
- Toteutettu responsiivinen dropdown-ratkaisu, joka toimii hyvin mobiililaitteilla
- Lisätty kuvakkeet kaikille toiminnoille selkeyttämään käyttöliittymää
- Yhtenäistetty tiketin toimintojen käyttöliittymä sekä TicketDetailsModal- että TicketPage-komponenteissa

## 09.03.2025 (Made user management dialog responsive on mobile)

- Päivitetty käyttäjien hallintadialogia responsiiviseksi mobiililaitteilla
- Lisätty korttipohjainen näkymä mobiililaitteille taulukkonäkymän sijaan
- Optimoitu painikkeiden asettelu pienillä näytöillä
- Parannettu dialogin kokoa ja padding-arvoja eri näyttöko'oilla
- Lisätty mediakyselyt (media queries) responsiisuuden varmistamiseksi

## 03.03.2025 (Enhanced support staff permissions for media comments)

- Parannettu tukihenkilöiden työnkulkua sallimalla kaikille tukihenkilöille mediakommenttien (kuvat, videot) lisääminen tiketteihin riippumatta siitä, onko tiketti heille osoitettu
- Päivitetty käyttöliittymä näyttämään mediakommenttipainike kaikille tukihenkilöille kaikkien tikettien yhteydessä
- Poistettu rajoitus, joka vaati tiketin osoittamista tukihenkilölle ennen mediakommenttien lisäämistä
- Tukihenkilöt voivat nyt helpommin auttaa toisiaan jakamalla visuaalista materiaalia kaikkiin tiketteihin
- Päivitetty dokumentaatio vastaamaan uutta ominaisuutta (API-dokumentaatio ja README.md)

## 03.03.2025 (Implemented attachment functionality for ticket creation)

- Lisätty mahdollisuus liittää tiedostoja tiketteihin sitä luodessa
- Parannettu liitetiedostojen näyttämistä tikettinäkymissä:
  - Ammattimainen ulkoasu liitetiedostoille grid-layoutilla
  - Kuvien esikatselu suoraan tiketissä ilman uuteen välilehteen siirtymistä
  - Kuvien lightbox-näkymä, joka mahdollistaa kuvien katselun täysikokoisena
  - Hover-efektit ja animaatiot käyttökokemuksen parantamiseksi
  - Tiedostotyypin mukaan mukautuva näkymä (kuvat, videot, muut tiedostot)
  - Yhtenäinen tiedostojen käsittely sekä TicketPage että TicketDetailsModal -komponenteissa

## 03.03.2025 (Implemented media response functionality for ticket comments)

- Lisätty mediaUrl ja mediaType -kentät Comment-malliin mediatiedostojen viittauksia varten
- Luotu tiedostojen lähetysjärjestelmä multer-kirjaston avulla kuvien ja videoiden käsittelyyn
- Toteutettu backend-reitit ja kontrollerit mediakommenttien käsittelyyn
- Päivitetty CommentSection-komponentti näyttämään mediasisältöä (kuvat ja videot)
- Lisätty käyttöliittymä tukihenkilöille mediatiedostojen lähettämiseen kun tiketti vaatii KUVA- tai VIDEO-vastauksen
- Parannettu kommenttien näyttämistä näyttämään asianmukaiset mediaformaatit
- Lisätty validointi varmistamaan, että tukihenkilöt vastaavat oikealla mediaformaatilla tiketin vaatimusten mukaisesti

# 03.03.2025 (Improved TicketPage and mention functionality)

### Added
- Päivitetty TicketPage-komponentti vastaamaan TicketDetailsModal-toiminnallisuutta:
  - Lisätty tiketin tilan hallinta
  - Lisätty API-mutaatiot tiketin päivittämiseen
  - Lisätty aikamäärittelyt ja formatointi
  - Lisätty tiketin kontrollit (vapauta, ratkaise, sulje, siirrä)
  - Lisätty CommentSection-komponentti
  - Lisätty Timeline-komponentti
  - Lisätty käyttöliittymän parannukset ja tyylit

### Changed
- Uudistettu @-maininta toiminnallisuus:
  - Yksinkertaistettu mainintalogiikka
  - Pakollinen valinta pudotusvalikosta
  - Selkeämpi visuaalinen erottelu mainituille käyttäjille
  - Parannettu CSS-tyylejä mainintoja varten
  - Lisätty nollalevyinen välilyönti (zero-width space) mainintojen erottamiseksi
  - Päivitetty regex-kaavat mainintojen tunnistamiseen

### Fixed
- Korjattu ongelma, jossa maininnat eivät toimineet oikein tekstin seuratessa niitä
- Korjattu mainintojen visuaalinen duplikaatio
- Korjattu ongelma, jossa käyttäjä jäi "maininta-tilaan" käyttäjän valinnan jälkeen
- Yksinkertaistettu mainintojen CSS-tyylejä

# 13.02.2025 part 3

### Added
- Lisätty ilmoitusjärjestelmä:
  - Reaaliaikaiset ilmoitukset WebSocket-yhteyden kautta
  - Ilmoitukset seuraavista tapahtumista:
    - Tiketin osoitus käsittelijälle
    - Uusi kommentti tiketissä
    - Tiketin tilan muutos
    - Tiketin prioriteetin muutos
    - @-maininta kommentissa
    - Deadline lähestyy (tulossa)
  - Ilmoitusten hallintapaneeli kellokuvakkeen takana
  - Ilmoitusten merkitseminen luetuiksi
  - Ilmoitusten poistaminen
- Lisätty ilmoitusasetukset:
  - Selainilmoitusten hallinta
  - Sähköposti-ilmoitusten hallinta (tulossa)
  - Yksityiskohtaiset asetukset eri ilmoitustyypeille
  - Asetukset tallennetaan käyttäjäkohtaisesti
- Lisätty profiilisivu:
  - Käyttäjän perustiedot
  - Ilmoitusasetusten hallinta
  - Selkeämpi pääsy profiilisivulle headerissa
- Lisätty @-maininta kommentteihin:
  - Käyttäjien mainitseminen @-merkillä
  - Automaattinen käyttäjien ehdotus kirjoitettaessa
  - Visuaalinen korostus mainituille käyttäjille
  - Ilmoitus mainituille käyttäjille

### Changed
- Päivitetty käyttöliittymää:
  - Selkeämpi profiilipainike headerissa
  - Paranneltu ilmoitusten ulkoasua
  - Lisätty tooltippejä käyttöliittymän elementteihin
- Vaihdettu toast-kirjasto react-toastify:stä react-hot-toast:iin
- Parannettu ilmoitusten käsittelyä:
  - Ilmoitukset näytetään vain jos käyttäjä on sallinut ne
  - Duplikaatti-ilmoitusten esto
  - Parempi virheenkäsittely

### Fixed
- Korjattu tiketin luonnin validointi:
  - Laite-kenttä ei ole enää pakollinen
  - Null-arvojen oikea käsittely
- Korjattu ilmoitusten toiminta offline-tilassa
- Korjattu WebSocket-yhteyden uudelleenyhdistäminen

# 13.02.2024 part 2

### Added
- Lisätty mahdollisuus tiketin luojalle sulkea oma tikettinsä missä tahansa tilassa, paitsi jos tiketti on jo suljettu tai ratkaistu
- Lisätty värikoodatut järjestelmäviestit tapahtumahistoriaan:
  - Keltainen: "Tiketti otettu käsittelyyn" ja "IN_PROGRESS"-tilamuutokset
  - Vihreä: "Tiketti ratkaistu (RESOLVED)"
  - Harmaa: "Tiketti suljettu (CLOSED)"
  - Sininen: "Tiketti vapautettu"
  - Violetti: "Tiketin käsittelijä vaihdettu" ja siirtoviestit

### Changed
- Päivitetty tiketin käsittelyoikeuksien logiikkaa:
  - Tiketin luoja voi nyt sulkea tikettinsä missä tahansa tilassa
  - Parannettu käsittelijän vaihtamisen logiikkaa
- Uudistettu tapahtumahistorian ulkoasua:
  - Selkeämpi visuaalinen hierarkia
  - Parempi värikoodaus eri tapahtumatyypeille
  - Parannettu luettavuutta


# 13.02.2024

### Added
- Lisätty tukihenkilöiden työnäkymä:
  - Kaksi välilehteä:
    - "Käsittelyssä" - näyttää tukihenkilön omat käsittelyssä olevat tiketit
    - "Avoimet tiketit" - näyttää kaikki avoimet tiketit, joita ei ole otettu käsittelyyn
  - Automaattinen päivitys 30 sekunnin välein
  - Selkeä välilehtinäkymä tikettien määrillä
- Lisätty syötteen validointi (Zod):
  - Tiketin validointi:
    - title: String (5-100 merkkiä)
    - description: String (10-2000 merkkiä)
    - device: String (max 100 merkkiä), valinnainen
    - additionalInfo: String (max 1000 merkkiä), valinnainen, voi olla null
    - priority: Enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    - categoryId: UUID
    - responseFormat: Enum ('TEKSTI', 'KUVA', 'VIDEO'), oletuksena 'TEKSTI'
  - Kommentin validointi:
    - content: String (1-1000 merkkiä)
  - HTML-sanitointi kaikille syötteille
- Lisätty kommentoinnin rajoitukset:
  - Estetty kommentointi kun tiketti on ratkaistu tai suljettu
  - Tukihenkilö voi kommentoida vain ottaessaan tiketin käsittelyyn
  - Vain tiketin käsittelijä voi kommentoida käsittelyssä olevaa tikettiä
  - Tiketin luoja voi aina kommentoida (paitsi kun tiketti on suljettu/ratkaistu)

### Changed
- Parannettu backendin arkkitehtuuria:
  - Selkeämpi vastuunjako tiedostojen välillä
  - Express-asetukset keskitetty app.ts:ään
  - Palvelimen käynnistys siirretty index.ts:ään
  - Middleware-komponenttien järjestely
- Päivitetty validointia:
  - Lisätty tuki null-arvoille additionalInfo-kentässä
  - Lisätty oletusarvo responseFormat-kentälle


### Fixed
- Korjattu tiketin luonnin validointi:
  - Lisätty puuttuva responseFormat-kentän validointi
  - Korjattu additionalInfo-kentän null-arvojen käsittely

# 12.02.2025

### Added
- Lisätty tiketin käsittelyyn liittyvät toiminnot:
  - Tiketin vapauttaminen takaisin OPEN-tilaan
  - Tiketin tilan muuttaminen (RESOLVED, CLOSED)
  - Tiketin uudelleen avaaminen IN_PROGRESS-tilaan
  - Tiketin siirtäminen toiselle tukihenkilölle
- Lisätty käsittelyajan seuranta:
  - Käsittelyn aloitusaika (processingStartedAt)
  - Käsittelyn päättymisaika (processingEndedAt)
  - Arvioitu valmistumisaika prioriteetin mukaan (estimatedCompletionTime)
- Lisätty automaattiset kommentit tiketin tilan muutoksista
- Lisätty käsittelyajan näyttäminen tiketin tiedoissa
- Lisätty tiketin lukitus käsittelijälle:
  - Vain tiketin käsittelijä voi muokata tikettiä kun se on IN_PROGRESS-tilassa
  - Muut tukihenkilöt eivät voi ottaa käsittelyyn jo käsittelyssä olevaa tikettiä
  - Admin voi aina muokata tikettejä riippumatta tilasta
- Lisätty middleware käsittelyoikeuksien tarkistamiseen (canModifyTicket)

### Changed
- Päivitetty TicketDetailsModal näyttämään uudet käsittelyyn liittyvät tiedot
- Parannettu tiketin käsittelyn käyttöliittymää:
  - Lisätty napit tiketin vapauttamiselle
  - Lisätty napit tilan muuttamiselle
  - Lisätty käsittelyaikojen näyttäminen
  - Lisätty nappi tiketin siirtämiselle toiselle tukihenkilölle
- Päivitetty tiketin käsittelylogiikka:
  - Tiketin ottaminen käsittelyyn lukitsee sen käsittelijälle
  - Tiketin vapauttaminen poistaa käsittelijän ja palauttaa tiketin OPEN-tilaan
  - Tiketin sulkeminen tai ratkaiseminen poistaa käsittelijän
  - Tiketin siirtäminen vaihtaa käsittelijän ja lisää automaattisen kommentin

### Fixed
- Korjattu tiketin käsittelyoikeuksien tarkistus
- Optimoitu tiketin tilan päivityksen logiikka
- Korjattu ongelma, jossa useampi tukihenkilö pystyi ottamaan saman tiketin käsittelyyn

# 10.02.2025

### Added
- Lisätty vastausmuoto (responseFormat) tiketteihin
- Lisätty uusi addComment API-funktio kommenttien lisäämiseen
- Parannettu kommenttien käsittelyä
  - Lisätty authMiddleware kommenttien lisäämiseen
  - Lisätty autentikoitu API-instanssi kommenttien käsittelyyn

### Changed
- Päivitetty TicketDetailsModal käyttämään uutta addComment-funktiota
- Parannettu kommenttien lisäämisen virhekäsittelyä
- Siirretty kommenttien käsittely käyttämään autentikoitua API-instanssia

### Fixed
- Korjattu kategoriasuodatuksen toiminta
  - Korjattu case-sensitive haku kategorioille
  - Lisätty tuki dynaamisille kategorioille
  - Korjattu kategorioiden nimet vastaamaan tietokannan arvoja
- Korjattu kommenttien autentikointi
  - Korjattu kommentoijan tietojen näyttäminen
  - Poistettu anonyymit kommentit
  - Korjattu käyttäjätietojen välitys backendille

### Security
- Parannettu kommenttien tietoturvaa
  - Lisätty autentikaatiotarkistukset
  - Varmistettu käyttäjän identiteetti kommentoinnissa

## 31.01.2025

### Added
- RBAC (Role-Based Access Control) järjestelmä
  - Kolmiportainen roolihierarkia (USER -> SUPPORT -> ADMIN)
  - Roolikohtaiset käyttöoikeudet ja näkymät
  - Dynaaminen käyttöliittymän mukautuminen roolin mukaan
- Käyttäjien hallintajärjestelmä
  - Käyttäjien listaus ja suodatus
  - Roolien hallinta käyttöliittymästä
  - Muutosten vahvistus ja peruutus
- Tukihenkilö-roolin (SUPPORT) toiminnallisuus
  - Pääsy hallintapaneeliin
  - Kaikkien tikettien käsittely
  - Tikettien tilan ja vastuuhenkilön muuttaminen
- Uudet näkymät ja komponentit
  - "Omat tiketit" -näkymä käyttäjille
  - Hallintapaneeli tukihenkilöille ja admineille
  - Käyttäjien hallintadialogi admineille

### Changed
- Päivitetty käyttöoikeuksien hallinta
  - Lisätty SUPPORT-roolin tarkistukset
  - Parannettu middlewaren toimintaa
  - Lisätty roolikohtaiset pääsyoikeudet API-endpointteihin
- Uudistettu navigaatiorakenne
  - Siirretty käyttäjien hallinta headeriin
  - Roolikohtaiset navigaatioelementit
  - Selkeämpi visuaalinen hierarkia
- Parannettu tikettien käsittelyä
  - Eriytetty omat tiketit ja kaikki tiketit

### Fixed
- Korjattu käyttöoikeuksien tarkistus tikettien käsittelyssä
- Korjattu roolien päivityksen aiheuttamat layout-ongelmat
- Korjattu virhetilanteiden käsittely käyttäjien hallinnassa

### Security
- Parannettu käyttöoikeuksien tarkistusta
  - Lisätty roolikohtaiset middleware-tarkistukset
  - Estetty luvaton pääsy hallintapaneeliin
  - Varmistettu, että vain admin voi muuttaa käyttäjien rooleja
  - Lisätty tarkistukset tikettien käsittelyoikeuksiin


## 30.01.2025

### Added
- MSA (Microsoft Authentication) integraatio
  - Azure AD kirjautuminen
  - Käyttäjien automaattinen luonti/synkronointi
- Autentikoinnin komponentit
  - AuthProvider
  - AuthGuard
  - Login-sivu

### Fixed
- Korjattu tyyppiongelmat autentikoinnissa
- Korjattu reitityksen ongelmat

## 30.01.2025

### Added
- Rakennettu yksittäisen tiketin näkymä:
  - pages/TicketDetails

### Changed
- Päivitetty tikettilistan näkymää

## 29.01.2025 v2

### Added
- Lisätty uudet kentät tiketteihin:
  - `device`: Laitteen tiedot (valinnainen)
  - `additionalInfo`: Lisätiedot (valinnainen)
- Lisätty kategorioiden hallinta
- Lisätty automaattinen migraatioiden ajo tuotannossa
- Lisätty Prisma Client:in automaattinen generointi asennuksen yhteydessä

### Changed
- Päivitetty tiketin luontilomake sisältämään uudet kentät
- Muokattu prioriteettiasteikkoa:
  - Lisätty "Kriittinen" taso
  - Muutettu "Korkea" prioriteetin väri punaisesta oranssiksi
- Päivitetty dokumentaatio vastaamaan uusia ominaisuuksia

### Fixed
- Korjattu kategorian tallennus tiketin luonnissa
- Korjattu tyyppiongelmat Prisma Clientin kanssa

## 29.01.2025

### Added
- Perustoiminnallisuudet:
  - Tikettien luonti ja hallinta
  - Käyttäjien hallinta
  - Kommentointi
  - Tilan ja prioriteetin hallinta
- Docker-pohjainen kehitysympäristö
- Prisma ORM ja PostgreSQL-tietokanta
- Perusdokumentaatio

## 27.01.2025

### Lisätty
- Uuden tiketin luonti
  - Komponentti NewTicketForm.jsx
  - UI-komponentteja src/components/ui


## 21.01.2025

### Lisätty
- Projektin perusrakenne
  - Frontend (React + Vite)
    - React Query datan hakuun
    - React Router navigointiin
    - Tikettien listausnäkymän pohja
    - Komponenttien perusrakenne
    - Tyylit (CSS)
  - Backend (TypeScript + Express)
    - Express-palvelin
    - Mock data tiketit
    - Perus API-endpointit (/api/health, /api/tickets)
    - Ympäristömuuttujien konfiguraatio (.env)

### Tekninen
- Projektin kansiorakenne
- Kehitysympäristön konfiguraatio
- API proxy konfiguroitu
- TypeScript konfiguraatio

## [Unreleased]

## [YYYY-MM-DD] - Short description of changes

### Added
- Added documentation for configuring frontend subdirectory deployment in `docs/docs.md`.

### Changed
- Configured Vite (`frontend/vite.config.js`) with `base: '/tiketti/'` for subdirectory deployment.

### Fixed
- Resolved 404 errors for frontend assets when served from a subdirectory.

