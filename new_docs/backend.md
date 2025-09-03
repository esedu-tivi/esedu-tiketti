# Backend-sovellus (Node.js / Express)

Tämä dokumentti kuvaa tikettijärjestelmän backend-sovelluksen arkkitehtuurin, käytetyt teknologiat, API-rakenteen, projektin hakemistorakenteen, Docker-käytön, tietokannan hallinnan, tuotantoon viennin, vianetsinnän, token-seurannan ja muut keskeiset backend-toiminnallisuudet.

## Docker-konttien Käyttö (Backend & DB)

Järjestelmän PostgreSQL-tietokanta ajetaan tyypillisesti Docker-kontissa (`esedu-tiketti-db`), jota hallitaan `docker-compose.yml`-tiedostolla `backend`-kansiossa. Backend-sovellus voidaan ajaa joko:

1.  **Suoraan host-koneella (yleisin kehitystapa):** `npm run dev` käynnistää backendin paikallisesti, ja se yhdistää Dockerissa ajettavaan tietokantaan.
2.  **Docker-kontissa (valinnainen):** `docker-compose up -d` käynnistää *sekä* tietokannan *että* backendin omissa konteissaan.

### Arkkitehtuuri (kun molemmat konteissa)
```plaintext
┌─────────────────────────┐      ┌─────────────────────────┐
│  Backend Container      │      │  PostgreSQL Container   │
│  (Node.js + Express)    │◄────►│  (esedu-tiketti-db)     │
│  (esedu-tiketti-backend)│      │                         │
│  Port: 3001 (exposed)   │      │  Port: 5432 (internal)  │
└─────────────────────────┘      └─────────────────────────┘
```

### Komentojen Selitykset (`cd backend` -kansiossa)

*   **`npm run dev` (Kehitys - Backend Hostissa, DB Dockerissa):**
    *   Käynnistää *vain* tietokantakontin (`esedu-tiketti-db`), jos se ei ole jo käynnissä (Docker Compose -logiikka `dev`-skriptissä).
    *   Ajaa migraatiot ja seedin.
    *   Käynnistää backend-palvelimen **host-koneella** nodemonilla (hot-reloading).
    *   Käynnistää Prisma Studion rinnakkain.
    *   Backend yhdistää tietokantaan osoitteessa `localhost:5434` (portti mapattu `docker-compose.yml`:ssä).
*   **`npm run dev:server`:** Käynnistää vain kehityspalvelimen ilman muita palveluita.
*   **`npm run dev:studio`:** Käynnistää vain Prisma Studion.
*   **`docker-compose up -d` (Backend ja DB Dockerissa):**
    *   Käynnistää *molemmat* kontit: `esedu-tiketti-db` ja `esedu-tiketti-backend`.
    *   Ajaa automaattisesti tietokannan migraatiot (`prisma migrate deploy`) backend-kontissa.
    *   Backend kuuntelee osoitteessa `http://localhost:3001`.
*   **`docker-compose down`:** Sammuttaa Docker Compose -ympäristön (molemat kontit, jos ne olivat käynnissä).
*   **`docker-compose up --build -d`:** Rakentaa Docker-imaget uudelleen (tarpeen backend-koodimuutosten jälkeen, jos ajetaan kontissa) ja käynnistää kontit.
*   **`docker-compose logs -f [backend|postgres]`:** Seuraa joko backend- tai postgres-kontin lokeja.

### Huomioitavaa Docker-käytössä
*   **Ympäristömuuttujat (`backend/.env`):**
    *   Kopioi `.env.example` tiedosto `.env`:ksi ja muokkaa tarvittavat arvot.
    *   Kun ajat backendin **hostissa** (`npm run dev`), `DATABASE_URL` käyttää `localhost:5434`.
    *   Kun ajat backendin **kontissa** (`docker-compose up -d`), `DATABASE_URL` käyttää Docker-verkon sisäistä palvelunimeä, esim. `postgresql://admin:admin123@postgres:5432/esedu_tiketti_db?schema=public`.
    *   **JWT_SECRET** pitää olla vähintään 32 merkkiä pitkä.
    *   **OPENAI_API_KEY** on pakollinen AI-toimintojen käyttöön.
*   **Tiedostojen Pysyvyys:** Tietokanta tallennetaan Docker volumeen (`postgres_data`). Ladatut tiedostot (`uploads`-kansio) tulisi myös tallentaa pysyvästi (volume tai bind mount, tarkista `docker-compose.yml`).

## Tietokannan Hallinta (Prisma)

Prisma hoitaa tietokantaskeeman hallinnan ja migraatiot.

### Migraatiot (`backend/prisma/migrations`)
*   **Uuden migraation luonti (kehitys):** `npx prisma migrate dev --name muutoksen_nimi`
*   **Migraatioiden ajo (tuotanto/docker):** `npx prisma migrate deploy` (ajetaan automaattisesti Docker-käynnistyksessä ja `npm start` -skriptissä)
*   **Suorituskykyindeksit:** Uusimmat migraatiot sisältävät strategisia composite-indeksejä suorituskyvyn optimointiin:
    - Tikettien suodatus statuksen ja prioriteetin mukaan
    - Käsittelijäkohtaiset kyselyt
    - Kategoriasuodatukset
    - Päivämääräperusteiset haut ja järjestäminen
    - Ilmoitusten ja AI-analytiikan optimointi

### Prisma Studio (Kehitys)
Tarkastele ja muokkaa tietokantaa selaimessa:
```bash
cd backend
npm run dev:studio # Tai npx prisma studio
```
Studio käynnistyy osoitteeseen http://localhost:5555.

### Tietokannan Nollaus (Vain Kehitys)
```bash
cd backend
npm run db:reset
```
*   Tyhjentää tietokannan.
*   Ajaa kaikki migraatiot.
*   Ajaa seed-skriptin (`prisma/seed.ts`).

## Tuotantoon Vienti (Backend)

1.  **Build:** Käännä TypeScript JavaScriptiksi:
    ```bash
    cd backend
    npm run build
    ```
2.  **Käynnistys:** Käynnistä tuotantopalvelin:
    ```bash
    cd backend
    npm start
    ```
    *   Tämä komento ajaa automaattisesti `prisma generate` ja `prisma migrate deploy` ennen palvelimen käynnistämistä.
    *   Varmista, että tuotantoympäristön `.env`-tiedosto on oikein konfiguroitu (erityisesti `DATABASE_URL`, `JWT_SECRET`, `AZURE_AD_*` ja `ENVIRONMENT=production`).

## Syötteiden Validointi

Backend validoi API-kutsujen syötteet varmistaakseen datan eheyden ja turvallisuuden. Vaikka tarkka kirjasto ei ole tässä määritelty (`express-validator` tai `zod` ovat yleisiä vaihtoehtoja), validointi kattaa tyypillisesti:

*   **Merkkijonojen Pituudet:** Esim. `title` (5-100 merkkiä), `description` (10-2000 merkkiä).
*   **Pakolliset Kentät:** Varmistetaan, että vaaditut kentät (esim. `title`, `description`, `priority`, `categoryId`) ovat mukana.
*   **Tyyppitarkistukset:** Varmistetaan, että kentät ovat oikeaa tyyppiä (esim. `priority` on validi enum-arvo, `categoryId` on UUID).
*   **Enum-arvot:** Tarkistetaan, että annetut arvot kuuluvat sallittuihin enum-arvoihin (esim. `TicketStatus`, `Priority`, `ResponseFormat`).
*   **Tiedostokoot ja -tyypit:** `uploadMiddleware` (Multer) rajoittaa ladattavien tiedostojen kokoa ja tyyppiä.
*   **Sanitointi:** HTML-koodin ja potentiaalisesti vaarallisten merkkien poisto tai muuntaminen syötteistä.

Virheelliset syötteet hylätään, ja API palauttaa yleensä 400 Bad Request -vastauksen selkeällä virheilmoituksella JSON-muodossa:
```json
{
  "error": "Otsikon pitää olla vähintään 5 merkkiä"
}
```

## Token-käytön seuranta

Backend sisältää kattavan token-käytön seurantajärjestelmän AI-agenttien käytön analysointiin:

### TokenTrackingService (`services/tokenTrackingService.ts`)
- Seuraa kaikkien AI-agenttien token-käyttöä automaattisesti
- Laskee kustannukset OpenAI:n hinnoittelun mukaan
- Tukee uusimpia malleja: GPT-5, GPT-4.1, O4 ja legacy-malleja
- Tarjoaa kattavat analytiikkafunktiot:
  - `trackTokenUsage()` - Tallentaa jokaisen AI-kutsun token-käytön
  - `getTokenAnalytics()` - Hakee analytiikkadatan monipuolisilla suodattimilla
  - `getDailyTokenUsage()` - Päivittäinen käyttödata kaavioita varten
  - `getTopUsersByTokenUsage()` - Aktiivisimmat käyttäjät

### TokenTrackingCallbackHandler (`utils/tokenCallbackHandler.ts`)
- LangChain.js callback handler automaattiseen seurantaan
- Kerää token-tiedot kaikista AI-kutsuista ilman manuaalista koodia
- Tukee useita OpenAI response-formaatteja
- Seuraa myös vastausaikoja ja virheitä
- Integroituu saumattomasti kaikkiin AI-agentteihin

### Token Analytics API (`controllers/tokenAnalyticsController.ts`)
- `GET /ai/token-analytics` - Kattava analytiikka suodattimilla (päivämäärä, agentti, käyttäjä, tiketti)
- `GET /ai/token-analytics/daily?days=30` - Päivittäinen käyttödata valitulta ajanjaksolta
- `GET /ai/token-analytics/top-users?limit=10` - Top käyttäjät token-käytön mukaan
- `GET /ai/token-analytics/summary` - Kuukausittainen yhteenveto vertailuineen

### Tietokantamalli
`AITokenUsage`-taulu tallentaa jokaisen AI-kutsun tiedot:
- Agent- ja mallitiedot
- Prompt/completion/total tokenit
- Arvioitu kustannus USD:nä
- Linkitys tikettiin ja käyttäjään
- Vastausaika ja virheseuranta

## Vianetsintä (Backend)

*   **Docker-kontti ei käynnisty:** Tarkista Docker Desktopin tila, porttivaraukset (3001, 5434/5432), ja `docker-compose logs -f backend` tai `docker-compose logs -f postgres`.
*   **Prisma-virheet:**
    *   `Schema validation error`: Tarkista `prisma/schema.prisma`.
    *   `Database connection error`: Tarkista `DATABASE_URL` `.env`-tiedostossa ja tietokannan tila.
    *   `Migration errors`: Tarkista migraatiohistoria ja tietokannan tila. Kokeile `npx prisma migrate resolve --applied [migration_id]` tai kehityksessä `npm run db:reset`.
    *   `Prisma Client is not generated`: Aja `npx prisma generate`.
    *   **Huom:** Backend käyttää nyt keskitettyä Prisma client singletonia (`src/lib/prisma.ts`) hot-reload-ongelmien välttämiseksi.
*   **TypeScript-virheet:** Tarkista `tsconfig.json`, varmista että `npm install` on ajettu ja kokeile buildata: `npm run build`.
*   **Autentikointivirheet:** Varmista `JWT_SECRET` ja Azure AD -asetukset (`AZURE_AD_CLIENT_ID`, `AZURE_AD_TENANT_ID`) `.env`-tiedostossa. Tarkista `authMiddleware.ts`:n tokenin validointilogiikka.
*   **API-kutsut epäonnistuvat:** Tarkista backendin lokit (`npm run dev` tai `docker-compose logs -f backend`) tarkempien virheilmoitusten varalta.

## Teknologiapino ja Keskeiset Kirjastot

Backend on rakennettu Node.js-ympäristöön käyttäen seuraavia teknologioita ja kirjastoja:

*   **Ajonaikainen Ympäristö:** [Node.js](https://nodejs.org/) (v18+) - JavaScript-ajoympäristö palvelinpuolelle.
*   **Framework:** [Express.js](https://expressjs.com/) - Minimalistinen ja joustava Node.js-web-sovelluskehys API:en rakentamiseen.
*   **Kieli:** [TypeScript](https://www.typescriptlang.org/) - JavaScriptin tyypitetty ylijoukko, joka parantaa koodin luotettavuutta ja ylläpidettävyyttä.
*   **Tietokannan ORM (Object-Relational Mapper):** [Prisma](https://www.prisma.io/) - Moderni ORM PostgreSQL-tietokannan käsittelyyn, sisältää skeeman hallinnan, migraatiot ja tyyppiturvallisen tietokantaklientin.
*   **Tietokanta:** [PostgreSQL](https://www.postgresql.org/) - Tehokas ja avoimen lähdekoodin relaatiotietokanta.
*   **Autentikointi & Auktorisointi:**
    *   [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - Kirjasto JSON Web Token (JWT) -tokenien (Azure AD ID-token frontendistä) dekoodaukseen `authMiddleware`:ssa käyttäjätietojen saamiseksi.
    *   `requireRole` middleware - Tukee sekä yksittäistä roolia että roolien taulukkoa parametrina: `requireRole(UserRole.ADMIN)` tai `requireRole([UserRole.ADMIN, UserRole.SUPPORT])`
*   **Reaaliaikainen Kommunikaatio:** [Socket.IO](https://socket.io/) - Mahdollistaa reaaliaikaisen, kaksisuuntaisen ja tapahtumapohjaisen kommunikaation selaimen ja palvelimen välillä (esim. ilmoitukset).
*   **Tekoälyintegraatio:**
    *   [LangChain.js](https://js.langchain.com/) - Framework tekoälymalleihin perustuvien sovellusten kehittämiseen, käytetään AI-agenttien ja promptien hallintaan.
    *   OpenAI API Client (`openai` -kirjasto) - Kommunikointiin OpenAI:n kielimallien kanssa.
*   **Tiedostojen Lataus:** [Multer](https://github.com/expressjs/multer) - Middleware tiedostolatausten käsittelyyn multipart/form-data -muodossa.
*   **Ympäristömuuttujat:** `dotenv` - Kirjasto ympäristömuuttujien lataamiseen `.env`-tiedostosta `process.env`:hen.
*   **CORS:** `cors` - Express-middleware Cross-Origin Resource Sharingin mahdollistamiseksi (sallii frontendin kommunikoida backendin kanssa eri originista).
*   **Input Validaatio:** (Todennäköisesti jokin kirjasto kuten `express-validator` tai `zod`) - Varmistaa API-kutsujen mukana tulevan datan oikeellisuuden ja muodon.

## Hakemistorakenne (`backend/src`)

Backendin lähdekoodi on jaettu seuraaviin pääkansioihin:

```plaintext
src/
├── ai/              # Tekoälyyn liittyvä logiikka
│   ├── agents/        # AI-agenttien toteutukset (TicketGenerator, ChatAgent, SummarizerAgent)
│   ├── config.ts      # AI-konfiguraatio (esim. mallinimet, API-avaimet ympäristömuuttujista)
│   └── prompts/       # Prompt-mallipohjat AI-agenteille
├── app.ts           # Express-sovelluksen alustus, globaalit middlewaret (CORS, json-parser), reitityksen ja virheenkäsittelyn määrittely.
├── config/          # Yleiset konfiguraatiot
│   └── database.ts    # Prisma-clientin alustus ja exporttaus
├── controllers/     # API-endpointtien käsittelijäfunktiot. Vastaavat requesteista ja responseista.
│   ├── authController.ts
│   ├── ticketController.ts # Tikettien ja kommenttien CRUD ym.
│   ├── aiSettingsController.ts # AI-asetusten hallinta (mallit, vihjeet)
│   ├── tokenAnalyticsController.ts # Token-käytön analytiikka
│   ├── userController.ts
│   ├── notificationController.ts
│   ├── notificationSettingsController.ts
│   ├── categoryController.ts
│   └── aiController.ts
├── index.ts         # Sovelluksen pääkäynnistystiedosto. Alustaa HTTP-palvelimen ja Socket.IO:n.
├── middleware/      # Express-middlewaret
│   ├── authMiddleware.ts # Tarkistaa JWT-tokenin ja liittää käyttäjätiedot requestiin.
│   ├── roleMiddleware.ts # Tarkistaa käyttäjän roolin pääsynhallintaa varten.
│   ├── validationMiddleware.ts # Suorittaa input-validoinnin.
│   ├── checkRole.ts # (Todennäköisesti osa roleMiddlewarea tai sen apufunktio)
│   └── uploadMiddleware.ts # Multer-konfiguraatio tiedostolatauksille.
├── routes/          # API-reitityksen määrittelyt. Yhdistää URL-polut controllereihin ja middlewareihin.
│   ├── index.ts       # Kokoaa kaikki reitit yhteen
│   ├── authRoutes.ts
│   ├── ticketRoutes.ts
│   ├── userRoutes.ts
│   ├── notificationRoutes.ts
│   ├── notificationSettingsRoutes.ts
│   ├── categoryRoutes.ts
│   ├── aiRoutes.ts
│   └── aiAnalyticsRoutes.ts   # AI-analytiikan API-reitit
├── services/        # Sovelluksen ydinlogiikka ja tietokantainteraktiot.
│   ├── ticketService.ts # Tikettien CRUD-operaatiot ja muu logiikka. Vastaa myös kaikkien tikettiin liittyvien tietojen (liitteet, kommentit, ilmoitukset, AI-interaktiot, SupportAssistantConversation-tietueet) poistamisesta transaktiossa tiketöinnin poiston yhteydessä.
│   ├── aiSettingsService.ts # AI-asetusten hallinta cachen kanssa
│   ├── tokenTrackingService.ts # Token-käytön seuranta ja kustannuslaskenta
│   ├── socketService.ts # Socket.IO-tapahtumien hallinta ja lähetys.
│   └── ... (muut palvelut)
├── utils/           # Apuohjelmat ja työkalut
│   ├── tokenCallbackHandler.ts # LangChain callback handler token-seurantaan
│   └── ... (muut työkalut)
└── types/           # Jaetut TypeScript-tyyppimäärittelyt (esim. API-pyyntöjen ja vastausten tyypit).
```

## API Rakenne ja Toimintaperiaate

Backend tarjoaa RESTful API:n, jota frontend-sovellus käyttää datan hallintaan ja toimintojen suorittamiseen.

1.  **Requestin Vastaanotto:** Express-sovellus (`app.ts`) vastaanottaa HTTP-pyynnön.
2.  **Middlewaret:** Pyyntö kulkee määriteltyjen globaalien ja reittikohtaisten middlewarejen läpi:
    *   `cors`: Sallii pyynnön frontendistä.
    *   `express.json()`: Parsii JSON-muotoisen pyynnön bodyn.
    *   `authMiddleware`: (Suojatuilla reiteillä) Dekoodaa `Authorization`-headerissa olevan JWT-tokenin. Jos validi, liittää käyttäjätiedot (`req.user`).
    *   `roleMiddleware`: (Tarvittaessa) Varmistaa, että `req.user`-objektin rooli on riittävä reitin suorittamiseen.
    *   `uploadMiddleware`: (Tiedostolatausreiteillä) Käsittelee tiedostolatauksen Multerilla.
    *   `validationMiddleware`: (Tarvittaessa) Validoi pyynnön bodyn, parametrit tai query-parametrit.
3.  **Reititys:** `routes`-kansion määrittelyt ohjaavat pyynnön oikealle `controllers`-kansion funktiolle URL-polun ja HTTP-metodin perusteella.
4.  **Controller:** Vastaava controller-funktio ottaa pyynnön vastaan. Se voi sisältää liiketoimintalogiikkaa suoraan tai kutsua `services`-kansion funktioita (esim. `ticketService`, `socketService`).
5.  **Service:** Palvelufunktio (kuten `ticketService`) sisältää osan liiketoimintalogiikasta, erityisesti tiketteihin ja kommentteihin liittyen. Se käyttää Prisma-clientiä (`config/database.ts`) kommunikoidakseen tietokannan kanssa. Se voi myös kutsua muita palveluita (esim. `socketService`).
6.  **Tietokantaoperaatiot:** Prisma kääntää kutsut SQL-kyselyiksi ja suorittaa ne PostgreSQL-tietokannassa.
7.  **Vastaus:** Controller muotoilee vastauksen (yleensä JSON-muotoon) ja lähettää sen takaisin clientille käyttäen `res.status().json()` -metodia.
8.  **Virheenkäsittely:** Virhetilanteissa middleware, controller tai service heittää virheen. Globaali virheenkäsittely-middleware (`app.ts`:ssä määritelty) ottaa virheen kiinni ja lähettää standardoidun virhevastauksen clientille.

## Reaaliaikainen Kommunikaatio (Socket.IO)

*   **Alustus:** `index.ts` alustaa Socket.IO-palvelimen ja liittää sen HTTP-palvelimeen.
*   **Yhteyden Hallinta:** `socketService.ts` hoitaa uusien client-yhteyksien vastaanottamisen, käyttäjien autentikoinnin ja käyttäjäkohtaisten socket-yhteyksien tallentamisen.
*   **JWT-autentikointi:** Socket-yhteydet varmistetaan JWT-tokenilla handshake-vaiheessa
*   **Room-pohjainen reititys:** Käyttäjät liitetään user-specific roomiin (`user_${userId}`)
*   **Tapahtumien Lähetys:** Kun backendissä tapahtuu jotain relevanttia (esim. uusi kommentti, tiketin tila muuttuu), vastaava logiikka kutsuu `socketService`:ä lähettämään tapahtuman (`emit`) relevanteille käyttäjille. 
    - `emitTicketCreated()` - Lähettää uuden tiketin kaikille
    - `emitTicketUpdated()` - Lähettää tiketin päivityksen kaikille
    - `emitTicketStatusChanged()` - Lähettää statuksen muutoksen kaikille
    - `emitTicketDeleted()` - Lähettää poiston kaikille
    - `emitCommentAdded()` - Lähettää uuden kommentin tiketin seuraajille
*   **Frontend Kuuntelee:** Frontendin `useSocket`-hook kuuntelee näitä tapahtumia singleton-patternia käyttäen.

## AI Settings

AI Settings on keskitetty järjestelmä tekoälyagenttien käyttäytymisen hallintaan. Se korvaa ympäristömuuttujapohjaisen konfiguroinnin tietokantapohjaisella ratkaisulla.

### Tietokantamalli

`AISettings` - Singleton-patternia noudattava taulu, jossa on vain yksi rivi:
* `chatAgentVersion` - Käytettävä agenttiversio ("modern" tai "legacy")
* `hintSystemEnabled` - Vihjesysteemin tila (päällä/pois)
* `hintOnEarlyThreshold` - EARLY-tilojen määrä ennen vihjettä (oletus: 3)
* `hintOnProgressThreshold` - PROGRESSING-tilojen määrä ennen vihjettä (null = pois käytöstä)
* `hintOnCloseThreshold` - CLOSE-tilojen määrä ennen vihjettä (null = pois käytöstä)
* `hintCooldownTurns` - Vuorojen määrä vihjeiden välillä (oletus: 0 = ei cooldownia)
* `hintMaxPerConversation` - Maksimi vihjeiden määrä per keskustelu (oletus: 999 = rajaton)

### Service (aiSettingsService.ts)

`aiSettingsService.ts` tarjoaa välimuistitetun pääsyn AI-asetuksiin:
* 1 minuutin välimuisti suorituskyvyn optimoimiseksi
* Automaattinen oletusasetusten luonti jos asetuksia ei ole
* Helper-metodit: `useModernChatAgent()`, `isHintSystemEnabled()`

### Controller (aiSettingsController.ts)

`aiSettingsController.ts` tarjoaa REST API:n asetusten hallintaan:
* `getSettings` - Hakee nykyiset asetukset
* `updateSettings` - Päivittää asetukset (Zod-validointi)
* `resetSettings` - Palauttaa oletusasetukset

### API-reitit

Kaikki AI Settings -reitit löytyvät `/api/ai/settings` polun alta ja vaativat ADMIN-roolin:
* `GET /api/ai/settings` - Hakee nykyiset asetukset
* `PUT /api/ai/settings` - Päivittää asetukset
* `POST /api/ai/settings/reset` - Palauttaa oletusasetukset

## AI Analytics

AI Analytics on erillinen osa sovelluksen API:a, joka keskittyy tekoälyavustajan käytön ja tehokkuuden mittaamiseen ja analysointiin.

### Mallit ja tietokantataulut

AI-analytiikkatiedot tallennetaan seuraaviin tietokantatauluihin:

* `AIAssistantInteraction` - Tallentaa yksittäiset tekoälyavustajan käyttökerrat sisältäen käyttäjän kyselyn, AI:n vastauksen, vastausajan ja mahdollisen palautteen.
* `AIAssistantUsageStat` - Kokoaa päivittäiset yhteenvetotilastot (interaktioiden määrä, keskimääräinen vastausaika, keskimääräinen arvosana).
* `AIAssistantCategoryStat` - Tallentaa kategoriakohtaiset käyttötilastot.

### Reitit ja toiminnallisuus

Kaikki AI Analytics -reitit löytyvät `/api/ai-analytics` polun alta, ja niihin vaaditaan ADMIN- tai SUPPORT-rooli. Tärkeimmät reitit ovat:

* `GET /dashboard` - Hakee kootusti kaikki analytiikkatiedot yhdellä API-kutsulla.
* `GET /usage` - Hakee käyttötilastot ja -trendit.
* `GET /categories` - Hakee kategoriakohtaiset käyttötilastot.
* `GET /agents` - Hakee tukihenkilöiden käyttötilastot.
* `GET /agents/:agentId/details` - Hakee yksittäisen tukihenkilön yksityiskohtaiset tilastot.
* `GET /response-times` - Hakee vastausaikojen tilastot.
* `GET /resolution-times` - Hakee tikettien ratkaisuaikojen vertailutilastot.
* `POST /interactions` - Tallentaa uuden tekoälyinteraktion.
* `POST /interactions/:interactionId/feedback` - Tallentaa palautteen tekoälyinteraktiosta.

Tarkempi kuvaus näistä rajapinnoista löytyy dokumentista [`api-endpoints.md`](api-endpoints.md).

### Controller (aiAnalyticsController.ts)

`aiAnalyticsController.ts` sisältää useita metodeja eri analytiikkanäkymien tietojen hakemiseen ja käsittelyyn:

* `trackInteraction` - Tallentaa uuden interaktion ja päivittää tarvittavat tilastotaulut.
* `submitFeedback` - Tallentaa palautteen interaktiosta.
* `getUsageStats` - Hakee käyttötilastot.
* `getCategoryStats` - Hakee kategoriaja.
* `getAgentUsageStats` - Hakee tilastot tukihenkilöiden käytöstä.
* `getAgentDetails` - Hakee yksittäisen tukihenkilön yksityiskohtaiset käyttötilastot.
* `getResponseTimeStats` - Hakee vastausaikojen tilastot.
* `getResolutionTimeComparison` - Vertaa ratkaisuaikoja AI:n kanssa ja ilman.
* `getOverallStats` - Hakee yleiset käyttötilastot.
* `getDashboardData` - Hakee kaikki tilastot kerralla dashboard-näkymää varten.
* `getFeedbackByTicket` - Hakee kaikki tiettyyn tikettiin liittyvät vuorovaikutukset, joille on annettu palaute.

### AI-Avustajan Keskusteluhistorian Parannukset (`aiController.ts`)
*   **InteractionID:n Tallennus:** Kun AI-avustaja (`SupportAssistantAgent`) vastaa käyttäjälle, sen tuottaman vastauksen yhteydessä oleva yksilöllinen `interactionId` tallennetaan nyt osaksi keskusteluhistoriaa (`SupportAssistantConversation`-taulu). Tämä mahdollistaa myöhemmin yksittäisten viestien ja niihin liittyvän palautteen tarkemman seurannan ja kohdistamisen.


## Discord-integraatio

Discord-integraatio mahdollistaa tikettien luomisen ja hallinnan suoraan Discordista ilman erillisiä käyttäjätilejä.

### Discord Bot (`discord/bot.ts`)

*   **Alustus:** Bot alustuu automaattisesti backendin käynnistyessä jos `DISCORD_BOT_TOKEN` ja `DISCORD_CLIENT_ID` on määritelty
*   **Slash-komennot:** `/tiketti` - luo uuden tukipyynnön
*   **Käyttäjien esto:** Tarkistaa `isBlocked`-kentän ennen tikettikanavan luontia
*   **Tilan hallinta:** 
    - Pyörivä status näyttää tikettien määrät (Avoimia, Käsittelyssä, Yhteensä)
    - Vaihtoehtoinen status näyttää seuraavan siivouksen ajankohdan
    - Event-driven päivitykset ilman tietokantakyselyitä
    - Päivittää statuksen heti kun tikettejä luodaan/päivitetään/poistetaan
*   **Globaali pääsy:** Bot saatavilla `(global as any).discordBot` kautta
*   **Suorituskyky:** Ei toistuvia tietokantakyselyitä, täysin tapahtumapohjainen

### Tikettien luonti (`discord/ticketConversation.ts`)

*   **Keskustelupohjainen luonti:** Bot ohjaa käyttäjän läpi tiketin luomisen
*   **Yksityinen kanava:** Luo automaattisesti yksityisen kanavan tikettikeskustelulle
*   **Käyttäjähallinta:** Luo automaattisesti Discord-käyttäjän järjestelmään
*   **Peruutusmahdollisuus:** Käyttäjä voi peruuttaa tiketin luonnin milloin tahansa
*   **Estettyjen käyttäjien tarkistus:** Estää tikettien luonnin `isBlocked`-käyttäjiltä
*   **Suomenkielinen:** Kaikki viestit ja ohjeet ovat suomeksi

### Viestien synkronointi (`discord/messageSync.ts`)

*   **Kaksisuuntainen synkronointi:** 
    - Discord-viestit → Web-kommentit
    - Web-kommentit → Discord-embedit
*   **Tilan päivitykset:** Status-muutokset näkyvät molemmissa järjestelmissä
*   **Oikeuksien hallinta:**
    - OPEN/IN_PROGRESS: Käyttäjä voi lähettää viestejä
    - RESOLVED/CLOSED: Vain luku -oikeudet
*   **Liitetiedostot:** Kuvat ja videot synkronoituvat

### Kanavien siivous (`discord/channelCleanup.ts`)

*   **Automaattinen poisto:**
    - Suljetut tiketit: 24 tunnin jälkeen (konfiguroitavissa)
    - Passiiviset tiketit: 48 tunnin jälkeen (konfiguroitavissa)
    - Hylätyt kanavat: 1 tunnin jälkeen (ilman tikettejä)
*   **Tuntiajastin:** Siivous ajetaan kerran tunnissa samassa syklissä
*   **Hylättyjen kanavien tunnistus:** `cleanupOrphanedChannels()` poistaa kanavat ilman tikettejä
*   **Välitön poisto:** Kun tiketti poistetaan web-sovelluksesta
*   **Status-näyttö:** Bot näyttää seuraavan siivouksen ajankohdan

### Discord-asetukset (`discord/discordSettingsService.ts`)

*   **Asetusten hallinta:** Singleton-pattern Discord-asetusten tallennukseen
*   **Käyttäjähallinta:**
    - `getDiscordUsers()` - Listaa Discord-käyttäjät tilastoineen
    - `toggleBlockUser()` - Estää/poistaa eston käyttäjältä
    - `deleteDiscordUser()` - Poistaa käyttäjän ja vapaaehtoisesti tiketit
    - Poistaa Discord-kanavat käyttäjää poistettaessa
*   **Tilastot:** Kerää Discord-tikettien tilastoja (käyttäjät, tiketit, vasteajat)
*   **Välimuistitus:** Asetukset välimuistissa suorituskyvyn optimoimiseksi

### Integraatio tikettijärjestelmään

*   **ticketService.ts:** 
    - Kutsuu `discordBot.onTicketChanged()` kaikissa tikettioperaatioissa
    - Poistaa Discord-kanavan tiketin poiston yhteydessä
    - Luo aikajana-merkinnän Discord-sulkemisille
*   **ticketController.ts:**
    - Lähettää kommentit Discord-kanavalle
    - Päivittää Discord-botin statuksen tilan muutoksissa
    - Välittää WebSocket-päivitykset kaikille näkymille 