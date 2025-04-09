# Tikettijärjestelmä - Dokumentaatio

## Pika-aloitus

1. Varmista että sinulla on:
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/) asennettuna ja käynnissä
   - [Node.js](https://nodejs.org/) (v18 tai uudempi)
   - [Git](https://git-scm.com/downloads)

2. Kloonaa tai pullaa projekti:
```bash
git clone [repositorion-url]
cd esedu-tiketti
```

3. Asenna ja käynnistä backend (vaihtoehto 1 - kehitystilassa):
```bash
cd backend
npm install
npm run dev
```
Tämä:
- Käynnistää PostgreSQL-tietokannan Docker-kontissa
- Ajaa tietokannan migraatiot
- Ajaa seed-skriptin joka luo testikäyttäjät ja kategoriat
- Käynnistää Prisma Studion (http://localhost:5555)
- Käynnistää backend-palvelimen (http://localhost:3001)

   **TAI**

   Asenna ja käynnistä backend ja tietokanta (vaihtoehto 2 - Docker konteissa):
```bash
cd backend
docker-compose up -d
```
Tämä:
- Käynnistää PostgreSQL-tietokannan Docker-kontissa (`esedu-tiketti-db`)
- Käynnistää backend-palvelimen Docker-kontissa (`esedu-tiketti-backend`)
- Ajaa tietokannan migraatiot automaattisesti
- Backend-palvelin käynnistyy osoitteeseen http://localhost:3001

4. Asenna ja käynnistä frontend (uudessa terminaalissa):
```bash
cd frontend
npm install
npm run dev
```
Frontend käynnistyy osoitteeseen http://localhost:5173

## Docker-konttien käyttö

Järjestelmä tukee sekä PostgreSQL-tietokannan että backend-palvelimen ajamista Docker-konteissa.

### Docker-arkkitehtuuri:

```
┌─────────────────────────┐      ┌─────────────────────────┐
│  Backend Container      │      │  PostgreSQL Container   │
│  (Node.js + Express)    │◄────►│  (esedu-tiketti-db)     │
│  (esedu-tiketti-backend)│      │                         │
│  Port: 3001             │      │  Port: 5432 (internal)  │
└─────────────────────────┘      └─────────────────────────┘
```

### Docker-konttien käynnistäminen:

```bash
cd backend
docker-compose up -d
```

### Docker-konttien sammuttaminen:

```bash
cd backend
docker-compose down
```

### Docker-konttien uudelleenrakentaminen:

Jos teet muutoksia koodiin tai riippuvuuksiin, sinun täytyy rakentaa Docker-image uudelleen:

```bash
cd backend
docker-compose up --build -d
```

### Lokien seuraaminen:

```bash
# Molempien konttien lokit
docker-compose logs -f

# Vain backend-kontin lokit
docker-compose logs -f backend

# Vain postgres-kontin lokit
docker-compose logs -f postgres
```

### Tärkeät huomiot Docker-käytössä:

1. **Ympäristömuuttujat:** Varmista, että `.env`-tiedostossa on määritelty oikeat tietokantayhteysasetukset. Docker-ympäristössä backendillä on oma `.env`-tiedosto kontissa.

2. **Tietokantayhteys:** Docker-konttien välinen tietokantayhteys käyttää `postgres`-palvelunimeä ja porttia `5432`, kun taas kehitysympäristössä käytetään `localhost`-yhteyttä ja porttia `5434`.

3. **Tiedostojen pysyvyys:** Tietokanta tallentaa tiedot Docker volumeen `postgres_data`, jotta tiedot säilyvät konttien uudelleenkäynnistysten välillä. Ladatut tiedostot (`uploads`-kansio) jaetaan host-järjestelmän ja kontin välillä.

4. **Päivitykset:** Jos päivität backendin riippuvuuksia (package.json), muista rakentaa kontit uudelleen `--build`-parametrilla.

## Käyttäjäroolit ja oikeudet

Järjestelmässä on kolme käyttäjäroolia:

1. USER (Opiskelija)
   - Voi luoda tikettejä
   - Näkee omat tikettinsä
   - Voi muokata omia tikettejään

2. SUPPORT (Tukihenkilö)
   - Kaikki USER-oikeudet
   - Pääsy hallintapaneeliin
   - Voi nähdä ja käsitellä kaikkia tikettejä
   - Voi vastata tiketteihin

3. ADMIN (Järjestelmänvalvoja)
   - Kaikki SUPPORT-oikeudet
   - Voi hallita käyttäjien rooleja
   - Täydet järjestelmänvalvojan oikeudet

### Käyttäjien hallinta
Admin-käyttäjät voivat hallita käyttäjien rooleja käyttöliittymän kautta:
1. Käyttäjien hallinta -nappi löytyy headerista (vain admin-käyttäjille)
2. Dialogissa voi vaihtaa käyttäjien roolin Opiskelijasta Tukihenkilöksi ja takaisin
3. Admin-käyttäjien rooleja ei voi muuttaa käyttöliittymän kautta

## Testikäyttäjät ja seed-data

### Automaattisesti luotavat käyttäjät
Kehitysympäristössä luodaan automaattisesti seuraavat käyttäjät:

1. Admin-käyttäjä:
   - Nimi: Admin User
   - Email: admin@example.com
   - Rooli: ADMIN

2. Peruskäyttäjä:
   - Nimi: Test User
   - Email: user@example.com
   - Rooli: USER

3. Tukihenkilö:
   - Nimi: Support User
   - Email: support@example.com
   - Rooli: SUPPORT

Voit tarkastella käyttäjiä Prisma Studiossa (http://localhost:5555) Users-taulussa.

### Kategoriat
Järjestelmään luodaan automaattisesti seuraavat kategoriat:
- Tekniset ongelmat
- Yleinen

### Seed-datan hallinta
Seed-data luodaan automaattisesti kun:
- Ajetaan `npm run dev` ensimmäistä kertaa
- Ajetaan `npm run db:reset` komento
- Ajetaan manuaalisesti `npx prisma db seed` komento

Seed-datan sisältöä voi muokata tiedostossa `backend/prisma/seed.ts`.

HUOM: `npm run db:reset` komento:
- Tyhjentää tietokannan
- Ajaa kaikki migraatiot
- Ajaa seed-skriptin
Käytä tätä vain kehitysympäristössä kun haluat palauttaa tietokannan alkutilaan!

## Autentikointi

### Azure AD -integraatio
Järjestelmä käyttää Microsoft Authentication (MSA) -autentikointia Azure AD:n kautta. Tämä mahdollistaa:
- Turvallisen kirjautumisen Azure AD -tunnuksilla
- Käyttäjien automaattisen luonnin ja synkronoinnin
- Single Sign-On (SSO) -toiminnallisuuden

### Autentikoinnin komponentit
Frontend sisältää seuraavat autentikointiin liittyvät komponentit:
- `AuthProvider`: Hallinnoi autentikoinnin tilaa ja tarjoaa autentikointikontekstin
- `AuthGuard`: Suojaa reittejä vaatimalla kirjautumisen ja tarkistaa roolit
- `Login`: Kirjautumissivu Azure AD -kirjautumiselle

### Käyttäjien synkronointi
Kun käyttäjä kirjautuu ensimmäistä kertä järjestelmään:
1. Azure AD:stä haetaan käyttäjän perustiedot
2. Järjestelmä luo automaattisesti käyttäjätilin tietokantaan (USER-roolilla)
3. Käyttäjän tiedot päivitetään joka kirjautumisen yhteydessä

## Tietokantarakenne

### Ticket (Tiketti)
- `id`: String (UUID) - Tiketin yksilöllinen tunniste
- `title`: String - Tiketin otsikko
- `description`: String - Ongelman kuvaus
- `device`: String? - Laitteen tiedot (valinnainen)
- `additionalInfo`: String? - Lisätiedot (valinnainen)
- `status`: TicketStatus - Tiketin tila (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- `priority`: Priority - Prioriteetti (LOW, MEDIUM, HIGH, CRITICAL)
- `responseFormat`: ResponseFormat - Vastausmuoto (TEKSTI, KUVA, VIDEO) - määrittää miten tikettiin tulee vastata
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika
- `categoryId`: String - Kategorian tunniste
- `createdById`: String - Luojan tunniste
- `assignedToId`: String? - Vastuuhenkilön tunniste (valinnainen)
- `processingStartedAt`: DateTime? - Käsittelyn aloitusaika (valinnainen)
- `processingEndedAt`: DateTime? - Käsittelyn päättymisaika (valinnainen)
- `estimatedCompletionTime`: DateTime? - Arvioitu valmistumisaika (valinnainen)
- `attachments`: Attachment[] - Tiketin liitetiedostot (valinnainen)

### Attachment (Liitetiedosto)
- `id`: String (UUID) - Liitetiedoston yksilöllinen tunniste
- `filename`: String - Tiedoston nimi
- `path`: String - Tiedoston polku palvelimella
- `mimetype`: String - Tiedoston MIME-tyyppi
- `size`: Int - Tiedoston koko tavuina
- `ticketId`: String - Tiketin tunniste, johon liitetiedosto kuuluu
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika

### Category (Kategoria)
- `id`: String (UUID) - Kategorian yksilöllinen tunniste
- `name`: String - Kategorian nimi
- `description`: String? - Kategorian kuvaus (valinnainen)

### User (Käyttäjä)
- `id`: String (UUID) - Käyttäjän yksilöllinen tunniste
- `email`: String - Sähköpostiosoite
- `name`: String - Nimi
- `jobTitle`: String? - Käyttäjän työtehtävä tai ryhmä (valinnainen)
- `profilePicture`: String? - Profiilikuva base64-koodattuna (valinnainen)
- `role`: UserRole - Rooli (ADMIN, SUPPORT, USER)
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika
- `notifications`: Notification[] - Käyttäjän ilmoitukset
- `notificationSettings`: NotificationSettings? - Käyttäjän ilmoitusasetukset

### Comment (Kommentti)
- `id`: String (UUID) - Kommentin yksilöllinen tunniste
- `content`: String - Kommentin tekstisisältö
- `mediaUrl`: String? - Mediasisällön URL-polku (valinnainen)
- `mediaType`: MediaType? - Mediasisällön tyyppi (IMAGE, VIDEO) (valinnainen)
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika
- `ticketId`: String - Tiketin tunniste
- `authorId`: String - Kirjoittajan tunniste

### Notification (Ilmoitus)
- `id`: String (UUID) - Ilmoituksen yksilöllinen tunniste
- `type`: NotificationType - Ilmoituksen tyyppi (TICKET_ASSIGNED, COMMENT_ADDED, STATUS_CHANGED, PRIORITY_CHANGED, MENTIONED, DEADLINE_APPROACHING)
- `content`: String - Ilmoituksen sisältö
- `read`: Boolean - Onko ilmoitus luettu
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika
- `userId`: String - Käyttäjän tunniste
- `ticketId`: String? - Tiketin tunniste (valinnainen)
- `metadata`: Json? - Lisätiedot (valinnainen)

### NotificationSettings (Ilmoitusasetukset)
- `id`: String (UUID) - Asetusten yksilöllinen tunniste
- `userId`: String - Käyttäjän tunniste
- `emailNotifications`: Boolean - Sähköposti-ilmoitukset käytössä
- `webNotifications`: Boolean - Selainilmoitukset käytössä
- `notifyOnAssigned`: Boolean - Ilmoita kun tiketti osoitetaan
- `notifyOnStatusChange`: Boolean - Ilmoita tilamuutoksista
- `notifyOnComment`: Boolean - Ilmoita uusista kommenteista
- `notifyOnPriority`: Boolean - Ilmoita prioriteettimuutoksista
- `notifyOnMention`: Boolean - Ilmoita @-maininnoista
- `notifyOnDeadline`: Boolean - Ilmoita deadlinesta
- `createdAt`: DateTime - Luontiaika
- `updatedAt`: DateTime - Viimeisin päivitysaika

## Tietokannan hallinta

### Migraatiot
Tietokannan rakenne on versionhallittu Prisman migraatioiden avulla. Migraatiot löytyvät `backend/prisma/migrations` -kansiosta.

#### Kehitysympäristössä
- Uuden migraation luominen: `npx prisma migrate dev --name muutoksen_nimi`
- Tietokannan nollaus: `npm run db:reset`
- Tietokannan käynnistys: `npm run db:up`
- Tietokannan sammutus: `npm run db:down`

#### Tuotantoympäristössä
- Migraatiot ajetaan automaattisesti `npm start` -komennon yhteydessä
- Migraatiot ajetaan turvallisesti `prisma migrate deploy` -komennolla
- Tuotannossa ei koskaan nollata tietokantaa tai poisteta migraatioita

### Prisma Studio
Kehitysympäristössä voit tarkastella ja muokata tietokantaa Prisma Studion avulla:
```bash
npm run dev:studio
```
Studio käynnistyy osoitteeseen http://localhost:5555

## API Endpoints

### Autentikointi
- `POST /api/auth/login` - Azure AD -kirjautuminen
- `GET /api/auth/me` - Hae kirjautuneen käyttäjän tiedot
- `POST /api/auth/logout` - Kirjaudu ulos

### Tiketit
- `GET /api/tickets` - Hae kaikki tiketit (vaatii SUPPORT/ADMIN-roolin)
- `GET /api/tickets/my-tickets` - Hae käyttäjän omat tiketit
- `GET /api/tickets/:id` - Hae yksittäinen tiketti (vaatii omistajuuden tai SUPPORT/ADMIN-roolin)
- `POST /api/tickets` - Luo uusi tiketti
  ```typescript
  // Käytetään multipart/form-data -muotoa
  // FormData sisältää:
  {
    title: string;
    description: string;
    device?: string;
    additionalInfo?: string;
    priority: Priority;
    categoryId: string;
    responseFormat: "TEKSTI" | "KUVA" | "VIDEO";
    attachments?: File[]; // Tiedostojen lataus, maksimissaan 5 tiedostoa
  }

  // Esimerkki FormData:
  // - title: "Näppäimistö ei toimi"
  // - description: "Luokassa A123 tietokoneen näppäimistö ei reagoi painalluksiin"
  // - device: "HP EliteBook 840 G7"
  // - additionalInfo: "Ongelma alkoi tänään aamulla"
  // - priority: "HIGH"
  // - categoryId: "clsj2n9g0000dtp97zr5lqw3x"
  // - responseFormat: "TEKSTI"
  // - attachments[0]: [File object]
  // - attachments[1]: [File object]
  ```
- `PUT /api/tickets/:id` - Päivitä tikettiä (vaatii omistajuuden tai SUPPORT/ADMIN-roolin)
  ```typescript
  {
    title?: string;
    description?: string;
    device?: string;
    additionalInfo?: string;
    status?: TicketStatus;
    priority?: Priority;
    assignedToId?: string;
    categoryId?: string;
    responseFormat?: ResponseFormat;
  }

  // Esimerkki
  {
    "status": "IN_PROGRESS",
    "priority": "MEDIUM",
    "assignedToId": "clsj2n9g0000etp97zr5lqw3y",
    "additionalInfo": "Tukihenkilö käynyt tarkistamassa tilanteen",
    "responseFormat": "TEKSTI"
  }
  ```
- `DELETE /api/tickets/:id` - Poista tiketti (vaatii omistajuuden tai SUPPORT/ADMIN-roolin)
- `PUT /api/tickets/:id/release` - Vapauta tiketti takaisin OPEN-tilaan (vaatii SUPPORT/ADMIN-roolin)
  ```typescript
  // Ei vaadi request bodya
  // Palauttaa päivitetyn tiketin
  ```
- `PUT /api/tickets/:id/status` - Päivitä tiketin tila ja lisää automaattinen kommentti (vaatii SUPPORT/ADMIN-roolin)
  ```typescript
  {
    status: TicketStatus; // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  }

  // Esimerkki
  {
    "status": "RESOLVED"
  }
  ```
- `PUT /api/tickets/:id/transfer` - Siirrä tiketti toiselle tukihenkilölle (vaatii SUPPORT/ADMIN-roolin)
  ```typescript
  {
    targetUserId: string; // Kohdetukihenkilön ID
  }

  // Esimerkki
  {
    "targetUserId": "clsj2n9g0000gtp97zr5lqw4a"
  }

  // Vastaus
  {
    "ticket": {
      // Päivitetyn tiketin tiedot
      "id": "...",
      "assignedToId": "clsj2n9g0000gtp97zr5lqw4a",
      // ... muut tiketin kentät
    }
  }
  ```

### Kategoriat
- `GET /api/categories` - Hae kaikki kategoriat
  ```typescript
  // Vastauksen esimerkki
  {
    "categories": [
      {
        "id": "clsj2n9g0000dtp97zr5lqw3x",
        "name": "Tekniset ongelmat",
        "description": "Tietokoneiden ja laitteiden tekniset ongelmat"
      },
      {
        "id": "clsj2n9g0000etp97zr5lqw3z",
        "name": "Yleinen",
        "description": "Yleiset tukipyynnöt"
      }
    ]
  }
  ```

### Kommentit
- `POST /api/tickets/:ticketId/comments` - Lisää tekstikommentti tikettiin
  ```typescript
  {
    content: string;
  }

  // Esimerkki
  {
    "content": "Näppäimistö vaihdettu uuteen, ongelma korjattu."
  }
  ```
- `POST /api/tickets/:id/comments/media` - Lisää mediakommentti tikettiin (kuva tai video)
  ```typescript
  // Käytetään multipart/form-data -muotoa
  // FormData sisältää:
  // - media: File - kuva- tai videotiedosto (max 10 MB)
  // - content: string - tekstikommentti (valinnainen)

  // Tuetut tiedostotyypit:
  // - Kuvat: .jpg, .jpeg, .png, .gif, .webp
  // - Videot: .mp4, .webm, .mov
  
  // Huom: Kaikilla tukihenkilöillä on oikeus lisätä mediakommentteja tiketteihin,
  // vaikka tiketti ei olisi heille osoitettu. Tämä mahdollistaa joustavamman tiimityöskentelyn.

  // Onnistuneen vastauksen esimerkki
  {
    "success": true,
    "comment": {
      "id": "clsj2n9g0000gtp97zr5lqw4b",
      "content": "Tässä kuva uudesta näppäimistöstä.",
      "mediaUrl": "/uploads/images/keyboard-12345.jpg",
      "mediaType": "image",
      "createdAt": "2024-01-31T12:00:00.000Z",
      "author": {
        "id": "clsj2n9g0000etp97zr5lqw3y",
        "name": "Tukihenkilö Testaaja"
      }
    }
  }
  ```
- `GET /api/tickets/:ticketId/comments` - Hae tiketin kommentit
  ```typescript
  // Vastauksen esimerkki
  {
    "comments": [
      {
        "id": "clsj2n9g0000ftp97zr5lqw3z",
        "content": "Näppäimistö vaihdettu uuteen, ongelma korjattu.",
        "createdAt": "2024-01-31T12:00:00.000Z",
        "author": {
          "id": "clsj2n9g0000etp97zr5lqw3y",
          "name": "Tukihenkilö Testaaja"
        }
      },
      {
        "id": "clsj2n9g0000gtp97zr5lqw4b",
        "content": "Tässä kuva uudesta näppäimistöstä.",
        "mediaUrl": "/uploads/images/keyboard-12345.jpg",
        "mediaType": "image",
        "createdAt": "2024-01-31T12:00:00.000Z",
        "author": {
          "id": "clsj2n9g0000etp97zr5lqw3y",
          "name": "Tukihenkilö Testaaja"
        }
      }
    ]
  }
  ```

### Käyttäjät
- `GET /api/users/me` - Hae kirjautuneen käyttäjän tiedot
  ```typescript
  // Vastauksen esimerkki
  {
    "id": "clsj2n9g0000etp97zr5lqw3y",
    "email": "testi.kayttaja@esedulainen.fi",
    "name": "Testi Käyttäjä",
    "jobTitle": "Ryhmä323...",
    "role": "USER",
    "profilePicture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAA..." // Vain jos saatavilla
  }
  ```
- `GET /api/users` - Hae kaikki käyttäjät (vaatii ADMIN-roolin)
  ```typescript
  // Vastauksen esimerkki
  {
    "users": [
      {
        "id": "clsj2n9g0000etp97zr5lqw3y",
        "email": "testi.kayttaja@esedulainen.fi",
        "name": "Testi Käyttäjä",
        "jobTitle": "Ryhmä323...",
        "role": "USER"
      },
      {
        "id": "clsj2n9g0000gtp97zr5lqw4a",
        "email": "tuki.henkilo@esedulainen.fi",
        "name": "Tuki Henkilö",
        "role": "SUPPORT"
      }
    ]
  }
  ```
- `PUT /api/users/:id/role` - Päivitä käyttäjän rooli (vaatii ADMIN-roolin)
  ```typescript
  // Tyyppi
  {
    role: 'ADMIN' | 'SUPPORT' | 'USER'
  }

  // Esimerkki
  {
    "role": "SUPPORT"
  }
  ```
- `GET /api/users/profile-picture/:userId` - Hae käyttäjän profiilikuva ID:n perusteella
  ```typescript
  // Vastauksen esimerkki
  {
    "profilePicture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAA..."
  }
  
  // Virhetilanteet (404 Not Found):
  {
    "error": "User not found"
  }
  {
    "error": "Profile picture not found"
  }
  ```
- `GET /api/users/profile-picture/by-email/:email` - Hae käyttäjän profiilikuva sähköpostin perusteella
  ```typescript
  // Vastauksen esimerkki on sama kuin userId-versiossa
  ```
- `POST /api/users/profile-picture/microsoft` - Päivitä kirjautuneen käyttäjän profiilikuva Microsoft Graph API:sta (vain autentikoituneille käyttäjille)
  ```typescript
  // Request body
  {
    "graphAccessToken": "eyJ0eXAiOiJKV1QiLCJub25jZSI6IkFRQ..." // Microsoft Graph API:n access token
  }
  
  // Vastauksen esimerkki
  {
    "profilePicture": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAA...",
    "message": "Profile picture updated successfully from Microsoft"
  }
  
  // Mikäli profiilikuvaa ei löydy Microsoftista
  {
    "message": "No profile picture available from Microsoft"
  }
  ```

### Ilmoitukset
- `GET /api/notifications` - Hae käyttäjän ilmoitukset
- `GET /api/notifications/unread/count` - Hae lukemattomien ilmoitusten määrä
- `PUT /api/notifications/:id/read` - Merkitse ilmoitus luetuksi
- `PUT /api/notifications/read/all` - Merkitse kaikki ilmoitukset luetuiksi
- `DELETE /api/notifications/:id` - Poista ilmoitus

### Ilmoitusasetukset
- `GET /api/notification-settings` - Hae käyttäjän ilmoitusasetukset
- `PUT /api/notification-settings` - Päivitä ilmoitusasetuksia
  ```typescript
  {
    emailNotifications?: boolean;
    webNotifications?: boolean;
    notifyOnAssigned?: boolean;
    notifyOnStatusChange?: boolean;
    notifyOnComment?: boolean;
    notifyOnPriority?: boolean;
    notifyOnMention?: boolean;
    notifyOnDeadline?: boolean;
  }
  ```

## Kehitysympäristön pystytys

### Vaatimukset
- Node.js (v18 tai uudempi)
- Docker Desktop
- npm (v9 tai uudempi)
- Git

### Ympäristömuuttujat

#### Backend (.env)
```
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=esedu_tiketti_db

DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5434/${POSTGRES_DB}?schema=public"

ENVIRONMENT=development
PORT=3001

JWT_SECRET=your-super-secret-key-here 
```

#### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
VITE_MSAL_CLIENT_ID=your-client-id
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
VITE_MSAL_REDIRECT_URI=http://localhost:3000
VITE_ENVIRONMENT=development
```


## Projektin rakenne

```
.
├── frontend/                # Frontend-sovellus
│   ├── src/
│   │   ├── components/     # Uudelleenkäytettävät komponentit
│   │   │   ├── ui/        # Yleiset UI-komponentit
│   │   │   ├── Tickets/   # Tiketteihin liittyvät komponentit
│   │   │   └── Auth/      # Autentikointiin liittyvät komponentit
│   │   ├── pages/         # Sivukomponentit
│   │   │   ├── Login.jsx  # Kirjautumissivu
│   │   │   └── ...
│   │   ├── providers/     # React Context providerit
│   │   │   └── AuthProvider.jsx
│   │   ├── services/      # Palvelukerros
│   │   │   ├── authService.js
│   │   │   └── ...
│   │   ├── config/        # Konfiguraatiot
│   │   │   ├── msal.js    # MSAL konfiguraatio
│   │   │   └── ...
│   │   ├── utils/         # Apufunktiot
│   │   └── api/           # API-kutsut
│   └── ...
├── backend/                # Backend-sovellus
│   ├── src/
│   │   ├── routes/        # API-reitit
│   │   │   ├── authRoutes.ts
│   │   │   └── ...
│   │   ├── controllers/   # Reitinkäsittelijät
│   │   │   ├── authController.ts
│   │   │   └── ...
│   │   ├── services/      # Bisneslogiikka
│   │   │   ├── authService.ts
│   │   │   └── ...
│   │   ├── middleware/    # Middlewaret
│   │   │   ├── authMiddleware.ts    # Autentikointi middleware
│   │   │   └── ...
│   │   └── types/         # TypeScript-tyypit
│   ├── prisma/            # Prisma skeema ja migraatiot
│   └── ...
```

## Testaus
- Frontend: React Testing Library (tulossa)
- Backend: Jest (tulossa)
- E2E: Cypress (tulossa)

## Tuotantoon vienti

1. Buildaa sovellus:
```bash
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

2. Käynnistä tuotantoversio:
```bash
# Backend
cd backend
npm start
```

Huomioitavaa:
- Varmista että ympäristömuuttujat ovat oikein (erityisesti `DATABASE_URL` ja Azure AD -muuttujat)
- Tuotannossa migraatiot ajetaan automaattisesti käynnistyksen yhteydessä
- Prisma Client generoidaan automaattisesti asennuksen ja buildin yhteydessä

## Vianetsintä

### Yleiset ongelmat

1. Docker-kontti ei käynnisty
   - Varmista että Docker Desktop on käynnissä
   - Tarkista portit (5434 pitää olla vapaana)
   - Kokeile `docker-compose down` ja sitten `npm run dev`

2. Prisma-virheet
   - Poista `node_modules/.prisma`
   - Aja `npm install`
   - Aja `npx prisma generate`

3. TypeScript-virheet
   - Varmista että kaikki riippuvuudet on asennettu
   - Tarkista että `tsconfig.json` on ajan tasalla
   - Kokeile käynnistää TypeScript-palvelin uudelleen VS Codessa 

4. Profiilikuvien ongelmat
   - **Profiilikuvat eivät päivity**: Tyhjennä localStorage-tiedot selaimessa
     ```javascript
     // Selaimen konsolissa
     localStorage.removeItem('lastProfilePictureRefresh');
     ```
   - **Profiilikuvat eivät näy**: Tarkista että Microsoft Graph API:n oikeudet ovat oikein
     - Tarkista että käyttäjällä on profiilikuva Microsoft-tilillään
   - **Tietokantavirhe profiilikuvakentässä**: Aja migraatiot uudelleen
     ```bash
     npx prisma migrate dev --name add_profile_picture_field
     ```
   - **Vain oma profiilikuva näkyy**: Tämä on odotettua käyttäytymistä ensikäynnistyksen jälkeen
     - Profiilikuvat tallentuvat tietokantaan käyttäjien kirjautuessa sisään
     - Kuvat muille käyttäjille tulevat saataville vain kun he kirjautuvat

## Päivitysohjeet

Kun projekti on päivittynyt GitHubissa ja haluat päivittää oman versiosi ajan tasalle, seuraa näitä ohjeita:

### 1. Hae uusin versio

```bash
git pull origin main
```

### 2. Asenna uudet riippuvuudet

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Päivitä tietokanta

```bash
# Backend-kansiossa
cd ../backend
npx prisma generate  # Päivitä Prisma Client
npx prisma migrate dev  # Aja uudet migraatiot
```

### 4. Käynnistä sovellus uudelleen

```bash
# Backend
npm run dev

# Frontend (uudessa terminaalissa)
cd ../frontend
npm run dev
```

### Mahdolliset ongelmatilanteet

#### Prisma-virheet
Jos kohtaat Prisma-virheitä, kokeile seuraavaa:
```bash
cd backend
rm -rf node_modules/.prisma
npm install
npx prisma generate
```

#### Tietokantavirheet
Jos tietokanta on epäsynkronissa:
```bash
cd backend
npx prisma migrate reset --force  # Nollaa tietokannan ja ajaa migraatiot uudelleen
```

#### Tyyppivirheet
Jos kohtaat tyyppivirheitä:
```bash
# Backend
cd backend
npm run build

# Frontend
cd ../frontend
npm run build
```

### Huomioitavaa
- Tarkista että `.env` tiedostot ovat ajan tasalla (kysy tarvittaessa tiimin vetäjältä)
- Jos kohtaat ongelmia, sulje kaikki terminaalit ja avaa ne uudelleen
- `prisma migrate reset` nollaa tietokannan - varmista että sinulla ei ole tärkeää dataa tietokannassa
- Jos ongelmat jatkuvat, voit aina kloonata projektin uudelleen puhtaaseen kansioon 

### Tiketin käsittely

Tiketin käsittelyssä on seuraavat vaiheet:

1. Tiketin ottaminen käsittelyyn:
   - Tukihenkilö ottaa tiketin käsittelyyn "Ota käsittelyyn" -napista
   - Tiketti siirtyy IN_PROGRESS-tilaan
   - Järjestelmä asettaa käsittelyn aloitusajan ja arvioidun valmistumisajan
   - Arvioitu valmistumisaika määräytyy prioriteetin mukaan:
     - CRITICAL: 2 tuntia
     - HIGH: 4 tuntia
     - MEDIUM: 8 tuntia
     - LOW: 24 tuntia

2. Tiketin käsittely:
   - Tukihenkilö voi:
     - Vapauttaa tiketin takaisin OPEN-tilaan
     - Merkitä tiketin ratkaistuksi (RESOLVED)
     - Sulkea tiketin (CLOSED)
   - Tiketin luoja voi:
     - Sulkea tiketin missä tahansa tilassa (paitsi jos tiketti on jo RESOLVED tai CLOSED)
   - Kaikista tilan muutoksista luodaan automaattinen kommentti
   - Käsittelyn päättymisaika tallennetaan kun tiketti merkitään ratkaistuksi tai suljetaan

3. Tiketin uudelleen avaaminen:
   - Ratkaistu tai suljettu tiketti voidaan avata uudelleen IN_PROGRESS-tilaan
   - Tämä nollaa käsittelyn päättymisajan ja asettaa uuden arvioidun valmistumisajan

### Järjestelmäviestit

Järjestelmä luo automaattisia viestejä tiketin tilan muutoksista. Viestit on värikoodattu seuraavasti:

1. Keltainen:
   - "Tiketti otettu käsittelyyn"
   - Tiketin tila muutettu: IN_PROGRESS

2. Vihreä:
   - Tiketin tila muutettu: RESOLVED

3. Harmaa:
   - Tiketin tila muutettu: CLOSED

4. Sininen:
   - "Tiketti vapautettu"

5. Violetti:
   - "Tiketin käsittelijä vaihdettu"
   - Tiketin siirtoviestit

Järjestelmäviestit erottuvat selkeästi muista viesteistä:
- Selkeä visuaalinen hierarkia
- Värikoodaus tapahtumatyypin mukaan
- Parannettu luettavuus

### Tukihenkilöiden työnäkymä

Tukihenkilöillä ja admineilla on käytössään erillinen työnäkymä `/my-work` osoitteessa:

1. Käsittelyssä-välilehti:
   - Näyttää vain tiketit, jotka ovat tilassa IN_PROGRESS ja osoitettu kyseiselle tukihenkilölle
   - Päivittyy automaattisesti 30 sekunnin välein
   - Näyttää tikettien määrän välilehden otsikossa

2. Avoimet tiketit-välilehti:
   - Näyttää kaikki tiketit, jotka ovat OPEN-tilassa ja joita ei ole osoitettu kenellekään
   - Päivittyy automaattisesti 30 sekunnin välein
   - Näyttää avoimien tikettien määrän välilehden otsikossa

### Kommentoinnin rajoitukset

Tikettien kommentoinnissa on seuraavat rajoitukset:

1. Tiketin luoja:
   - Voi kommentoida tikettiä aina kun se on OPEN tai IN_PROGRESS tilassa
   - Ei voi kommentoida kun tiketti on RESOLVED tai CLOSED

2. Tukihenkilö:
   - Voi kommentoida vain tikettejä, jotka ovat IN_PROGRESS tilassa ja osoitettu hänelle
   - Ei voi kommentoida OPEN-tilassa olevia tikettejä ennen kuin ottaa ne käsittelyyn
   - Ei voi kommentoida toisen tukihenkilön käsittelyssä olevia tikettejä

3. Admin:
   - Voi kommentoida kaikkia tikettejä paitsi RESOLVED tai CLOSED tilassa olevia

### Syötteiden validointi

Kaikki syötteet validoidaan ja sanitoidaan automaattisesti:

1. Tiketin luonti ja päivitys:
   ```typescript
   {
     title: string;       // 5-100 merkkiä
     description: string;   // 10-2000 merkkiä
     device?: string;    // max 100 merkkiä, valinnainen
     additionalInfo?: string | null; // max 1000 merkkiä, valinnainen
     priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
     categoryId: string;  // UUID-muotoinen
     responseFormat: "TEKSTI" | "KUVA" | "VIDEO"; // Määrittää miten tikettiin tulee vastata, oletuksena "TEKSTI"
   }
   ```

2. Kommentin lisäys:
   ```typescript
   // Tekstikommentti
   {
     content: string; // 1-1000 merkkiä
   }
   
   // Mediakommentti (multipart/form-data)
   {
     media: File; // max 10 MB, tyypit: jpg, jpeg, png, gif (kuva) tai mp4, webm, mov (video)
     content?: string; // 0-1000 merkkiä, valinnainen
   }
   ```

3. Turvallisuus:
   - Kaikki HTML-koodi poistetaan syötteistä automaattisesti
   - Erikoismerkit muunnetaan turvalliseen muotoon
   - Virheelliset syötteet hylätään automaattisesti

### Virheviestit

Validointivirheistä palautetaan selkokieliset virheilmoitukset:

```typescript
// Esimerkkejä virheistä
{
  error: "Otsikon pitää olla vähintään 5 merkkiä"
}
{
  error: "Kuvaus on liian pitkä (max 2000 merkkiä)"
}
{
  error: "Virheellinen kategoria ID"
}
```

## WebSocket-yhteydet

### Yhteyden muodostaminen
Frontend muodostaa WebSocket-yhteyden Socket.IO:n avulla:
```javascript
const socket = io(baseUrl, {
  auth: { token: 'Bearer [JWT-token]' },
  transports: ['websocket'],
  path: '/socket.io/',
  reconnection: true
});
```

### Tapahtumat
- `notification` - Uusi ilmoitus käyttäjälle
  ```typescript
  {
    id: string;
    type: NotificationType;
    content: string;
    ticketId?: string;
    metadata?: Record<string, any>;
    timestamp: string;
  }
  ```

### Virheenkäsittely
- Yhteyden katketessa Socket.IO yrittää automaattisesti yhdistää uudelleen
- Yhteyden tila päivitetään käyttöliittymään
- Offline-tilassa ilmoitukset tallennetaan ja näytetään kun yhteys palautuu

## Kommenttien @-maininta

### Toiminnallisuus
- Käyttäjät voidaan mainita kommenteissa @-merkillä
- Automaattinen käyttäjien ehdotus kirjoitettaessa
- Mainitut käyttäjät saavat ilmoituksen
- Maininnat korostetaan visuaalisesti

### Käyttö
```typescript
// Kommentti jossa maininta
const comment = "Hei @Matti Meikäläinen, voisitko tarkistaa tämän?";

// Maininta laukaisee ilmoituksen
// NotificationType.MENTIONED
```

### Tyylimäärittelyt
```css
.mention {
  color: #4F46E5;
  background-color: rgba(79, 70, 229, 0.1);
  border-radius: 4px;
  padding: 1px 4px;
  font-weight: 500;
}
```

## Media vastaukset

### Toiminnallisuus
- Tiketille voidaan määrittää haluttu vastausmuoto: TEKSTI, KUVA tai VIDEO
- Tikettiin voidaan lisätä mediakommentteja (kuvia tai videoita) tekstin lisäksi
- Mediakommentit näytetään viestikentässä inline-sisältönä
- Aikajanalla näytetään media-lisäykset selkeästi visuaalisesti korostettuna

### Median lähetys
- Tukihenkilöt voivat lähettää kuvia ja videoita kommenttien yhteydessä
  - Tiketeissä, jotka vaativat mediavastausta (KUVA/VIDEO), tukihenkilön on lähetettävä mediavastaus ennen tekstikommentteja
  - Järjestelmä antaa selkeän virheilmoituksen, jos yritetään lähettää tekstikommentti ennen mediavastausta
  - Kun mediavastaus on annettu, tekstikommenttien lähettäminen on mahdollista
- Tiketin luojat voivat lisätä mediasisältöä (kuvia ja videoita) kommentteihin missä tahansa vaiheessa tikettiprosessia
  - Mediakommentin lisäys onnistuu "Lisää media" -painikkeella
  - Tiedostot valitaan käyttäjän laitteelta
- Lähetys tapahtuu tiedoston latauslomakkeella
- Tuetut tiedostomuodot:
  - Kuvat: jpg, jpeg, png, gif
  - Videot: mp4, webm, mov
- Tiedostokokorajoitus: 10 MB

### Median näyttäminen
- Kuvat näytetään suoraan viestikentässä
- Videot näytetään upotetussa soittimessa
- Klikkaamalla mediaa sen voi avata suurempaan näkymään
- Aikajanalla on selkeä indikaattori media-lisäyksistä

### Median validointi
- Järjestelmä tarkistaa, että kuva/video vastaa tiketin määritettyä vastausmuotoa
- Virheilmoitus näytetään, jos tiedostomuoto ei ole sallittu
- Tietoturvatarkistukset suoritetaan kaikille ladatuille tiedostoille
- Järjestelmä tunnistaa automaattisesti, kun tukihenkilö on jo lisännyt mediavastauksen tikettiin:
  - Backend tarkistaa onko käyttäjä jo lisännyt mediavastauksen ennen tekstikommentin hyväksymistä
  - Frontend näyttää selkeät ohjeet ja virheilmoitukset käyttäjälle

## Microsoft Graph API Integraatio

### Profiilikuvien hakeminen ja välimuistitus

Järjestelmä hyödyntää Microsoft Graph API:a käyttäjien profiilikuvien näyttämiseen ja tallentaa ne tietokantaan välimuistiin. 

#### Profiilikuvien synkronointi

Järjestelmä seuraa optimoitua prosessia profiilikuvien noutamisessa:

1. **Kirjautumisen yhteydessä**:
   - Järjestelmä tarkistaa, milloin käyttäjän profiilikuva on viimeksi päivitetty
   - Profiilikuva noudetaan Microsoft Graph API:sta vain jos:
     - Sitä ei ole vielä haettu koskaan, tai
     - Edellisestä päivityksestä on kulunut yli viikko (7 päivää)

2. **Profiilinäkymässä**:
   - Profiilikuva päivitetään Microsoftista vain jos edellisestä päivityksestä on kulunut yli vuorokausi (24 tuntia)
   - Muutoin käytetään tietokannassa jo olevaa välimuistissa olevaa kuvaa

3. **Muualla sovelluksessa**:
   - Profiilikuvat haetaan aina ensin tietokannasta (backend API)
   - Microsoft Graph API:a käytetään vain jos kuvaa ei löydy tietokannasta JA kyseessä on kirjautunut käyttäjä

#### Tekninen toteutus

Frontend käyttää optimoitua logiikkaa kuvien noutamiseen:

```javascript
// Tarkistetaan milloin profiilikuva on viimeksi päivitetty
const lastRefresh = localStorage.getItem('lastProfilePictureRefresh');
const now = Date.now();
const oneWeekInMs = 7 * 24 * 60 * 60 * 1000; // 7 päivää millisekunteina

// Päivitetään vain jos on kulunut yli viikko
if (!lastRefresh || (now - parseInt(lastRefresh, 10)) > oneWeekInMs) {
  // Haetaan token Graph API:a varten
  const graphToken = await userService.getGraphToken();
  
  // Päivitetään profiilikuva backendin kautta (tallentuu tietokantaan)
  await userService.updateProfilePictureFromMicrosoft(true); // force refresh
  
  // Päivitetään viimeisimmän päivityksen aikaleima
  localStorage.setItem('lastProfilePictureRefresh', now.toString());
}
```

Backend tallentaa profiilikuvat tietokantaan:

```typescript
// User-malli sisältää profiilikuvan
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String
  jobTitle        String?
  profilePicture  String?   // URL to the user's profile picture
  // ... muut kentät
}
```

### Muiden käyttäjien kuvien näyttäminen

Järjestelmä näyttää kaikkien käyttäjien profiilikuvat:

1. Kirjautuneen käyttäjän kuva haetaan ja tallennetaan Microsoft Graph API:sta
2. Muiden käyttäjien kuvat noudetaan tietokannasta (ei suoraa Microsoft Graph -kutsua)
3. Kaikki kuvat tallennetaan tietokantaan, joten ne ovat käytettävissä kaikille käyttäjille

### Profiilikuvien käyttöliittymä

Profiilikuvat näkyvät yhtenäisesti koko järjestelmässä:

1. Käyttäjän profiilisivulla (suurempana versiona)
2. Navigaatiopalkissa (pienenä versiona)
3. Kommenteissa ja tikettiketjussa
4. Käyttäjähallinnassa

Käyttäjän profiilisivulla näkyy selkeä viesti, että profiilikuva on synkronoitu Microsoft-tililtä.

### Fallback-mekanismi

Järjestelmä näyttää käyttäjän nimikirjaimet, jos profiilikuvaa ei ole saatavilla:

1. Järjestelmä yrittää hakea käyttäjän profiilikuvan tietokannasta
2. Jos kuvaa ei ole saatavilla, näytetään nimikirjaimet värillisissä ympyröissä
3. Nimikirjaimet muodostetaan käyttäjän etu- ja sukunimen ensimmäisistä kirjaimista

### Suorituskyky ja optimointi

Profiilikuvien käsittely on optimoitu:

1. Microsoft Graph API -kutsuja tehdään vain kun tarpeellista:
   - Kirjautuessa (kerran viikossa)
   - Profiilisivulla (kerran päivässä)
   - Kun kuvaa ei löydy tietokannasta

2. Useita välimuistitasoja:
   - Tietokanta (pitkäaikainen välimuisti)
   - Frontend-muistissa (istuntokohtainen välimuisti)
   - LocalStorage (päivityssyklien hallinta)

3. Base64-koodatut kuvat:
   - Kuvat tallennetaan base64-koodattuna tietokantaan
   - Ei tarvetta erillisille tiedostoille palvelimella
   - Tehokas tiedonsiirto rajapintakutsuissa

### Käyttöoikeudet

Järjestelmä käyttää Microsoft Graph API:n User.Read-oikeutta, joka ei vaadi erillistä admin-lupaa. Tämä mahdollistaa:

1. Kirjautuneen käyttäjän omien profiilikuvien näyttämisen
2. Kuvien tallentamisen tietokantaan muiden käyttäjien nähtäville

### Käyttäjän profiilikuvien päivitys

Profiilikuvat päivitetään automaattisesti käyttäjän kirjautuessa:

1. Kirjautumisen yhteydessä järjestelmä tarkistaa, milloin käyttäjän profiilikuva on viimeksi päivitetty (tallennetaan localStorage:een)
2. Jos edellisestä päivityksestä on kulunut yli viikko tai kuvaa ei ole aiemmin haettu, järjestelmä päivittää profiilikuvan Microsoft Graph API:sta
3. Profiilikuva tallennetaan tietokantaan, josta se on saatavilla kaikille käyttäjille

Profiilikuvien päivityssykliä on optimoitu:
- Kirjautumisessa: päivitys kerran viikossa
- Profiilisivulla: päivitys kerran päivässä
- Muualla sovelluksessa: käytetään välimuistissa olevaa kuvaa

Jos kohtaat ongelmia profiilikuvien kanssa:
```bash
# Tyhjennä localStorage (selaimessa)
localStorage.removeItem('lastProfilePictureRefresh');

# Välimuistin tyhjennys (kirjautumisen jälkeen)
# Frontend konsolissa
userService.clearProfileCache();
```