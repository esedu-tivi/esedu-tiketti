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

### Liitetiedostot

*   Liitetiedostojen lataus tapahtuu osana tikettien (`POST /tickets`) ja kommenttien (`POST /tickets/:id/comments/media`) luontia käyttäen `multipart/form-data` -enkoodausta. Palvelin tallentaa tiedoston ja liittää sen URL/viite luotuun tikettiin/kommenttiin. 