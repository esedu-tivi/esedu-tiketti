# Tietomalli (Prisma Schema)

Tämä dokumentti kuvaa tikettijärjestelmän tietokannan rakenteen käyttäen Prisma Schema -syntaksia. Prisma toimii ORM:nä (Object-Relational Mapper), joka helpottaa tietokantaoperaatioita TypeScript-koodissa.

## Yleiskatsaus

Tietomalli määrittelee järjestelmän keskeiset entiteetit, niiden attribuutit ja niiden väliset suhteet. Pääentiteetit ovat:

*   **User:** Järjestelmän käyttäjät (opiskelijat, tukihenkilöt, adminit).
*   **Ticket:** Tukipyynnöt.
*   **Comment:** Tiketteihin liittyvät kommentit.
*   **Category:** Tikettien luokittelukategoriat.
*   **Notification:** Käyttäjille lähetettävät ilmoitukset.
*   **NotificationSetting:** Käyttäjäkohtaiset ilmoitusasetukset.
*   **Attachment:** Tiketteihin ja kommentteihin liitetyt tiedostot.
*   **AITrainingTicket:** Tekoälyn generoimat harjoitustiketit.
*   **AITrainingConversation:** Tekoälyn generoimien harjoitustikettien keskustelut.

## Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// --------- ENUMERAATIOT ---------

enum Role {
  USER
  SUPPORT
  ADMIN
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  WAITING_FOR_CUSTOMER
  WAITING_FOR_SUPPORT
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
}

enum NotificationType {
  TICKET_ASSIGNED
  TICKET_STATUS_CHANGED
  TICKET_PRIORITY_CHANGED
  NEW_COMMENT
  TICKET_RESOLVED
  TICKET_CLOSED
  MENTIONED_IN_COMMENT // Mahdollinen laajennus
}

// --------- MALLIT ---------

model User {
  id                   String                @id @default(uuid())
  email                String                @unique
  name                 String?
  role                 Role                  @default(USER)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  profilePictureUrl    String?               @map("profile_picture_url")
  tickets              Ticket[]              @relation("UserTickets")
  assignedTickets      Ticket[]              @relation("AssignedTickets")
  comments             Comment[]
  notifications        Notification[]
  notificationSettings NotificationSetting?  @relation("UserSettings")
  aiTrainingTickets    AITrainingTicket[]    @relation("UserAITickets")

  @@map("users")
}

model Ticket {
  id                   String                @id @default(uuid())
  title                String
  description          String
  status               TicketStatus          @default(OPEN)
  priority             TicketPriority        @default(MEDIUM)
  userId               String                @map("user_id")
  user                 User                  @relation("UserTickets", fields: [userId], references: [id], onDelete: Cascade)
  assignedToId         String?               @map("assigned_to_id")
  assignedTo           User?                 @relation("AssignedTickets", fields: [assignedToId], references: [id], onDelete: SetNull)
  categoryId           String?               @map("category_id")
  category             Category?             @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  resolvedAt           DateTime?             @map("resolved_at")
  closedAt             DateTime?             @map("closed_at")
  comments             Comment[]
  attachments          Attachment[]          @relation("TicketAttachments")
  aiTrainingTicket     AITrainingTicket?     @relation(fields: [aiTrainingTicketId], references: [id], onDelete: SetNull)
  aiTrainingTicketId   String?               @unique @map("ai_training_ticket_id")

  @@map("tickets")
}

model Comment {
  id          String       @id @default(uuid())
  content     String
  userId      String       @map("user_id")
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  ticketId    String       @map("ticket_id")
  ticket      Ticket       @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  attachments Attachment[] @relation("CommentAttachments")

  @@map("comments")
}

model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  tickets     Ticket[]

  @@map("categories")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  message   String
  ticketId  String?          @map("ticket_id") // Linkki tikettiin, jos relevantti
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now())

  @@map("notifications")
}

model NotificationSetting {
  id                       String   @id @default(uuid())
  userId                   String   @unique @map("user_id")
  user                     User     @relation("UserSettings", fields: [userId], references: [id], onDelete: Cascade)
  emailOnNewComment        Boolean  @default(true) @map("email_on_new_comment")
  emailOnStatusChange      Boolean  @default(true) @map("email_on_status_change")
  emailOnAssignment        Boolean  @default(true) @map("email_on_assignment")
  inAppOnNewComment        Boolean  @default(true) @map("in_app_on_new_comment")
  inAppOnStatusChange      Boolean  @default(true) @map("in_app_on_status_change")
  inAppOnAssignment        Boolean  @default(true) @map("in_app_on_assignment")
  // Lisää muita asetuksia tarvittaessa
  updatedAt                DateTime @updatedAt

  @@map("notification_settings")
}

model Attachment {
  id          String   @id @default(uuid())
  filename    String
  url         String   // URL tiedostoon (esim. S3, paikallinen polku)
  mimetype    String
  size        Int
  ticketId    String?  @map("ticket_id")
  ticket      Ticket?  @relation("TicketAttachments", fields: [ticketId], references: [id], onDelete: Cascade)
  commentId   String?  @map("comment_id")
  comment     Comment? @relation("CommentAttachments", fields: [commentId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@map("attachments")
}

// --------- TEKOÄLYHARJOITUSTEN MALLIT ---------

model AITrainingTicket {
  id               String                    @id @default(uuid())
  originalTicketId String?                   @unique @map("original_ticket_id") // Linkki mahdolliseen alkuperäiseen tikettiin
  generatedById    String                    @map("generated_by_id")
  generatedBy      User                      @relation("UserAITickets", fields: [generatedById], references: [id], onDelete: Cascade)
  scenario         String                    // Kuvaus generoidusta skenaariosta
  difficulty       String?                   // Vaikeustaso (esim. helppo, keskitaso, vaikea)
  solution         String?                   // Malliratkaisu tikettiin
  createdAt        DateTime                  @default(now())
  conversations    AITrainingConversation[]
  linkedTicket     Ticket?                   @relation(references: [id]) // Viite luotuun varsinaiseen tikettiin

  @@map("ai_training_tickets")
}

model AITrainingConversation {
  id                   String           @id @default(uuid())
  aiTrainingTicketId   String           @map("ai_training_ticket_id")
  aiTrainingTicket     AITrainingTicket @relation(fields: [aiTrainingTicketId], references: [id], onDelete: Cascade)
  senderType           String           // 'AI' tai 'USER' (simuloitu käyttäjä)
  message              String
  timestamp            DateTime         @default(now())

  @@map("ai_training_conversations")
}
```

## Suhteet ja Kardinaalisuudet

*   **User <-> Ticket:**
    *   Yksi käyttäjä (`User`) voi luoda monta tikettiä (`Ticket[]`, `UserTickets`-relaatio). (1-to-N)
    *   Yksi käyttäjä (`User`) voi olla määrättynä monta tikettiä (`Ticket[]`, `AssignedTickets`-relaatio). (1-to-N)
    *   Yksi tiketti (`Ticket`) kuuluu yhdelle käyttäjälle (`User`, `user`-kenttä).
    *   Yksi tiketti (`Ticket`) voi olla määrättynä yhdelle käyttäjälle (`User?`, `assignedTo`-kenttä) tai ei kenellekään.
*   **User <-> Comment:**
    *   Yksi käyttäjä (`User`) voi kirjoittaa monta kommenttia (`Comment[]`). (1-to-N)
    *   Yksi kommentti (`Comment`) kuuluu yhdelle käyttäjälle (`User`).
*   **Ticket <-> Comment:**
    *   Yksi tiketti (`Ticket`) voi sisältää monta kommenttia (`Comment[]`). (1-to-N)
    *   Yksi kommentti (`Comment`) kuuluu yhteen tikettiin (`Ticket`).
*   **User <-> Notification:**
    *   Yksi käyttäjä (`User`) voi saada monta ilmoitusta (`Notification[]`). (1-to-N)
    *   Yksi ilmoitus (`Notification`) kuuluu yhdelle käyttäjälle (`User`).
*   **User <-> NotificationSetting:**
    *   Yksi käyttäjä (`User`) voi omistaa yhden ilmoitusasetuksen (`NotificationSetting?`). (1-to-1)
*   **Ticket <-> Category:**
    *   Yksi kategoria (`Category`) voi liittyä moneen tikettiin (`Ticket[]`). (1-to-N)
    *   Yksi tiketti (`Ticket`) voi kuulua yhteen kategoriaan (`Category?`) tai ei mihinkään.
*   **Ticket <-> Attachment:**
    *   Yksi tiketti (`Ticket`) voi sisältää monta liitettä (`Attachment[]`, `TicketAttachments`-relaatio). (1-to-N)
    *   Yksi liite (`Attachment`) voi kuulua yhteen tikettiin (`Ticket?`).
*   **Comment <-> Attachment:**
    *   Yksi kommentti (`Comment`) voi sisältää monta liitettä (`Attachment[]`, `CommentAttachments`-relaatio). (1-to-N)
    *   Yksi liite (`Attachment`) voi kuulua yhteen kommenttiin (`Comment?`).
*   **User <-> AITrainingTicket:**
    *   Yksi käyttäjä (`User`) voi generoida monta AI-harjoitustikettiä (`AITrainingTicket[]`, `UserAITickets`-relaatio). (1-to-N)
    *   Yksi AI-harjoitustiketti (`AITrainingTicket`) on yhden käyttäjän (`User`) generoima.
*   **AITrainingTicket <-> AITrainingConversation:**
    *   Yksi AI-harjoitustiketti (`AITrainingTicket`) voi sisältää monta keskusteluviestiä (`AITrainingConversation[]`). (1-to-N)
    *   Yksi keskusteluviesti (`AITrainingConversation`) kuuluu yhteen AI-harjoitustikettiin (`AITrainingTicket`).
*   **Ticket <-> AITrainingTicket:**
    *   Yksi AI-harjoitustiketti (`AITrainingTicket`) voi liittyä yhteen varsinaiseen tikettiin (`Ticket?`, `linkedTicket`). (1-to-1, optioonaalinen)
    *   Yksi varsinainen tiketti (`Ticket`) voi olla luotu yhdestä AI-harjoitustiketistä (`AITrainingTicket?`). (1-to-1, optioonaalinen)

## Kenttien Selitykset

*   `@id`: Määrittelee kentän pääavaimeksi.
*   `@default(uuid())`: Generoi automaattisesti UUID:n oletusarvoksi.
*   `@default(now())`: Asettaa oletusarvoksi nykyisen aikaleiman.
*   `@updatedAt`: Päivittää aikaleiman automaattisesti, kun tietue päivitetään.
*   `@unique`: Varmistaa, että kentän arvo on uniikki taulussa.
*   `@relation(...)`: Määrittelee suhteen toiseen malliin.
    *   `fields`: Viittaa tämän mallin kenttään, joka toimii vierasavaimena.
    *   `references`: Viittaa toisen mallin kenttään (yleensä pääavain).
    *   `onDelete`: Määrittää, mitä tapahtuu viitatulle tietueelle, kun tämä tietue poistetaan (esim. `Cascade` poistaa myös viitatut, `SetNull` asettaa viiteavaimen `NULL`iksi).
*   `@map(...)`: Määrittelee vastaavan sarakkeen nimen tietokannassa (käytetään usein snake_case-konvention ylläpitämiseksi tietokannassa).

## Tietokannan Eheys ja Poistotoiminnot

Prisma ja sovelluslogiikka varmistavat tietokannan eheyden, erityisesti poistotoiminnoissa.

### Tikettien Poisto

Kun tiketti poistetaan (esim. admin-käyttäjän toimesta käyttöliittymän kautta), seuraavat toimet suoritetaan automaattisesti **yhden tietokantatransaktion sisällä**:

1.  **Liittyvien Kommenttien Poisto:** Kaikki tikettiin liittyvät `Comment`-tietueet poistetaan ensin (`onDelete: Cascade` Comment-mallin `ticket`-relaatiossa).
2.  **Liittyvien Liitetiedostojen Poisto:** Kaikki suoraan tikettiin liittyvät `Attachment`-tietueet poistetaan (`onDelete: Cascade` Attachment-mallin `ticket`-relaatiossa). Myös kommentteihin liittyneet liitteet poistuvat kommenttien poiston yhteydessä.
3.  **Liittyvien Ilmoitusten Poisto (tai päivitys):** Tikettiin liittyvät `Notification`-tietueet saatetaan poistaa tai niiden `ticketId` asetetaan `NULL`iksi riippuen skeeman määrittelystä (nykyisessä skeemassa ei ole suoraa `onDelete`-sääntöä Notification -> Ticket, joten ne jäävät todennäköisesti orvoiksi ilman `ticketId`:tä, ellei sovelluslogiikka siivoa niitä erikseen).
4.  **Linkitetyn AI-harjoitustiketin Irroitus:** Jos tiketti oli linkitetty `AITrainingTicket`-tietueeseen, tämä yhteys katkaistaan (`onDelete: SetNull` Ticket-mallin `aiTrainingTicket`-relaatiossa).
5.  **Varsinaisen Tiketin Poisto:** Lopuksi itse `Ticket`-tietue poistetaan.

**Transaktionaalisuus** varmistaa, että joko kaikki nämä vaiheet onnistuvat kokonaisuudessaan, tai jos yksikin vaihe epäonnistuu, koko operaatio perutaan, eikä tietokantaan jää epäkonsistenttia dataa (kuten orpoja kommentteja tai liitteitä ilman tikettiä).

Lisäksi tiedostojen poisto palvelimelta (fyysiset tiedostot `uploads`-kansiosta) on tärkeä osa poistoprosessia, joka tulee hoitaa sovelluslogiikassa (`ticketService.deleteTicket`) ennen tietokantatietueiden poistoa tai sen jälkeen osana samaa logiikkakokonaisuutta. 