# Järjestelmän Arkkitehtuuri

Tämä dokumentti kuvaa tikettijärjestelmän teknisen arkkitehtuurin, käytetyt teknologiat, pika-aloitusohjeet, kehitysympäristön pystytyksen, käyttäjäroolit, päivitysohjeet ja hakemistorakenteen.

## Pika-aloitus

1.  Varmista että sinulla on asennettuna ja käynnissä:
    *   [Docker Desktop](https://www.docker.com/products/docker-desktop/)
    *   [Node.js](https://nodejs.org/) (v18 tai uudempi)
    *   [Git](https://git-scm.com/downloads)

2.  Kloonaa tai pullaa projekti:
    ```bash
    git clone [repositorion-url]
    cd esedu-tiketti
    ```

3.  Asenna ja käynnistä backend (kehitystilassa):
    ```bash
    cd backend
    npm install
    cp .env.example .env  # Kopioi ja muokkaa ympäristömuuttujat
    npm run dev  # Käynnistää kaikki palvelut
    ```
    *   Käynnistää PostgreSQL-tietokannan Docker-kontissa (portti 5434).
    *   Ajaa tietokannan migraatiot ja seed-skriptin.
    *   Käynnistää Prisma Studion (http://localhost:5555).
    *   Käynnistää backend-palvelimen (http://localhost:3001).
    *   Vaihtoehtoiset komennot:
        - `npm run dev:server` - Vain kehityspalvelin
        - `npm run dev:studio` - Vain Prisma Studio
        - `docker-compose up -d` - Backend+DB konteissa

4.  Asenna ja käynnistä frontend (uudessa terminaalissa):
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *   Frontend käynnistyy osoitteeseen http://localhost:3000

## Kehitysympäristön Pystytys

### Vaatimukset
*   Node.js (v18 tai uudempi)
*   Docker Desktop
*   npm (v9 tai uudempi)
*   Git

### Ympäristömuuttujat

Varmista, että seuraavat `.env`-tiedostot ovat olemassa projektin juuressa olevien `.env.example`-tiedostojen mukaisesti ja sisältävät oikeat arvot.

#### Backend (`backend/.env`)
```dotenv
# PostgreSQL-asetukset (Docker Compose käyttää näitä)
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=esedu_tiketti_db

# Tietokantayhteysosoite Prismalle (localhost:5434 kehityksessä)
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5434/${POSTGRES_DB}?schema=public"

# Backend-palvelimen portti
PORT=3001

FRONTEND_URL=http://localhost:3000

# JWT-allekirjoitusavain (vähintään 32 merkkiä)
JWT_SECRET=your-super-secret-key-here-minimum-32-characters

# Azure AD -asetukset 
AZURE_AD_CLIENT_ID=your-azure-ad-client-id
AZURE_AD_CLIENT_SECRET=your-azure-ad-client-secret
AZURE_AD_TENANT_ID=your-azure-ad-tenant-id
AZURE_AD_REDIRECT_URI=http://localhost:3001/api/auth/openid/return # Backendin callback URL

# OpenAI API-avain (AI-ominaisuuksille)
OPENAI_API_KEY=your_openai_api_key_here

# Ympäristön tyyppi (development/test/production)
NODE_ENV=development
ENVIRONMENT=development

# Kehityskäyttöön (NEVER true in production)
SKIP_JWT_VERIFICATION=false
DEVELOPER_EMAILS=dev1@example.com,dev2@example.com

OPENAI_API_KEY=sk-proj-1234567890
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_COMPLETION_MODEL=gpt-4o-mini
OPENAI_ADVANCED_MODEL=gpt-4o-mini

```

#### Frontend (`frontend/.env`)
```dotenv
# Backend API:n URL
VITE_API_URL=http://localhost:3001/api

# MSAL-kirjaston asetukset (Azure AD)
VITE_MSAL_CLIENT_ID=your-azure-ad-client-id # Sama kuin backendissä
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/your-azure-ad-tenant-id # Tenant ID
VITE_MSAL_REDIRECT_URI=http://localhost:3000 # Frontendin callback URL

# Ympäristön tyyppi
VITE_ENVIRONMENT=development
```

### Seed-data (Testidata)

Kehitysympäristössä luodaan automaattisesti testidataa (`backend/prisma/seed.ts`), kun `npm run dev` tai `npx prisma db seed` ajetaan:

*   **Käyttäjät:** Luodaan `upsert`-operaatiolla (ei duplikaattivirheitä)
    *   ADMIN: `admin@example.com`
    *   SUPPORT: `support@example.com`
    *   USER: `user@example.com`
*   **Kategoriat:** "Tekniset ongelmat", "Yleinen"

### Kehitystyökalut

*   **JWT Token Generator**: `node backend/scripts/generateTestToken.js` - Luo testaustoken API-testausta varten

**HUOM:** Komento `cd backend && npm run db:reset` tyhjentää tietokannan, ajaa migraatiot ja seed-skriptin. Käytä vain kehityksessä.

## Käyttäjäroolit ja Oikeudet

Järjestelmässä on kolme käyttäjäroolia (`Role`-enum):

1.  **USER (Opiskelija)**
    *   Voi luoda tikettejä.
    *   Näkee ja voi muokata omia tikettejään.
    *   Voi kommentoida omia avoimia tai käsittelyssä olevia tikettejään.
    *   Voi sulkea oman tikettinsä (paitsi jos RESOLVED/CLOSED).
2.  **SUPPORT (Tukihenkilö)**
    *   Kaikki USER-oikeudet.
    *   Pääsy hallintapaneeliin (`/my-work`).
    *   Voi nähdä ja käsitellä kaikkia tikettejä (ottaa käsittelyyn, vapauttaa, siirtää, muuttaa tilaa).
    *   Voi kommentoida omassa käsittelyssään olevia tikettejä (IN_PROGRESS).
    *   Voi käyttää AI-työkaluja (Tikettigeneraattori).
3.  **ADMIN (Järjestelmänvalvoja)**
    *   Kaikki SUPPORT-oikeudet.
    *   Voi hallita käyttäjien rooleja (paitsi muita ADMINeja).
    *   Täydet järjestelmänvalvojan oikeudet, voi kommentoida kaikkia tikettejä (paitsi RESOLVED/CLOSED).
    *   Pääsy AI-analyysityökaluihin.

### Käyttäjien Hallinta
Admin-käyttäjät voivat hallita käyttäjien rooleja käyttöliittymän kautta (Header -> Käyttäjien hallinta -dialogi).

## Päivitysohjeet

Kun projektiin tulee muutoksia (esim. Git-repositorioon), päivitä paikallinen kehitysympäristösi:

1.  **Hae muutokset:**
    ```bash
    git pull origin main # Tai käytetty branch
    ```
2.  **Asenna riippuvuudet:**
    ```bash
    cd backend && npm install
    cd ../frontend && npm install
    ```
3.  **Päivitä tietokanta (jos muutoksia):**
    ```bash
    cd backend
    npx prisma generate # Päivitä Prisma Client
    npx prisma migrate dev # Aja uudet migraatiot
    ```
    *   Jos kohtaat Prisma-virheitä: `rm -rf node_modules/.prisma`, `npm install`, `npx prisma generate`.
    *   Jos tietokanta on epäsynkassa: `npx prisma migrate reset --force` (Nollaa tietokannan! Vain kehityksessä).
4.  **Käynnistä sovellus uudelleen:**
    *   Sammuta vanhat `npm run dev` -prosessit.
    *   Käynnistä backend: `cd backend && npm run dev`
    *   Käynnistä frontend: `cd frontend && npm run dev`

## Health Monitoring

Järjestelmä sisältää kattavat terveystarkistuspäätepisteet:

*   `GET /api/health` - Täysi järjestelmän terveys ja metriikat
*   `GET /api/health/live` - Kubernetes liveness probe
*   `GET /api/health/ready` - Readiness probe tietokantayhteyden tarkistuksella

Monitorointi sisältää:
*   Tietokantayhteyden tila
*   Muistinkäyttö ja järjestelmäresurssit
*   Ympäristötiedot
*   Palvelimen uptime

## Teknologiapino

Järjestelmä koostuu erillisistä frontend- ja backend-sovelluksista.

### Frontend (Käyttöliittymä)

*   **Framework:** [React](https://react.dev/) (v18+)
*   **Käyttöliittymäkirjasto:** [Shadcn/UI](https://ui.shadcn.com/) (Rakentuu [Radix UI](https://www.radix-ui.com/) primitiivien ja [Tailwind CSS](https://tailwindcss.com/) -tyylien päälle)
*   **Tilan Hallinta:**
    *   Globaali tila: React Context API (esim. `AuthProvider` autentikoinnin hallintaan)
    *   Palvelimen tilan hallinta: [TanStack Query (React Query)](https://tanstack.com/query/latest) (datan nouto, välimuistitus, taustapäivitykset)
        - Kaikki API-kutsut keskitetty custom hookeiksi
        - Automaattinen request deduplication
        - Optimistinen päivitys mutaatioissa
        - Roolipohjainen pääsynhallinta hook-tasolla
*   **Reititys:** [React Router](https://reactrouter.com/) (v6+)
*   **Tyylit:** [Tailwind CSS](https://tailwindcss.com/)
*   **API-kommunikaatio:** [Axios](https://axios-http.com/)
*   **Reaaliaikainen Kommunikaatio:** [Socket.IO Client](https://socket.io/docs/v4/client-api/)
*   **Autentikointi (Client):** [MSAL React (@azure/msal-react)](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react) Azure AD -integraatioon.
*   **Build-työkalu:** [Vite](https://vitejs.dev/)
*   **Ikonit:** [Lucide React](https://lucide.dev/)
*   **Ilmoitukset (UI):** [React Hot Toast](https://react-hot-toast.com/)
*   **Visualisointi:** [Recharts](https://recharts.org/) - Käytetään AI Analytics -komponentissa luomaan interaktiivisia kaavioita ja visualisointeja.

### Backend (Palvelinpuoli)

*   **Ajonaikainen Ympäristö:** [Node.js](https://nodejs.org/) (v18+)
*   **Framework:** [Express.js](https://expressjs.com/)
*   **Kieli:** [TypeScript](https://www.typescriptlang.org/)
*   **Tietokannan ORM:** [Prisma](https://www.prisma.io/)
*   **Tietokanta:** [PostgreSQL 16](https://www.postgresql.org/) (Docker-kontti kehityksessä, portti 5434)
    *   Strategiset composite-indeksit suorituskyvyn optimointiin
    *   Tikettien suodatus statuksen ja prioriteetin mukaan
    *   Käyttäjäkohtaiset kyselyt ja kategoriasuodatukset
    *   AI-analytiikan ja ilmoitusten optimointi
*   **Tekoälyintegraatio:**
    *   [LangChain.js](https://js.langchain.com/): Framework AI-agenttien ja promptien hallintaan.
    *   OpenAI API: Yhteys OpenAI:n kielimalleihin.
*   **Reaaliaikainen Kommunikaatio:** [Socket.IO](https://socket.io/)
*   **Autentikointi (Server):**
    *   JWT-tokenien validointi (tukee sekä Azure AD RS256 että local HS256)
    *   [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) ja [jwks-rsa](https://github.com/auth0/node-jwks-rsa) kirjastot
    *   Developer-tilien helpotukset kehityskäyttöön
*   **Tiedostojen Lataus:** [Multer](https://github.com/expressjs/multer)
*   **AI Analytics:** Sisältää tekoälyavustajan käytön tilastointiin ja analysointiin tarkoitetut palvelut, reitit ja kontrollerit (`aiAnalyticsController.ts`, `aiAnalyticsRoutes.ts`).
*   **AI Keskusteluhistoria:** Tukihenkilöavustajan keskusteluhistorian tallentaminen ja hakeminen tietokannasta (`SupportAssistantConversation`-malli ja vastaavat päätepisteet).
*   **Virheenkäsittely:** Keskitetty virheenkäsittely custom error-luokilla (`errorHandler.ts`)
*   **Logging:** [Winston](https://github.com/winstonjs/winston) strukturoitu lokitus
*   **Request Tracking:** UUID-pohjainen pyyntöjen seuranta (`requestId.ts`)
*   **API Response Standardization:** Yhtenäiset API-vastaukset (`apiResponse.ts`)
*   **Environment Validation:** [Zod](https://github.com/colinhacks/zod) ympäristömuuttujien validointi (`config/env.ts`)
*   **Rate Limiting:** [express-rate-limit](https://github.com/nfriedly/express-rate-limit) (200 req/min yleinen, 5 req/15min auth)
*   **Security:** [Helmet](https://helmetjs.github.io/) security headers

## Hakemistorakenne

Projektin päärakenne:

```plaintext
.
├── .cursor/           # Cursor-editorin asetukset
│   └── rules/
├── backend/           # Backend-sovellus (Node.js, Express, Prisma)
│   ├── .env           # Ympäristömuuttujat (ei versionhallinnassa)
│   ├── docker-compose.yml # Docker-määrittelyt tietokannalle ja backendille
│   ├── Dockerfile     # Dockerfile backend-kontin rakentamiseen
│   ├── package.json   # Backendin riippuvuudet ja skriptit
│   ├── prisma/        # Prisma ORM -konfiguraatio
│   │   ├── migrations/  # Tietokannan migraatiotiedostot
│   │   ├── schema.prisma # Tietokannan skeeman määrittely
│   │   └── seed.ts      # Testidatan luontiskripti
│   ├── scripts/       # Kehitystyökalut
│   │   └── generateTestToken.js # JWT token generaattori testaukseen
│   ├── src/           # Backendin lähdekoodi
│   │   ├── ai/          # Tekoälyyn liittyvä logiikka
│   │   │   ├── agents/    # AI-agenttien toteutukset (esim. TicketGenerator, ChatAgent)
│   │   │   ├── config.ts  # AI-konfiguraatio (esim. mallinimet)
│   │   │   └── prompts/   # Prompt-mallipohjat AI-agenteille
│   │   ├── app.ts       # Express-sovelluksen alustus ja middlewaret
│   │   ├── config/      # Konfiguraatiot
│   │   │   └── env.ts     # Zod-pohjainen ympäristömuuttujien validointi
│   │   ├── controllers/ # Request/Response-logiikka (API-endpointien käsittelijät)
│   │   ├── index.ts     # Backend-sovelluksen käynnistyspiste
│   │   ├── lib/         # Jaetut kirjastot
│   │   │   └── prisma.ts  # Prisma client singleton
│   │   ├── middleware/  # Express-middlewaret
│   │   │   ├── authMiddleware.ts  # JWT-autentikointi
│   │   │   ├── errorHandler.ts    # Keskitetty virheenkäsittely
│   │   │   ├── requestId.ts       # Request ID tracking
│   │   │   └── ...                # Muut middlewaret
│   │   ├── routes/      # API-reitityksen määrittelyt
│   │   │   ├── healthRoutes.ts    # Health check endpoints
│   │   │   └── ...                # Muut reitit
│   │   ├── services/    # Sovelluksen ydinlogiikka (esim. ticketService, socketService)
│   │   ├── types/       # TypeScript-tyyppimäärittelyt
│   │   └── utils/       # Apufunktiot
│   │       ├── apiResponse.ts     # API vastausten standardointi
│   │       └── logger.ts          # Winston logger
│   └── tsconfig.json  # TypeScript-kääntäjän asetukset
├── docs/              # Vanha dokumentaatiohakemisto
│   ├── ai-agents/     # Vanhat AI-agenttidokumentit
│   ├── ai-docs-1.md
│   ├── CHANGELOG.md
│   ├── docs.md        # Vanha päädokumentti (Tämä toimi tyylioppaana)
│   └── TODO.md
├── frontend/          # Frontend-sovellus (React, Vite)
│   ├── .env           # Ympäristömuuttujat (ei versionhallinnassa)
│   ├── index.html     # HTML-pääsivu
│   ├── package.json   # Frontendin riippuvuudet ja skriptit
│   ├── postcss.config.cjs # PostCSS-asetukset (Tailwind)
│   ├── src/
│   │   ├── App.jsx      # Pääsovelluskomponentti, reitityksen määrittely
│   │   ├── components/  # Uudelleenkäytettävät UI-komponentit
│   │   │   ├── Admin/     # Admin-näkymien komponentit
│   │   │   ├── auth/      # Autentikointiin liittyvät komponentit
│   │   │   ├── Comments/  # Kommentointiin liittyvät komponentit
│   │   │   ├── Layout/    # Sivupohja (sidebar, header)
│   │   │   ├── Notifications/ # Ilmoituksiin liittyvät komponentit
│   │   │   ├── Tickets/   # Tiketteihin liittyvät komponentit
│   │   │   ├── ui/        # Yleiset UI-elementit (Shadcn/UI pohjaiset)
│   │   │   └── User/      # Käyttäjäprofiiliin liittyvät komponentit
│   │   ├── config/      # Frontend-konfiguraatiot
│   │   │   └── msal.js    # MSAL-kirjaston konfigurointi
│   │   ├── hooks/       # Custom React hookit (esim. useSocket)
│   │   ├── index.css    # Globaalit CSS-tyylit (Tailwind base)
│   │   ├── lib/         # Yleiskäyttöiset apufunktiot (Shadcn/UI:n luoma)
│   │   ├── main.jsx     # Sovelluksen käynnistyspiste React DOM:iin
│   │   ├── pages/       # Sivukohtaiset pääkomponentit (näkymät)
│   │   ├── providers/   # React Context Providerit (esim. AuthProvider)
│   │   ├── services/    # API-palvelukutsut (esim. authService)
│   │   ├── styles/      # Muut tyylitiedostot (jos tarpeen)
│   │   └── utils/       # Yleiset apufunktiot (esim. api-konfiguraatio)
│   ├── tailwind.config.cjs # Tailwind CSS -asetukset
│   └── vite.config.js   # Vite build-työkalun asetukset
├── new_docs/          # Uusi, ajantasainen dokumentaatiohakemisto
│   ├── ai-features.md
│   ├── api-endpoints.md
│   ├── architecture.md  (Tämä tiedosto)
│   ├── backend.md
│   ├── changelog.md
│   ├── datamodel.md
│   ├── description.md
│   ├── frontend.md
│   ├── learnings.md
│   └── todo.md
└── README.md          # Projektin pää-README
``` 