# Backend-sovellus (Node.js / Express)

Tämä dokumentti kuvaa tikettijärjestelmän backend-sovelluksen arkkitehtuurin, käytetyt teknologiat, API-rakenteen, projektin hakemistorakenteen, Docker-käytön, tietokannan hallinnan, tuotantoon viennin, vianetsinnän ja muut keskeiset backend-toiminnallisuudet.

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
    *   Backend yhdistää tietokantaan osoitteessa `localhost:5434` (portti mapattu `docker-compose.yml`:ssä).
*   **`docker-compose up -d` (Backend ja DB Dockerissa):**
    *   Käynnistää *molemmat* kontit: `esedu-tiketti-db` ja `esedu-tiketti-backend`.
    *   Ajaa automaattisesti tietokannan migraatiot (`prisma migrate deploy`) backend-kontissa.
    *   Backend kuuntelee osoitteessa `http://localhost:3001`.
*   **`docker-compose down`:** Sammuttaa Docker Compose -ympäristön (molemat kontit, jos ne olivat käynnissä).
*   **`docker-compose up --build -d`:** Rakentaa Docker-imaget uudelleen (tarpeen backend-koodimuutosten jälkeen, jos ajetaan kontissa) ja käynnistää kontit.
*   **`docker-compose logs -f [backend|postgres]`:** Seuraa joko backend- tai postgres-kontin lokeja.

### Huomioitavaa Docker-käytössä
*   **Ympäristömuuttujat (`backend/.env`):**
    *   Kun ajat backendin **hostissa** (`npm run dev`), `DATABASE_URL` käyttää `localhost:5434`.
    *   Kun ajat backendin **kontissa** (`docker-compose up -d`), `DATABASE_URL` käyttää Docker-verkon sisäistä palvelunimeä, esim. `postgresql://admin:admin123@postgres:5432/esedu_tiketti_db?schema=public`.
*   **Tiedostojen Pysyvyys:** Tietokanta tallennetaan Docker volumeen (`postgres_data`). Ladatut tiedostot (`uploads`-kansio) tulisi myös tallentaa pysyvästi (volume tai bind mount, tarkista `docker-compose.yml`).

## Tietokannan Hallinta (Prisma)

Prisma hoitaa tietokantaskeeman hallinnan ja migraatiot.

### Migraatiot (`backend/prisma/migrations`)
*   **Uuden migraation luonti (kehitys):** `npx prisma migrate dev --name muutoksen_nimi`
*   **Migraatioiden ajo (tuotanto/docker):** `npx prisma migrate deploy` (ajetaan automaattisesti Docker-käynnistyksessä ja `npm start` -skriptissä)

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

## Vianetsintä (Backend)

*   **Docker-kontti ei käynnisty:** Tarkista Docker Desktopin tila, porttivaraukset (3001, 5434/5432), ja `docker-compose logs -f backend` tai `docker-compose logs -f postgres`.
*   **Prisma-virheet:**
    *   `Schema validation error`: Tarkista `prisma/schema.prisma`.
    *   `Database connection error`: Tarkista `DATABASE_URL` `.env`-tiedostossa ja tietokannan tila.
    *   `Migration errors`: Tarkista migraatiohistoria ja tietokannan tila. Kokeile `npx prisma migrate resolve --applied [migration_id]` tai kehityksessä `npm run db:reset`.
    *   `Prisma Client is not generated`: Aja `npx prisma generate`.
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

│   ├── ticketService.ts # Tikettien CRUD-operaatiot ja muu logiikka.
│   ├── socketService.ts # Socket.IO-tapahtumien hallinta ja lähetys.
│   └── ... (muut palvelut)
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
*   **Tapahtumien Lähetys:** Kun backendissä tapahtuu jotain relevanttia (esim. uusi kommentti, tiketin tila muuttuu), vastaava logiikka (todennäköisesti `ticketController`issa tai `ticketService`ssä) kutsuu `socketService`:ä lähettämään tapahtuman (`emit`) relevanteille käyttäjille. Esimerkiksi `socketService.emitToUser(userId, 'new_notification', notificationData)`.
*   **Frontend Kuuntelee:** Frontendin `useSocket`-hook kuuntelee näitä tapahtumia (`socket.on('new_notification', ...)`).

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