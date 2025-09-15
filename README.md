# <p align='center'>Esedu-tiketti</p>

## 🎓 Yleiskatsaus

Esedu Tikettijärjestelmä on moderni helpdesk-sovellus, joka on suunniteltu ensisijaisesti **opetuskäyttöön** Etelä-Savon ammattiopiston IT-tuen opiskelijoille. Järjestelmä mahdollistaa opiskelijoiden IT-tukipyyntöjen tehokkaan käsittelyn ja tukihenkilöiden koulutuksen aidon tuntuisissa asiakaspalvelutilanteissa, hyödyntäen tekoälypohjaisia simulaatioita.

Erityispiirteenä järjestelmä sisältää edistyneitä tekoälyominaisuuksia, jotka helpottavat tukipyyntöjen käsittelyä ja mahdollistavat interaktiiviset harjoitusskenaariot ilman oikeiden käyttäjien tarvetta.

## 🚀 Ominaisuudet

### Käyttäjät
- Azure AD -kirjautuminen ja SSO
- Tikettien luonti ja seuranta
- Oman tiketin tilan seuranta
- Tikettien kommentointi
- @-maininta kommenteissa
- Reaaliaikaiset ilmoitukset
- Mukautettavat ilmoitusasetukset
- Profiilisivu ja asetukset
- Vastausmuodon valinta tiketille (TEKSTI, KUVA, VIDEO)
- Tiedostojen liittäminen tiketteihin (kuvat, videot, muut tiedostot)
- Discord-integraatio tikettien luontiin ilman erillistä käyttäjätiliä

### IT-tuki ja hallinta
- Kolmiportainen käyttäjähallinta (Opiskelija → Tukihenkilö → Admin)
- Tikettien priorisointi ja delegointi
- Käyttäjien hallinta ja roolien määritys
- Tikettien suodatus ja haku
- Tiketin käsittelyajan seuranta
- Tiketin siirto toiselle tukihenkilölle
- Automaattiset tilamuutosviestit
- Mediakommentit tukipyynnöissä (kuvat ja videot)
- Tiedostonlataus ja -käsittelytoiminnot
- Tikettiliitteiden hallinnointi ja tarkastelu
- Joustavampi mediakommentointi: kaikki tukihenkilöt voivat liittää kuvia ja videoita tiketteihin riippumatta siitä, onko tiketti heille osoitettu
- **Tikettien massapoisto** (Admin-ominaisuus):
  - Valitse useita tikettejä kerralla
  - Poista jopa 100 tikettiä yhdellä toiminnolla
  - Vahvistus-dialogi ennen poistoa
  - WebSocket-päivitykset muille käyttäjille

### Raportit ja analytiikka
- **Työraporttien generointi** tukihenkilöille
  - Suodatettavat raportit (aikajakso, kategoria, prioriteetti)
  - Tilastot: ratkaistut, suljetut ja käsittelyssä olevat tiketit
  - Keskimääräiset ratkaisuajat
  - Kategorioiden ja prioriteettien jakaumat
- **Vientimuodot** ESEDU Ossi-oppimisympäristöön
  - PDF: Virallinen raportti allekirjoitusta varten
  - CSV: Excel-yhteensopiva taulukkomuoto
  - JSON: Strukturoitu data integraatioita varten
- Raporttien tallennus myöhempää käyttöä varten
- Käsittelyaikojen automaattinen seuranta

### Tekoälyominaisuudet

#### Token-seuranta ja kustannusten hallinta
- Automaattinen token-käytön seuranta kaikille AI-agenteille
- Reaaliaikainen kustannuslaskenta OpenAI:n hinnoittelun mukaan
- Kattava analytiikkanäkymä:
  - Päivittäiset, viikottaiset ja kuukausittaiset trendit
  - Agenttikohtaiset tilastot ja syväanalyysi
  - Käyttäjäkohtainen seuranta
  - Virheanalyysi ja vastausaikajakaumat
  - Interaktiiviset kaaviot ja visualisoinnit

#### Mallivalinta ja konfigurointi
- Erillinen OpenAI-mallin valinta jokaiselle AI-agentille
- Tuetut mallit: GPT-5, GPT-4.1, O4 ja legacy-mallit
- Helppokäyttöinen dropdown-valinta AI-asetuksissa
- Mahdollisuus optimoida kustannuksia ja suorituskykyä

### Tekoälyagentit
- Realististen harjoitustikettien generointi tekoälyn avulla
  - Parametrisoitu tikettien luonti (vaikeustaso, kategoria, käyttäjäprofiili)
  - Esikatselumahdollisuus ennen tallennusta
  - Tuottaa erilaisia tikettityyppejä ja ongelmaskenaarioita koulutuskäyttöön
  - Mahdollisuus generoida useita tikettejä kerralla (bulk-generointi)
  - Mukautettu käyttäjäprofiilin mukainen kielenkäyttö ja tekninen tarkkuus

- ChatAgent: tekoälyagentti, joka simuloi käyttäjän vastauksia tikettikeskusteluissa
  - Automaattinen aktivointi kun tukihenkilö vastaa AI-generoituun tikettiin
  - Edistymisen arviointi: agentti tunnistaa, kuinka lähellä tukihenkilö on oikeaa ratkaisua
  - Realistinen vuorovaikutus eri teknisen osaamisen tasoilla (vähäinen, keskitasoinen, hyvä)
  - Emotionaalinen ilmaisu (turhautuminen, kiinnostus, helpotus) tilanteen mukaan
  - Joustava keskusteluliikenteen tunnistaminen
  - Kirjoitusindikaattori, joka näyttää milloin AI generoi vastausta

- SummarizerAgent: tekoälyagentti, joka luo yhteenvetoja tikettikeskusteluista
  - Tiivistää pitkän tikettikeskustelun keskeisimmät kohdat
  - Käytettävissä sekä tavallisiin että AI-generoituihin tiketteihin
  - Tallennetut yhteenvedot näkyvät tiketin tiedoissa

- SupportAssistantAgent: tukihenkilöiden tekoälyavustaja
  - Tarjoaa kontekstisidonnaista apua tikettien ratkaisuun
  - Hyödyntää tiketin tietoja ja keskusteluhistoriaa
  - Hakee relevantteja tietämysartikkeleita tiketin kontekstista
  - Interaktiivinen chat-käyttöliittymä
  - Tarjoaa ratkaisuehdotuksia ja vianmääritysohjeita

- Tikettien analyysi ja analytiikka
  - Admin-näkymä AI-generoitujen tikettien tarkasteluun
  - Keskustelujen edistymisen visualisointi (EARLY, PROGRESSING, CLOSE, SOLVED)
  - AI-ratkaisujen tarkastelu erillisessä ikkunassa
  - Suodatus-, lajittelu- ja sivutusominaisuudet
  - Yhteenvetotilastoja tikettien käsittelystä
  - AI-avustajan käytön ja tehokkuuden analysointi
  - Kategoria- ja käyttäjäkohtaiset tilastot
  - Ratkaisuaikojen vertailu

- AI Tools -käyttöliittymä tekoälyominaisuuksien hallintaan
  - Tikettien generointi halutuilla parametreilla
  - Interaktiivinen demo tukihenkilöassistentista
  - Edistyneet debug-työkalut tekoälyn toiminnan seuraamiseen
  - AI-avustajan analytiikkanäkymä
  - AI-asetukset: mallivalinta jokaiselle agentille erikseen
  - Token-seuranta: reaaliaikainen token-käytön ja kustannusten analytiikka


### Liitetiedostot ja median käsittely
- Liitetiedostojen lisääminen tiketteihin niiden luontivaiheessa (max 5 tiedostoa)
- Tuki eri tiedostotyypeille (kuvat, videot, dokumentit jne.)
- Kuvien esikatselunäkymä suoraan tikettinäkymässä
- Lightbox-toiminto kuvien suurempaan tarkasteluun
- Median responsiivinen esittäminen eri laitteilla
- Tiedostojen turvallinen käsittely backend-puolella
- Johdonmukainen liitetiedostojen näyttö sekä yksittäisen tiketin näkymässä että tiketin tietomodalissa

### Mediavastaukset
- Kolme vastausmuotoa: TEKSTI, KUVA ja VIDEO
- Kuva- ja videovastausten lähetys
- Mediasisällön näyttäminen kommenteissa
- Tiedostojen validointi ja turvallinen käsittely
- Mediakommenttien merkintä aikajanoilla
- Responsiivinen median näyttö eri laitteilla
- Tuki yleisimmille mediatiedostomuodoille (jpg, png, gif, mp4, webm)

### Discord-integraatio
- Tikettien luonti Discord-komennolla `/tiketti`
- Yksityinen kanava jokaiselle tukipyynnölle
- Kaksisuuntainen viestien synkronointi (Discord ↔ Web)
- Automaattinen Discord-käyttäjien luonti järjestelmään
- Kanavien automaattinen siivous suljetuille tiketeille
- Discord-käyttäjien hallinta admin-paneelissa
- Käyttäjien esto/esto poisto -toiminnallisuus
- Tikettien luonnin peruutusmahdollisuus
- Hylättyjen kanavien automaattinen poisto
- Botin statuksen reaaliaikaiset päivitykset
- Integraation käynnistys/sammutus hallintapaneelista

### Ilmoitusjärjestelmä
- Reaaliaikaiset WebSocket-ilmoitukset
- Mukautettavat ilmoitusasetukset
- Ilmoitukset eri tapahtumista:
  - Tiketin osoitus käsittelijälle
  - Uusi kommentti tiketissä
  - Tiketin tilan muutos
  - Tiketin prioriteetin muutos
  - @-maininta kommentissa
  - Deadline lähestyy (tulossa)
- Ilmoitusten hallintapaneeli
- Ilmoitusten merkitseminen luetuiksi
- Ilmoitusten poistaminen

## 🛠️ Teknologiat

### Frontend
- React + Vite
- TailwindCSS
- React Query
- Microsoft Authentication Library (MSAL)
- Socket.IO Client
- React Hot Toast
- Recharts (analytiikkakaaviot)

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- Azure AD integraatio
- Socket.IO
- Zod validointi
- Multer (tiedostojen käsittely)
- Docker-kontitus (kehitys- ja tuotantoympäristöt)
- LangChain.js (tekoälyintegraatiot)
- OpenAI API
- Token tracking callbacks (automaattinen seuranta)
- Discord.js (Discord-bot integraatio)

### Tietokanta
- PostgreSQL
  - Tiketit ja kommentit
  - Käyttäjät ja roolit (mukaan lukien Discord-käyttäjät)
  - Kategoriat
  - Ilmoitukset ja asetukset
  - Media ja liitetiedostot
  - Tekoälyasetukset ja -vastaukset
  - Token-käytön seurantatiedot (AITokenUsage)
  - AI-mallien konfiguraatio (AISettings)
  - Discord-integraation asetukset (DiscordSettings)
  - Discord-kanavien ja tikettien yhdistäminen
  - Työraporttien data (StudentReport)

## 📱 Käyttöliittymä
- Responsiivinen design
- Moderni ja selkeä ulkoasu
- Dynaaminen roolipohjainen navigaatio
- Reaaliaikainen tilojen päivitys
- Käyttäjäystävälliset ilmoitukset
- Selkeä profiilisivu
- Mukautettavat ilmoitusasetukset
- Mediakomponentit kuva- ja videosisällölle
- AI Tools -hallintanäkymä tekoälyominaisuuksille
- Discord-asetukset -hallintapaneeli integraation konfigurointiin

## 📚 Dokumentaatio
Projektin tarkempi dokumentaatio löytyy `new_docs`-kansiosta:

- **Yleiskatsaus & Arkkitehtuuri:**
  - [`new_docs/description.md`](./new_docs/description.md): Projektin yleiskuvaus.
  - [`new_docs/architecture.md`](./new_docs/architecture.md): Tekninen arkkitehtuuri, pystytys, roolit, päivitys.
- **Toteutus:**
  - [`new_docs/backend.md`](./new_docs/backend.md): Backendin tarkemmat tiedot.
  - [`new_docs/frontend.md`](./new_docs/frontend.md): Frontendin tarkemmat tiedot.
  - [`new_docs/datamodel.md`](./new_docs/datamodel.md): Tietokannan rakenne (Prisma).
  - [`new_docs/api-endpoints.md`](./new_docs/api-endpoints.md): REST API -rajapinnan kuvaus.
  - [`new_docs/ticket-workflow.md`](./new_docs/ticket-workflow.md): Tikettien käsittelyprosessi.
- **Tekoäly:**
  - [`new_docs/ai-features.md`](./new_docs/ai-features.md): Tekoälyominaisuuksien yleiskatsaus.
  - [`new_docs/ai-agents/index.md`](./new_docs/ai-agents/index.md): Tekoälyagenttien yleiskuvaus ja flowchartit.
  - (`new_docs/ai-agents/` -kansion muut tiedostot agenttikohtaisesti)
- **Discord-integraatio:**
  - [`new_docs/discord-integration.md`](./new_docs/discord-integration.md): Discord-botin ja integraation dokumentaatio.
- **Muut:**
  - [`new_docs/changelog.md`](./new_docs/changelog.md): Muutosloki.
  - [`new_docs/todo.md`](./new_docs/todo.md): Tehtävälista.
  - [`new_docs/learnings.md`](./new_docs/learnings.md): Projektin opit.

## 🔒 Tietoturva
- Azure AD autentikointi
- Roolipohjainen pääsynhallinta (RBAC)
- Suojatut API-endpointit
- Turvallinen istunnonhallinta
- WebSocket-yhteyden autentikointi
- Syötteiden validointi ja sanitointi
- Tiedostojen tyyppi- ja kokovalidaatio

---
Kehitetty Etelä-Savon ammattiopiston IT-tuen opiskelijoiden tarpeisiin.
