# API Rajapinnan Kuvaus

Tämä dokumentti kuvaa Esedu Tikettijärjestelmän backendin tarjoaman RESTful API:n päätepisteet (endpoints).

## Yleistä

*   **Perus-URL:** Kaikki API-polut alkavat oletusarvoisesti `/api` (tarkista `backend/src/app.ts` tai `routes/index.ts` tarkan version varalta, esim. `/api/v1`).
*   **Autentikointi:** Useimmat päätepisteet vaativat autentikoinnin (`authMiddleware`). Pyynnön tulee sisältää `Authorization`-header, jonka arvo on `Bearer <JWT-token>`.
*   **Roolit:** Pääsy tiettyihin päätepisteisiin ja toimintoihin on rajoitettu käyttäjän roolin perusteella (USER, SUPPORT, ADMIN) käyttäen `requireRole`-middlewarea.
*   **Vastausmuoto:** Onnistuneet vastaukset palautetaan yleensä JSON-muodossa. Virhetilanteissa palautetaan JSON-objekti, joka sisältää `error`-kentän (esim. `{ "error": "Virheilmoitus..." }`).
*   **ID-Formaatti:** Useimmat ID:t (kuten `:id`, `:userId`, `:ticketId`) ovat UUID-merkkijonoja (esim. `123e4567-e89b-12d3-a456-426614174000`).
*   **Validointi:** Backend suorittaa syötteille validoinnin (pituudet, tyypit, pakollisuus). Virheelliset syötteet palauttavat tyypillisesti `400 Bad Request` -vastauksen, jossa on `error`-kenttä.

## Päätepisteet Resursseittain

### Autentikointi (`/auth`)

*   **POST /auth/login**
    *   **Kuvaus:** Käyttäjän kirjautuminen tai rekisteröinti Azure AD -kirjautumisen jälkeen. Synkronoi tiedot paikalliseen tietokantaan ja palauttaa JWT:n.
    *   **Rooli:** Julkinen (ei vaadi JWT:tä, mutta edellyttää onnistunutta Azure AD -autentikointia frontendissä).
    *   **Runko (Tyyppi):** `{ email: string, name: string, oid: string, jobTitle?: string }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "email": "matti.meikalainen@esedu.fi",
          "name": "Matti Meikäläinen",
          "oid": "azure-object-id",
          "jobTitle": "Opiskelija"
        }
        ```
    *   **Vastaus (Onnistunut, Esimerkki):**
        ```json
        {
          "token": "ey...",
          "user": {
            "id": "uuid-käyttäjälle",
            "email": "matti.meikalainen@esedu.fi",
            "name": "Matti Meikäläinen",
            "jobTitle": "Opiskelija",
            "role": "USER",
            "createdAt": "2024-01-01T10:00:00.000Z",
            "updatedAt": "2024-01-01T10:00:00.000Z"
          }
        }
        ```
    *   **Vastaus (Virhe):** Palauttaa `400 Bad Request` tai `500 Internal Server Error` virhetilanteissa.

### Käyttäjät (`/users`)

*   **GET /users/me**
    *   **Kuvaus:** Palauttaa pyynnön tehneen, autentikoidun käyttäjän tiedot.
    *   **Rooli:** Kaikki autentikoidut.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "id": "uuid-käyttäjälle",
          "email": "matti.meikalainen@esedu.fi",
          "name": "Matti Meikäläinen",
          "jobTitle": "Opiskelija",
          "role": "USER",
          "profilePicture": null, // tai base64-data
          "createdAt": "2024-01-01T10:00:00.000Z",
          "updatedAt": "2024-01-01T10:00:00.000Z"
        }
        ```
*   **GET /users**
    *   **Kuvaus:** Hakee kaikki käyttäjät.
    *   **Rooli:** ADMIN (`requireRole(UserRole.ADMIN)`).
    *   **Query-parametrit (Esimerkki):** `?page=1&limit=20` (Sivutus).
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "users": [
            { "id": "uuid1", "name": "Matti Meikäläinen", ... },
            { "id": "uuid2", "name": "Tuki Henkilö", ... }
          ],
          "totalPages": 5,
          "currentPage": 1
        }
        ```
*   **GET /users/support**
    *   **Kuvaus:** Hakee kaikki käyttäjät, joilla on SUPPORT- tai ADMIN-rooli.
    *   **Rooli:** SUPPORT, ADMIN (`requireRole([UserRole.SUPPORT, UserRole.ADMIN])`).
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "users": [
            { "id": "uuid-tuki", "name": "Tuki Henkilö", "role": "SUPPORT", ... },
            { "id": "uuid-admin", "name": "Admin Testaaja", "role": "ADMIN", ... }
          ]
        }
        ```
*   **PUT /users/:id/role**
    *   **Kuvaus:** Päivittää tietyn käyttäjän roolin.
    *   **Polkuparametri (`:id`):** Päivitettävän käyttäjän UUID.
    *   **Rooli:** ADMIN (`requireRole(UserRole.ADMIN)`).
    *   **Runko (Tyyppi):** `{ role: 'ADMIN' | 'SUPPORT' | 'USER' }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "role": "SUPPORT"
        }
        ```
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "message": "User role updated successfully",
          "user": { "id": "uuid", "name": "Matti Meikäläinen", "role": "SUPPORT", ... }
        }
        ```
*   **PUT /users/role**
    *   **Kuvaus:** Päivittää *oman* roolin (vain kehitysympäristössä).
    *   **Rooli:** Kaikki autentikoidut (rajoitettu kehitysympäristöön).
    *   **Runko (Tyyppi):** `{ role: 'ADMIN' | 'SUPPORT' | 'USER' }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "role": "ADMIN"
        }
        ```
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "message": "User role updated successfully",
          "user": { /* oma päivitetty käyttäjäobjekti */ }
        }
        ```
*   **POST /users/profile-picture/microsoft**
    *   **Kuvaus:** Päivittää käyttäjän profiilikuvan käyttäen Microsoft Graph -tokenia (frontendistä). Tallentaa kuvan base64-muodossa tietokantaan.
    *   **Rooli:** Kaikki autentikoidut.
    *   **Runko (Tyyppi):** `{ graphAccessToken: string }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "graphAccessToken": "ey..."
        }
        ```
    *   **Vastaus (Onnistunut, Esimerkki):**
        ```json
        {
          "profilePicture": "data:image/jpeg;base64,...",
          "message": "Profile picture updated successfully from Microsoft"
        }
        ```
    *   **Vastaus (Ei kuvaa, Esimerkki):**
        ```json
        {
          "message": "No profile picture available from Microsoft"
        }
        ```
*   **GET /users/profile-picture/:userId**
    *   **Kuvaus:** Hakee käyttäjän profiilikuvan ID:llä. Palauttaa kuvan suoraan (ei JSON).
    *   **Polkuparametri (`:userId`):** Käyttäjän UUID.
    *   **Rooli:** Julkinen (ei vaadi autentikointia).
    *   **Vastaus:** Kuvatiedosto (esim. `Content-Type: image/jpeg`) tai `404 Not Found`.
*   **GET /users/profile-picture/by-email/:email**
    *   **Kuvaus:** Hakee käyttäjän profiilikuvan sähköpostilla. Palauttaa kuvan suoraan (ei JSON).
    *   **Polkuparametri (`:email`):** Käyttäjän sähköpostiosoite.
    *   **Rooli:** Julkinen (ei vaadi autentikointia).
    *   **Vastaus:** Kuvatiedosto tai `404 Not Found`.

### Tiketit (`/tickets`)

*   **GET /tickets**
    *   **Kuvaus:** Hakee tikettilistan. ADMIN/SUPPORT näkee oletuksena kaikki, USER vain omansa.
    *   **Rooli:** Kaikki autentikoidut.
    *   **Query-parametrit (Esimerkkejä):**
        *   `status=OPEN` (Tila: OPEN, IN_PROGRESS, WAITING_FOR_CUSTOMER, WAITING_FOR_SUPPORT, RESOLVED, CLOSED)
        *   `priority=HIGH` (Prioriteetti: LOW, MEDIUM, HIGH, CRITICAL)
        *   `assignedToId=uuid`
        *   `userId=uuid`
        *   `categoryId=uuid`
        *   `page=1&limit=20` (Sivutus)
        *   `sortBy=createdAt&order=desc` (Järjestys)
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "tickets": [
            { /* tiketti 1 objekti */ },
            { /* tiketti 2 objekti */ }
          ],
          "totalPages": 10,
          "currentPage": 1
        }
        ```
*   **GET /tickets/my-tickets**
    *   **Kuvaus:** Hakee nimenomaisesti sisäänkirjautuneen käyttäjän luomat tiketit. Tukee samoja query-parametreja kuin `GET /tickets` (pl. `userId`).
    *   **Rooli:** Kaikki autentikoidut.
*   **POST /tickets**
    *   **Kuvaus:** Luo uuden tiketin. Käyttää `multipart/form-data` jos liitteitä.
    *   **Rooli:** Kaikki autentikoidut.
    *   **Runko (Tyyppi, `multipart/form-data`):** `{ title: string (5-100), description: string (10-2000), device?: string (max 100), additionalInfo?: string (max 1000), priority: Priority, categoryId: string (UUID), responseFormat: ResponseFormat, attachments?: File[] (max 5, kokorajoitus per tiedosto?) }`
    *   **Runko (Esimerkki, `application/json` ilman liitteitä):**
        ```json
        {
          "title": "Tulostin ei toimi",
          "description": "Toimiston lasertulostin ei tulosta. Paperit jumissa?",
          "categoryId": "uuid-kategorialle",
          "priority": "MEDIUM",
          "responseFormat": "TEKSTI",
          "device": "HP LaserJet Pro M404dn",
          "additionalInfo": "Mallinimi löytyy laitteen etuosasta."
        }
        ```
    *   **Vastaus (Onnistunut, Esimerkki):** Palauttaa luodun tikettiobjektin.
        ```json
        {
          "id": "uusi-tiketti-uuid",
          "title": "Tulostin ei toimi",
          "description": "Toimiston lasertulostin ei tulosta. Paperit jumissa?",
          "status": "OPEN",
          "priority": "MEDIUM",
          "responseFormat": "TEKSTI",
          "device": "HP LaserJet Pro M404dn",
          "additionalInfo": "Mallinimi löytyy laitteen etuosasta.",
          // ... muut kentät
        }
        ```
*   **GET /tickets/:id**
    *   **Kuvaus:** Hakee yksittäisen tiketin tiedot ID:n perusteella.
    *   **Polkuparametri (`:id`):** Haettavan tiketin UUID.
    *   **Rooli:** Kaikki autentikoidut (`requireOwnership` middleware tarkistaa tarkemmat oikeudet).
    *   **Vastaus (Esimerkki):** Palauttaa tikettiobjektin (sisältää `comments`, `attachments`, `createdBy`, `assignedTo`, `category` relaatiot).
        ```json
        {
          "id": "tiketti-uuid",
          "title": "Tulostin ei toimi",
          // ... muut tiketin kentät
          "comments": [ { /* kommentti 1 */ }, ... ],
          "attachments": [ { /* liite 1 */ }, ... ],
          "createdBy": { "id": "kayttaja-uuid", "name": "Matti Meikäläinen" },
          "assignedTo": { "id": "tuki-uuid", "name": "Tuki Henkilö" } // tai null
          "category": { "id": "kategoria-uuid", "name": "Tekniset ongelmat" }
        }
        ```
*   **PUT /tickets/:id**
    *   **Kuvaus:** Päivittää tiketin perustietoja (otsikko, kuvaus, prioriteetti, kategoria, jne.). HUOM: Ei tilan tai osoituksen muuttamiseen.
    *   **Polkuparametri (`:id`):** Päivitettävän tiketin UUID.
    *   **Rooli:** Kaikki autentikoidut (`requireOwnership` tarkistaa oikeudet).
    *   **Runko (Tyyppi):** `{ title?: string (5-100), description?: string (10-2000), device?: string (max 100), additionalInfo?: string (max 1000), priority?: Priority, categoryId?: string (UUID), responseFormat?: ResponseFormat }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "description": "Paperit poistettu, mutta valittaa edelleen värikasetin olevan tyhjä.",
          "priority": "HIGH",
          "additionalInfo": "Värikasetti vaihdettu eilen."
        }
        ```
    *   **Vastaus (Esimerkki):** Palauttaa päivitetyn tikettiobjektin.
*   **DELETE /tickets/:id**
    *   **Kuvaus:** Poistaa tiketin (ja siihen liittyvät kommentit/liitteet).
    *   **Polkuparametri (`:id`):** Poistettavan tiketin UUID.
    *   **Rooli:** ADMIN (`requireRole([UserRole.ADMIN])`).
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "message": "Ticket deleted successfully"
        }
        ```
*   **PUT /tickets/:id/assign**
    *   **Kuvaus:** Määrittää tiketin tukihenkilölle tai poistaa määrityksen.
    *   **Polkuparametri (`:id`):** Tiketin UUID.
    *   **Rooli:** SUPPORT, ADMIN (`requireRole(UserRole.SUPPORT)`, `canModifyTicket`).
    *   **Runko (Tyyppi):** `{ assignedToId: string | null }` (UUID tai null)
    *   **Runko (Esimerkki):**
        ```json
        {
          "assignedToId": "uuid-kayttajalle"
        }
        ```
    *   **Vastaus (Esimerkki):** Palauttaa päivitetyn tikettiobjektin.
*   **PUT /tickets/:id/status**
    *   **Kuvaus:** Päivittää tiketin tilan ja lisää järjestelmäkommentin.
    *   **Polkuparametri (`:id`):** Tiketin UUID.
    *   **Rooli:** SUPPORT, ADMIN (`requireRole(UserRole.SUPPORT)`, `canModifyTicket`) TAI Omistaja (vain sulkemiseen).
    *   **Runko (Tyyppi):** `{ status: TicketStatus }` (OPEN, IN_PROGRESS, ...)
    *   **Runko (Esimerkki):**
        ```json
        {
          "status": "RESOLVED"
        }
        ```
    *   **Vastaus (Esimerkki):** Palauttaa päivitetyn tikettiobjektin.
*   **PUT /tickets/:id/take**
    *   **Kuvaus:** Ottaa tiketin käsittelyyn (osoittaa itselle, asettaa tilaksi IN_PROGRESS).
    *   **Polkuparametri (`:id`):** Tiketin UUID.
    *   **Rooli:** SUPPORT, ADMIN (`requireRole(UserRole.SUPPORT)`).
    *   **Vastaus (Esimerkki):** Palauttaa päivitetyn tikettiobjektin.
*   **PUT /tickets/:id/release**
    *   **Kuvaus:** Vapauttaa tiketin käsittelystä (poistaa osoituksen, asettaa tilaksi OPEN).
    *   **Polkuparametri (`:id`):** Tiketin UUID.
    *   **Rooli:** Tiketille osoitettu SUPPORT tai ADMIN (`requireRole(UserRole.SUPPORT)`, `canModifyTicket`).
    *   **Vastaus (Esimerkki):** Palauttaa päivitetyn tikettiobjektin.
*   **PUT /tickets/:id/transfer**
    *   **Kuvaus:** Siirtää tiketin toiselle tukihenkilölle.
    *   **Polkuparametri (`:id`):** Tiketin UUID.
    *   **Rooli:** Tiketille osoitettu SUPPORT tai ADMIN (`requireRole(UserRole.SUPPORT)`, `canModifyTicket`).
    *   **Runko (Tyyppi):** `{ targetUserId: string }` (Kohdehenkilön UUID)
    *   **Runko (Esimerkki):**
        ```json
        {
          "targetUserId": "toisen-tuen-uuid"
        }
        ```
    *   **Vastaus (Esimerkki):** Palauttaa päivitetyn tikettiobjektin.

### Kommentit (`/tickets/:ticketId/comments`)

*   *(Huom: Nämä ovat alireittejä /tickets/:id alle)*
*   **GET /tickets/:id/comments**
    *   **Kuvaus:** Hakee tiketin kommentit.
    *   **Polkuparametri (`:id`):** Tiketin UUID.
    *   **Rooli:** Kaikki autentikoidut (joilla pääsy tikettiin).
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "comments": [
            {
              "id": "kommentti-uuid",
              "content": "Oletko kokeillut käynnistää tietokoneen uudelleen?",
              "mediaUrl": null,
              "mediaType": null,
              "createdAt": "2024-01-01T11:00:00.000Z",
              "author": { "id": "tuki-uuid", "name": "Tuki Henkilö" }
            },
            {
              "id": "media-kommentti-uuid",
              "content": "Tässä kuva virheilmoituksesta.",
              "mediaUrl": "/uploads/images/virhe.png",
              "mediaType": "image",
              "createdAt": "2024-01-01T11:05:00.000Z",
              "author": { "id": "kayttaja-uuid", "name": "Matti Meikäläinen" }
            }
          ]
        }
        ```
*   **POST /tickets/:id/comments**
    *   **Kuvaus:** Lisää uuden tekstikomentin tikettiin.
    *   **Polkuparametri (`:id`):** Tiketin UUID, johon kommentti lisätään.
    *   **Rooli:** Kaikki autentikoidut (joilla pääsy tikettiin, tarkistetaan roolin/tilan mukaan).
    *   **Runko (Tyyppi):** `{ content: string (1-1000) }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "content": "Oletko kokeillut käynnistää tietokoneen uudelleen?"
        }
        ```
    *   **Vastaus (Esimerkki):** Palauttaa luodun kommenttiobjektin.
        ```json
        {
          "id": "uusi-kommentti-uuid",
          "content": "Oletko kokeillut käynnistää tietokoneen uudelleen?",
          "mediaUrl": null,
          "mediaType": null,
          "createdAt": "2024-01-01T12:00:00.000Z",
          "author": { "id": "tuki-uuid", "name": "Tuki Henkilö" }
        }
        ```
*   **POST /tickets/:id/comments/media**
    *   **Kuvaus:** Lisää uuden mediakommentin (kuva/video) tikettiin (`multipart/form-data`).
    *   **Polkuparametri (`:id`):** Tiketin UUID, johon kommentti lisätään.
    *   **Rooli:** Kaikki autentikoidut (joilla pääsy tikettiin, tarkistetaan roolin/tilan mukaan).
    *   **Runko:** `multipart/form-data`, sisältää kentän `media` (File, max 10MB, tyypit: jpg, jpeg, png, gif, webp, mp4, webm, mov) ja valinnaisen kentän `content` (string, 0-1000).
    *   **Vastaus (Esimerkki):** Palauttaa luodun kommenttiobjektin (sis. `mediaUrl`, `mediaType`).
        ```json
        {
          "id": "uusi-media-kommentti-uuid",
          "content": "Liitteenä video ongelmasta.",
          "mediaUrl": "/uploads/videos/ongelma.mp4",
          "mediaType": "video",
          "createdAt": "2024-01-01T12:05:00.000Z",
          "author": { "id": "kayttaja-uuid", "name": "Matti Meikäläinen" }
        }
        ```

### Kategoriat (`/categories`)

*   **GET /categories**
    *   **Kuvaus:** Hakee kaikki tikettikategoriat.
    *   **Rooli:** Julkinen (ei vaadi autentikointia).
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "categories": [
            { "id": "uuid-cat1", "name": "Tekniset ongelmat", "description": "Laitteisiin liittyvät viat." },
            { "id": "uuid-cat2", "name": "Käyttäjätunnukset", "description": "Salasanat, tunnukset." }
          ]
        }
        ```

### Ilmoitukset (`/notifications`)

*   *(Huom: Kaikki alla olevat vaativat autentikoinnin)*
*   **GET /notifications**
    *   **Kuvaus:** Hakee käyttäjän ilmoitukset.
    *   **Query-parametrit (Esimerkki):** `?read=false` (Hae vain lukemattomat), `?page=1&limit=15` (Sivutus).
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "notifications": [
            {
              "id": "uuid-noti1",
              "type": "COMMENT_ADDED",
              "content": "Matti Meikäläinen kommentoi tikettiäsi 'Tulostin ei toimi'.",
              "read": false,
              "createdAt": "2024-01-01T11:05:00.000Z",
              "ticketId": "tiketti-uuid"
            },
            ...
          ],
          "totalPages": 3,
          "currentPage": 1
        }
        ```
*   **GET /notifications/unread/count**
    *   **Kuvaus:** Hakee käyttäjän lukemattomien ilmoitusten määrän.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "count": 5
        }
        ```
*   **PUT /notifications/:id/read**
    *   **Kuvaus:** Merkitsee tietyn ilmoituksen luetuksi.
    *   **Polkuparametri (`:id`):** Ilmoituksen UUID.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "message": "Notification marked as read"
        }
        ```
*   **PUT /notifications/read/all**
    *   **Kuvaus:** Merkitsee kaikki käyttäjän ilmoitukset luetuiksi.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "message": "All notifications marked as read"
        }
        ```
*   **DELETE /notifications/:id**
    *   **Kuvaus:** Poistaa tietyn ilmoituksen.
    *   **Polkuparametri (`:id`):** Ilmoituksen UUID.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "message": "Notification deleted"
        }
        ```

### Ilmoitusasetukset (`/notification-settings`)

*   *(Huom: Kaikki alla olevat vaativat autentikoinnin)*
*   **GET /notification-settings**
    *   **Kuvaus:** Hakee käyttäjän ilmoitusasetukset.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "id": "uuid-settings",
          "userId": "uuid-käyttäjälle",
          "emailNotifications": true,
          "webNotifications": true,
          "notifyOnAssigned": true,
          "notifyOnStatusChange": true,
          "notifyOnComment": true,
          "notifyOnPriority": false,
          "notifyOnMention": true,
          "notifyOnDeadline": true
        }
        ```
*   **PUT /notification-settings**
    *   **Kuvaus:** Päivittää käyttäjän ilmoitusasetukset.
    *   **Runko (Tyyppi):** `{ emailNotifications?: boolean, webNotifications?: boolean, notifyOnAssigned?: boolean, notifyOnStatusChange?: boolean, notifyOnComment?: boolean, notifyOnPriority?: boolean, notifyOnMention?: boolean, notifyOnDeadline?: boolean }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "emailOnNewComment": false,
          "notifyOnPriority": true
        }
        ```
    *   **Vastaus (Esimerkki):** Palauttaa päivitetyt asetukset.

### Tekoäly (`/ai`)

*   *(Huom: Kaikki alla olevat vaativat autentikoinnin JA SUPPORT tai ADMIN roolin, ellei toisin mainita)*
*   **GET /ai/config**
    *   **Kuvaus:** Palauttaa konfiguraatiovaihtoehdot (kategoriat, profiilit) AI-tikettien generointiin.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "categories": [ { "id": "uuid", "name": "Nimi" }, ... ],
          "userProfiles": [ "Kokematon käyttäjä", "Peruskäyttäjä", "Teknisesti taitava" ],
          "difficulties": [ "Helppo", "Normaali", "Vaikea" ]
        }
        ```
*   **POST /ai/generate-ticket-preview**
    *   **Kuvaus:** Generoi esikatselun AI-harjoitustiketistä.
    *   **Runko (Tyyppi):** `{ difficulty: string, category: string, userProfile?: string }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "difficulty": "Normaali",
          "category": "Verkko-ongelmat",
          "userProfile": "Kokematon käyttäjä"
        }
        ```
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "preview": {
            "title": "Internet ei toimi",
            "description": "Yhteys katkeilee jatkuvasti...",
            "solution": "1. Tarkista modeemin valot... 2. Käynnistä reititin uudelleen...",
            "priority": "MEDIUM",
            "device": "Kannettava tietokone"
          },
          "previewId": "temp-preview-uuid"
        }
        ```
*   **POST /ai/confirm-ticket-creation**
    *   **Kuvaus:** Vahvistaa ja tallentaa esikatsellun AI-harjoitustiketin.
    *   **Runko (Tyyppi):** `{ previewId: string }` tai `{ previewData: object }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "previewId": "temp-preview-uuid"
        }
        ```
    *   **Vastaus (Esimerkki):** Palauttaa luodun `AITrainingTicket`-objektin.
*   **POST /ai/tickets/:id/generate-response**
    *   **Kuvaus:** Laukaisee `ChatAgent`:n generoimaan vastauksen AI-harjoitustiketin keskusteluun.
    *   **Polkuparametri (`:id`):** AI-harjoitustiketin UUID.
    *   **Vastaus (Esimerkki):** Palauttaa AI:n generoiman `AITrainingConversation`-objektin.
*   **GET /ai/tickets/:ticketId/solution**
    *   **Kuvaus:** Hakee AI-generoidun ratkaisun harjoitustikettiin.
    *   **Polkuparametri (`:ticketId`):** AI-harjoitustiketin UUID.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "solution": "1. Tarkista modeemin valot... 2. Käynnistä reititin uudelleen..."
        }
        ```
*   **POST /ai/tickets/:ticketId/summarize**
    *   **Kuvaus:** Generoi/päivittää yhteenvedon tiketin keskustelusta.
    *   **Polkuparametri (`:ticketId`):** Tiketin UUID.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "summary": "Käyttäjä ilmoitti katkeilevasta internet-yhteydestä. Tukihenkilö pyysi tarkistamaan modeemin ja reitittimen. Ongelma ratkaistu reitittimen uudelleenkäynnistyksellä."
        }
        ```
*   **GET /ai/analysis/tickets**
    *   **Kuvaus:** Hakee listan AI-generoiduista tiketeistä analysointia varten (Admin-näkymä).
    *   **Rooli:** ADMIN.
    *   **Query-parametrit (Esimerkki):** `?page=1&limit=10` (Sivutus).
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "tickets": [ { /* aiTicket1 objekti */ }, ... ],
          "totalPages": 2,
          "currentPage": 1
        }
        ```
*   **GET /ai/analysis/tickets/:ticketId/conversation**
    *   **Kuvaus:** Hakee AI-generoidun tiketin koko keskusteluhistorian (sis. AI:n arviot) (Admin-näkymä).
    *   **Polkuparametri (`:ticketId`):** AI-harjoitustiketin UUID.
    *   **Rooli:** ADMIN.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "ticket": { /* aiTicket objekti */ },
          "conversation": [
            { "senderType": "USER", "message": "...", "timestamp": "..." },
            { "senderType": "SUPPORT", "message": "...", "timestamp": "..." },
            { "senderType": "AI", "message": "...", "timestamp": "...", "evaluationResult": "PROGRESSING" }
          ]
        }
        ```
*   **POST /ai/tickets/:ticketId/support-assistant**
    *   **Kuvaus:** Pyytää tukihenkilöassistentilta apua tikettiin liittyvään ongelmaan.
    *   **Polkuparametri (`:ticketId`):** Tiketin UUID, johon apua pyydetään.
    *   **Rooli:** SUPPORT, ADMIN (vain tiketit, joihin käyttäjällä on pääsy).
    *   **Runko (Tyyppi):** `{ supportQuestion: string, supportUserId: string }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "supportQuestion": "Miten voisin ratkaista tämän verkko-ongelman?",
          "supportUserId": "uuid-käyttäjälle"
        }
        ```
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "success": true,
          "response": "Verkko-ongelman ratkaisemiseksi kannattaa ensin tarkistaa seuraavat asiat: 1. Onko verkkokaapeli kytketty kunnolla, 2. Ovatko reitittimen valot päällä..."
        }
        ```

### Liitetiedostot

*   Liitetiedostojen lataus tapahtuu osana tikettien (`POST /tickets`) ja kommenttien (`POST /tickets/:id/comments/media`) luontia käyttäen `multipart/form-data` -enkoodausta. Palvelin tallentaa tiedoston ja liittää sen URL/viite luotuun tikettiin/kommenttiin. 

## AI Analytics API (`/ai-analytics`)

*   **GET /ai-analytics/dashboard**
    *   **Kuvaus:** Hakee kaikki AI-analytiikan tiedot yhdellä API-kutsulla (käyttötiedot, kategoriat, tukihenkilöiden käyttö, vastausajat, ratkaisuajat).
    *   **Rooli:** ADMIN, SUPPORT (`requireRole([UserRole.ADMIN, UserRole.SUPPORT])`).
    *   **Query-parametrit:** `range` - Aikaväli datan hakemiseen (7d, 14d, 30d, 90d). Oletus: 14d.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "usageData": [
            { "date": "01.05", "count": 23, "avgResponseTime": 2.1, "avgRating": 4.2, "ticketsAssisted": 12 },
            // ... other days (type: Array<{ date: string, count: number, avgResponseTime: number, avgRating: number | null, ticketsAssisted: number }>)
          ],
          "summary": {
            "totalInteractions": 320, // type: number
            "totalTicketsAssisted": 156, // type: number
            "avgResponseTime": 2.3, // type: number (seconds)
            "avgRating": 4.1 // type: number
          },
          "categoryData": [
            { "name": "Verkko-ongelmat", "value": 45 },
            // ... other categories (type: Array<{ name: string, value: number }>)
          ],
          "agentUsageData": [
            { "name": "Tuki Henkilö", "count": 78, "rating": 4.5 },
            // ... other support agents (type: Array<{ name: string, count: number, rating: number }>)
          ],
          "responseTimeData": {
            "averageResponseTime": "2.3s", // type: string
            "fastestResponseTime": "0.5s", // type: string
            "percentileData": [
              { "percentile": "50%", "time": "1.8s" },
              // ... other percentiles (type: Array<{ percentile: string, time: string }>)
            ]
          },
          "resolutionData": {
            "withAssistant": "4.2", // type: string (hours)
            "withoutAssistant": "6.8", // type: string (hours)
            "improvement": "38.2" // type: string (percentage)
          },
          "overallStats": {
            "totalInteractions": 3240, // type: number
            "totalSupportAgents": 8, // type: number
            "totalTicketsAssisted": 1285, // type: number
            "averageSatisfactionRating": "4.3", // type: string
            "ticketsResolvedFaster": "62%", // type: string (Note: Currently static value)
            "knowledgeArticlesUsed": 85 // type: number (Note: Currently static value)
          }
        }
        ```

*   **GET /ai-analytics/usage**
    *   **Kuvaus:** Hakee AI-avustajan käyttötilastot valitulta aikaväliltä.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Query-parametrit:** `range` - Aikaväli (7d, 14d, 30d, 90d). Oletus: 14d.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "usageData": [
            { "date": "01.05", "count": 23, "avgResponseTime": 2.1, "avgRating": 4.2, "ticketsAssisted": 12 },
            // ... other days (type: Array<{ date: string, count: number, avgResponseTime: number, avgRating: number | null, ticketsAssisted: number }>)
          ],
          "summary": {
            "totalInteractions": 320, // type: number
            "totalTicketsAssisted": 156, // type: number
            "avgResponseTime": 2.3, // type: number (seconds)
            "avgRating": 4.1 // type: number
          }
        }
        ```

*   **GET /ai-analytics/categories**
    *   **Kuvaus:** Hakee AI-avustajan käytön kategoriapohjaisen jakauman.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Query-parametrit:** `range` - Aikaväli (7d, 14d, 30d, 90d). Oletus: 14d.
    *   **Vastaus (Esimerkki):**
        ```json
        [
          { "name": "Verkko-ongelmat", "value": 45 },
          // ... other categories (type: Array<{ name: string, value: number }>)
        ]
        ```

*   **GET /ai-analytics/agents**
    *   **Kuvaus:** Hakee tukihenkilökohtaiset AI-avustajan käyttötilastot.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Query-parametrit:** `range` - Aikaväli (7d, 14d, 30d, 90d). Oletus: 14d.
    *   **Vastaus (Esimerkki):**
        ```json
        [
          { "name": "Tuki Henkilö", "count": 78, "rating": 4.5 },
          // ... other support agents (type: Array<{ name: string, count: number, rating: number }>)
        ]
        ```

*   **GET /ai-analytics/agents/:agentId/details**
    *   **Kuvaus:** Hakee yksittäisen tukihenkilön tarkat käyttötilastot.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Polkuparametri:** `agentId` - Tukihenkilön käyttäjä-ID (UUID) tai nimi (string).
    *   **Query-parametrit:** `range` - Aikaväli (7d, 14d, 30d, 90d). Oletus: 14d.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "totalInteractions": 78, // type: number
          "averageResponseTime": "2.1s", // type: string
          "responseRatings": [ // type: Array<{ rating: number, count: number }>
            { "rating": 5, "count": 32 },
            { "rating": 4, "count": 18 },
            { "rating": 3, "count": 5 },
            { "rating": 2, "count": 0 },
            { "rating": 1, "count": 0 }
          ],
          "interactionsByDay": [ // type: Array<{ date: string (dd.MM), count: number }>
            { "date": "01.05", "count": 5 },
            { "date": "02.05", "count": 4 },
            // ... other days
          ],
          "commonQueries": [ // type: Array<string>
            "Miten ratkaisen tulostusongelman?",
            "Tarvitsen tietoa verkko-ongelman ratkaisemiseen",
            // ... other queries
          ]
        }
        ```

*   **GET /ai-analytics/response-times**
    *   **Kuvaus:** Hakee AI-avustajan vastausaikojen tilastot.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Query-parametrit:** `range` - Aikaväli (7d, 14d, 30d, 90d). Oletus: 14d.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "averageResponseTime": "2.3s", // type: string
          "fastestResponseTime": "0.5s", // type: string
          "percentileData": [ // type: Array<{ percentile: string, time: string }>
            { "percentile": "50%", "time": "1.8s" },
            { "percentile": "75%", "time": "2.5s" },
            { "percentile": "90%", "time": "3.2s" },
            { "percentile": "95%", "time": "4.0s" },
            { "percentile": "99%", "time": "5.2s" }
          ]
        }
        ```

*   **GET /ai-analytics/resolution-times**
    *   **Kuvaus:** Hakee tikettien ratkaisuaikojen vertailun AI-avustajan kanssa ja ilman.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Query-parametrit:** `range` - Aikaväli (7d, 14d, 30d, 90d). Oletus: 14d.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "withAssistant": "4.2", // type: string (average hours)
          "withoutAssistant": "6.8", // type: string (average hours)
          "improvement": "38.2" // type: string (percentage)
        }
        ```

*   **GET /ai-analytics/overall**
    *   **Kuvaus:** Hakee yleiset AI-avustajan käyttötilastot.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Query-parametrit:** `range` - Aikaväli (7d, 14d, 30d, 90d, all). Oletus: all.
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "totalInteractions": 3240, // type: number
          "totalSupportAgents": 8, // type: number
          "totalTicketsAssisted": 1285, // type: number
          "averageSatisfactionRating": "4.3", // type: string
          "ticketsResolvedFaster": "62%", // type: string (Note: Currently static value)
          "knowledgeArticlesUsed": 85 // type: number (Note: Currently static value)
        }
        ```

*   **POST /ai-analytics/interactions**
    *   **Kuvaus:** Tallentaa uuden AI-avustajan interaktion tilastointia varten.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Runko (Tyyppi):** `{ ticketId?: string (UUID), query: string, response: string, responseTime: number (seconds), userId: string (UUID) }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "ticketId": "123e4567-e89b-12d3-a456-426614174000",
          "query": "Miten ratkaisen tulostusongelman?",
          "response": "Voit ratkaista tulostusongelman seuraavilla vaiheilla: 1...",
          "responseTime": 2.3,
          "userId": "456e7890-e12b-34d5-a678-426614174999"
        }
        ```
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "id": "789e0123-e45b-67d8-a901-426614174111", // type: string (UUID)
          "ticketId": "123e4567-e89b-12d3-a456-426614174000", // type: string (UUID) or null
          "query": "Miten ratkaisen tulostusongelman?", // type: string
          "response": "Voit ratkaista tulostusongelman seuraavilla vaiheilla: 1...", // type: string
          "responseTime": 2.3, // type: number (seconds)
          "userId": "456e7890-e12b-34d5-a678-426614174999", // type: string (UUID)
          "rating": null, // type: number | null
          "feedback": null, // type: string | null
          "createdAt": "2024-05-01T10:30:00.000Z" // type: string (ISO DateTime)
        }
        ```

*   **POST /ai-analytics/interactions/:interactionId/feedback**
    *   **Kuvaus:** Tallentaa palautteen ja arvosanan AI-avustajan interaktiolle.
    *   **Rooli:** ADMIN, SUPPORT.
    *   **Polkuparametri:** `interactionId` - Interaktion ID (UUID).
    *   **Runko (Tyyppi):** `{ rating: number (1-5), feedback?: string }`
    *   **Runko (Esimerkki):**
        ```json
        {
          "rating": 5,
          "feedback": "Erittäin hyödyllinen vastaus, kiitos!"
        }
        ```
    *   **Vastaus (Esimerkki):**
        ```json
        {
          "id": "789e0123-e45b-67d8-a901-426614174111",
          "ticketId": "123e4567-e89b-12d3-a456-426614174000",
          "query": "Miten ratkaisen tulostusongelman?",
          "response": "Voit ratkaista tulostusongelman seuraavilla vaiheilla: 1...",
          "responseTime": 2.3,
          "userId": "456e7890-e12b-34d5-a678-426614174999",
          "rating": 5,
          "feedback": "Erittäin hyödyllinen vastaus, kiitos!",
          "createdAt": "2024-05-01T10:30:00.000Z",
          "updatedAt": "2024-05-01T10:35:00.000Z"
        }
        ``` 