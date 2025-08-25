# Tietomalli (Prisma Schema)

Tämä dokumentti kuvaa tikettijärjestelmän tietokannan rakenteen käyttäen Prisma Schema -syntaksia. Prisma toimii ORM:nä (Object-Relational Mapper), joka helpottaa tietokantaoperaatioita TypeScript-koodissa.

## Yleiskatsaus

Tietomalli määrittelee järjestelmän keskeiset entiteetit, niiden attribuutit ja niiden väliset suhteet. Pääentiteetit ovat:

*   **User:** Järjestelmän käyttäjät (opiskelijat, tukihenkilöt, adminit).
*   **Ticket:** Tukipyynnöt.
*   **Comment:** Tiketteihin liittyvät kommentit.
*   **Category:** Tikettien luokittelukategoriat.
*   **Notification:** Käyttäjille lähetettävät ilmoitukset.
*   **NotificationSettings:** Käyttäjäkohtaiset ilmoitusasetukset.
*   **Attachment:** Tiketteihin liitetyt tiedostot.
*   **KnowledgeArticle:** Tietopankkiartikkelit.
*   **AIAssistantInteraction:** Tekoälyavustajan käyttötapahtumat.
*   **AIAssistantUsageStat:** Päivittäiset käyttöstatistiikat tekoälyavustajalle.
*   **AIAssistantCategoryStat:** Kategoriakohtaiset käyttöstatistiikat tekoälyavustajalle.
*   **SupportAssistantConversation:** Tukihenkilön ja tukihenkilöassistentin välinen keskusteluhistoria.
*   **AISettings:** Singleton-tietue AI-agenttien konfiguraatiota varten.

## Prisma Schema (`backend/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --------- ENUMERAATIOT ---------

enum UserRole {
  ADMIN
  USER
  SUPPORT
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ResponseFormat {
  TEKSTI
  KUVA
  VIDEO
}

enum NotificationType {
  TICKET_ASSIGNED
  COMMENT_ADDED
  STATUS_CHANGED
  PRIORITY_CHANGED
  MENTIONED
  DEADLINE_APPROACHING
}

// --------- MALLIT ---------

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String
  jobTitle        String?
  profilePicture  String?
  role            UserRole    @default(USER)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  comments        Comment[]
  assignedTickets Ticket[]    @relation("AssignedTickets")
  tickets         Ticket[]    @relation("CreatedTickets")
  notifications   Notification[]
  notificationSettings NotificationSettings?
  aiInteractions  AIAssistantInteraction[]
  supportAssistantConversations SupportAssistantConversation[]

  // @@map removed
}

model Ticket {
  id             String         @id @default(cuid())
  title          String
  description    String
  device         String?
  additionalInfo String?
  status         TicketStatus    @default(OPEN)
  priority       Priority        @default(MEDIUM)
  responseFormat ResponseFormat  @default(TEKSTI)
  aiSummary      String?         @db.Text
  userProfile    String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  processingStartedAt DateTime?
  processingEndedAt   DateTime?
  estimatedCompletionTime DateTime?
  createdById    String
  assignedToId   String?
  categoryId     String
  comments       Comment[]
  notifications  Notification[]
  attachments    Attachment[]
  assignedTo     User?           @relation("AssignedTickets", fields: [assignedToId], references: [id])
  category       Category        @relation(fields: [categoryId], references: [id])
  isAiGenerated  Boolean         @default(false)
  createdBy      User            @relation("CreatedTickets", fields: [createdById], references: [id])
  aiInteractions AIAssistantInteraction[]
  supportAssistantConversations SupportAssistantConversation[]

  // Removed resolvedAt, closedAt
  // Removed aiTrainingTicketId, aiTrainingTicket relation
  // @@map removed
}

model Attachment {
  id        String   @id @default(uuid())
  filename  String
  path      String
  mimetype  String
  size      Int
  createdAt DateTime @default(now())
  ticketId  String
  ticket    Ticket    @relation(fields: [ticketId], references: [id])

  @@index([ticketId])
  // @@map removed
}

model Comment {
  id            String   @id @default(uuid())
  content       String
  mediaUrl      String?  // URL to the media file (image or video)
  mediaType     String?  // Type of media (image or video)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  ticketId      String
  authorId      String
  author        User        @relation(fields: [authorId], references: [id])
  ticket        Ticket      @relation(fields: [ticketId], references: [id])
  isAiGenerated Boolean     @default(false)
  evaluationResult String?  // Stores the result from evaluateSolutionProgressWithLLM (EARLY, PROGRESSING, CLOSE, SOLVED)
  emotionalState String?    // For ModernChatAgent: frustrated, hopeful, excited, satisfied, confused
  reasoning     String?     // For ModernChatAgent: Internal reasoning about the evaluation (useful for analytics)
  shouldRevealHint Boolean @default(false) // For ModernChatAgent: Whether AI decided to give a hint

  @@index([ticketId])
  @@index([authorId])
  // @@map removed
}

model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  tickets     Ticket[]
  knowledgeArticles KnowledgeArticle[]
  aiCategoryStats AIAssistantCategoryStat[]

  // @@map removed
}

model Notification {
  id        String           @id @default(uuid())
  type      NotificationType
  content   String
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())
  updatedAt DateTime         @updatedAt
  userId    String
  ticketId  String?
  metadata  Json?
  user      User              @relation(fields: [userId], references: [id])
  ticket    Ticket?           @relation(fields: [ticketId], references: [id])

  @@index([userId])
  @@index([ticketId])
  // @@map removed
}

model NotificationSettings {
  id                    String   @id @default(uuid())
  userId                String   @unique
  webNotifications      Boolean   @default(true)
  notifyOnAssigned      Boolean   @default(true)
  notifyOnStatusChange  Boolean   @default(true)
  notifyOnComment       Boolean   @default(true)
  notifyOnPriority      Boolean   @default(true)
  notifyOnMention       Boolean   @default(true)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  user                  User      @relation(fields: [userId], references: [id])

  // @@map removed
}

model KnowledgeArticle {
  id            String   @id @default(uuid())
  title         String
  content       String   @db.Text
  categoryId    String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  relatedTicketIds String[]
  complexity    String?
  isAiGenerated Boolean  @default(false)
  category      Category  @relation(fields: [categoryId], references: [id])
}

// --------- TEKOÄLYASSISTENTTI-ANALYTIIKAN MALLIT ---------

model AIAssistantInteraction {
  id              String   @id @default(uuid())
  ticketId        String?
  userId          String
  query           String
  response        String   @db.Text
  responseTime    Float
  rating          Int?
  feedback        String?
  createdAt       DateTime @default(now())

  user            User        @relation(fields: [userId], references: [id])
  ticket          Ticket?     @relation(fields: [ticketId], references: [id])

  @@index([ticketId])
  @@index([userId])
  @@index([createdAt])
  // @@map removed
}

model AIAssistantUsageStat {
  id              String   @id @default(uuid())
  date            DateTime @default(now()) @db.Date
  totalInteractions Int
  avgResponseTime Float
  avgRating       Float?
  totalTicketsAssisted Int

  @@unique([date])
  // @@map removed
}

model AIAssistantCategoryStat {
  id              String   @id @default(uuid())
  categoryId      String
  date            DateTime @default(now()) @db.Date
  interactionCount Int
  
  category        Category @relation(fields: [categoryId], references: [id])
  
  @@unique([categoryId, date])
  @@index([date])
  // @@map removed
}

model SupportAssistantConversation {
  id                   String   @id @default(uuid())
  ticketId             String
  supportUserId        String
  conversationHistory  String   @db.Text
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  
  ticket               Ticket   @relation(fields: [ticketId], references: [id])
  supportUser          User     @relation(fields: [supportUserId], references: [id])
  
  @@unique([ticketId, supportUserId])
  // @@map removed
}

model AISettings {
  id                      String   @id @default(uuid())
  
  // ChatAgent Settings
  chatAgentVersion        String   @default("modern") // "modern" | "legacy"
  
  // Hint System Settings
  hintSystemEnabled       Boolean  @default(true)
  hintOnEarlyThreshold    Int      @default(3) // How many EARLY evaluations before hint
  hintOnProgressThreshold Int?     // How many PROGRESSING evaluations before hint (null = disabled)
  hintOnCloseThreshold    Int?     // How many CLOSE evaluations before hint (null = disabled)
  
  // Advanced Hint Settings
  hintCooldownTurns       Int      @default(0) // Minimum turns between hints (0 = no cooldown)
  hintMaxPerConversation  Int      @default(999) // Maximum hints per conversation (999 = effectively unlimited)
  
  // Metadata
  updatedBy               String?  // User ID who last updated settings
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  
  // There should only be one AISettings record (singleton pattern)
  @@index([id])
}

## Suhteet ja Kardinaalisuudet

*   **User <-> Ticket:**
    *   Yksi käyttäjä (`User`) voi luoda monta tikettiä (`Ticket[]`, `CreatedTickets`-relaatio). (1-to-N)
    *   Yksi käyttäjä (`User`) voi olla määrättynä monta tikettiä (`Ticket[]`, `AssignedTickets`-relaatio). (1-to-N)
    *   Yksi tiketti (`Ticket`) kuuluu yhdelle käyttäjälle (`User`, `createdBy`-kenttä).
    *   Yksi tiketti (`Ticket`) voi olla määrättynä yhdelle käyttäjälle (`User?`, `assignedTo`-kenttä) tai ei kenellekään.
*   **User <-> Comment:**
    *   Yksi käyttäjä (`User`) voi kirjoittaa monta kommenttia (`Comment[]`). (1-to-N)
    *   Yksi kommentti (`Comment`) kuuluu yhdelle käyttäjälle (`User`, `author`-kenttä).
*   **Ticket <-> Comment:**
    *   Yksi tiketti (`Ticket`) voi sisältää monta kommenttia (`Comment[]`). (1-to-N)
    *   Yksi kommentti (`Comment`) kuuluu yhteen tikettiin (`Ticket`).
*   **User <-> Notification:**
    *   Yksi käyttäjä (`User`) voi saada monta ilmoitusta (`Notification[]`). (1-to-N)
    *   Yksi ilmoitus (`Notification`) kuuluu yhdelle käyttäjälle (`User`).
*   **User <-> NotificationSettings:**
    *   Yksi käyttäjä (`User`) voi omistaa yhden ilmoitusasetuksen (`NotificationSettings?`). (1-to-1)
*   **Ticket <-> Category:**
    *   Yksi kategoria (`Category`) voi liittyä moneen tikettiin (`Ticket[]`). (1-to-N)
    *   Yksi tiketti (`Ticket`) voi kuulua yhteen kategoriaan (`Category`).
*   **Ticket <-> Attachment:**
    *   Yksi tiketti (`Ticket`) voi sisältää monta liitettä (`Attachment[]`). (1-to-N)
    *   Yksi liite (`Attachment`) kuuluu yhteen tikettiin (`Ticket`).
*   **Comment <-> Attachment:**
    *   ~~Yksi kommentti (`Comment`) voi sisältää monta liitettä (`Attachment[]`, `CommentAttachments`-relaatio). (1-to-N)~~
    *   ~~Yksi liite (`Attachment`) voi kuulua yhteen kommenttiin (`Comment?`).~~
*   **User <-> AIAssistantInteraction:**
    *   Yksi käyttäjä (`User`) voi suorittaa monta AI-assistentti-interaktiota (`AIAssistantInteraction[]`). (1-to-N)
    *   Yksi AI-assistentti-interaktio (`AIAssistantInteraction`) liittyy yhteen käyttäjään (`User`).
*   **Ticket <-> AIAssistantInteraction:**
    *   Yksi tiketti (`Ticket`) voi sisältää monta AI-assistentti-interaktiota (`AIAssistantInteraction[]`). (1-to-N)
    *   Yksi AI-assistentti-interaktio (`AIAssistantInteraction`) voi liittyä yhteen tikettiin (`Ticket?`) tai ei mihinkään.
*   **Category <-> AIAssistantCategoryStat:**
    *   Yksi kategoria (`Category`) voi liittyä moneen AI-assistentti-kategoriatilastoon (`AIAssistantCategoryStat[]`). (1-to-N)
    *   Yksi AI-assistentti-kategoriatilasto (`AIAssistantCategoryStat`) liittyy yhteen kategoriaan (`Category`).
*   **Category <-> KnowledgeArticle:**
    *   Yksi kategoria (`Category`) voi sisältää monta tietopankkiartikkelia (`KnowledgeArticle[]`). (1-to-N)
    *   Yksi tietopankkiartikkeli (`KnowledgeArticle`) kuuluu yhteen kategoriaan (`Category`).

## Kenttien Selitykset

*   `@id`: Määrittelee kentän pääavaimeksi.
*   `@default(uuid())`: Generoi automaattisesti UUID:n oletusarvoksi.
*   `@default(cuid())`: Generoi automaattisesti CUID:n oletusarvoksi (käytössä Ticket-mallissa).
*   `@default(now())`: Asettaa oletusarvoksi nykyisen aikaleiman.
*   `@updatedAt`: Päivittää aikaleiman automaattisesti, kun tietue päivitetään.
*   `@unique`: Varmistaa, että kentän arvo on uniikki taulussa.
*   `@relation(...)`: Määrittelee suhteen toiseen malliin.
    *   `fields`: Viittaa tämän mallin kenttään, joka toimii vierasavaimena.
    *   `references`: Viittaa toisen mallin kenttään (yleensä pääavain).
    *   `onDelete`: Määrittää, mitä tapahtuu viitatulle tietueelle, kun tämä tietue poistetaan (esim. `Cascade` poistaa myös viitatut, `SetNull` asettaa viiteavaimen `NULL`iksi). *Huom: Monista relaatioista on poistettu `onDelete`-määritykset, jolloin oletuskäyttäytyminen (yleensä estää poiston, jos viittauksia on) pätee.*
*   `@map(...)`: Määrittelee vastaavan sarakkeen nimen tietokannassa. *Huom: Useimmat `@map`-direktiivit on poistettu, joten Prisma käyttää oletusnimeämiskäytäntöä.*
*   `@db.Text`: Määrittelee kentän tietokantatyypiksi TEXT, joka soveltuu pitkille merkkijonoille.
*   `@db.Date`: Määrittelee kentän tietokantatyypiksi DATE (vain päivämäärä ilman aikaa).
*   `@@index([...])`: Luo tietokantaindeksin määritellyille kentille, mikä nopeuttaa kyselyjä.

## Suorituskykyindeksit

Tietokantaan on lisätty strategisia composite-indeksejä suorituskyvyn optimointiin (migration 20250821170053):

### Ticket-taulun indeksit
- **`Ticket_status_priority_idx`** (`status`, `priority`): Tehostaa tikettien suodatusta statuksen ja prioriteetin mukaan
- **`Ticket_assignedToId_status_idx`** (`assignedToId`, `status`): Nopeuttaa käsittelijäkohtaisia kyselyitä statuksen kanssa
- **`Ticket_categoryId_status_idx`** (`categoryId`, `status`): Tehostaa kategoriakohtaista tikettien suodatusta
- **`Ticket_createdAt_idx`** (`createdAt`): Nopeuttaa päivämääräperusteisia hakuja ja järjestämistä

### Notification-taulun indeksit
- **`Notification_userId_read_createdAt_idx`** (`userId`, `read`, `createdAt`): Tehostaa käyttäjäkohtaisten ilmoitusten hakua

### AIAssistantInteraction-taulun indeksit
- **`AIAssistantInteraction_createdAt_userId_idx`** (`createdAt`, `userId`): Nopeuttaa aikavälikyselyitä käyttäjäsuodatuksella

Nämä indeksit parantavat merkittävästi yleisimpien kyselyiden suorituskykyä, erityisesti:
- MyWorkView-näkymän tikettilistat
- Tikettien suodatus ja järjestäminen
- Ilmoitusten haku
- AI-analytiikan raportit

## Tietokannan Eheys ja Poistotoiminnot

Prisma ja sovelluslogiikka varmistavat tietokannan eheyden. Koska monista relaatioista on poistettu eksplisiittiset `onDelete`-säännöt (kuten `Cascade` tai `SetNull`), Prisman oletuskäyttäytyminen tietokantatasolla estää yleensä tietueen poistamisen, jos siihen on vielä viittauksia muista tauluista (Referential Integrity).

### Tikettin Poisto

Tiketin poistaminen käynnistää sarjan toimenpiteitä, jotka suoritetaan transaktiona tietokannan eheyden varmistamiseksi:

1.  **Liittyvien Kommenttien Poisto:** Kaikki tikettiin liittyvät `Comment`-tietueet poistetaan automaattisesti.
2.  **Liittyvien Liitetiedostojen Poisto:** Kaikki tikettiin liittyvät `Attachment`-tietueet poistetaan. Fyysisten tiedostojen poisto palvelimelta tulee myös hoitaa.
3.  **Liittyvien Ilmoitusten Poisto:** Tikettiin liittyvät `Notification`-tietueet poistetaan automaattisesti.
4.  **Liittyvien AI-interaktioiden Poisto:** Tikettiin liittyvät `AIAssistantInteraction`-tietueet poistetaan automaattisesti.
5.  **Liittyvien KnowledgeArticle-tietueiden Poisto:** Jos tiketti on AI-generoitu (`isAiGenerated = true`), siihen liittyvät `KnowledgeArticle`-tietueet poistetaan.
6.  **Varsinaisen Tiketin Poisto:** Lopuksi itse `Ticket`-tietue poistetaan.

On suositeltavaa kääriä nämä operaatiot **Prisman transaktioon** (`prisma.$transaction([...])`) sovelluslogiikassa, jotta varmistetaan, että kaikki vaiheet onnistuvat tai yksikään niistä ei toteudu, pitäen tietokannan konsistenttina.

Lisäksi tiedostojen poisto palvelimelta (fyysiset tiedostot `uploads`-kansiosta) on tärkeä osa poistoprosessia, joka tulee hoitaa sovelluslogiikassa (`ticketService.deleteTicket`) ennen tietokantatietueiden poistoa tai sen jälkeen osana samaa logiikkakokonaisuutta. 