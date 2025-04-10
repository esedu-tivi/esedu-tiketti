# Tehtävälista

## Tietokanta ja autentikointi
- [x] PostgreSQL-tietokannan asennus ja konfigurointi
- [x] Tietokantamallin luominen (users, tickets, comments)
- [x] Tietokantayhteyden konfigurointi
- [x] Migraatioiden luominen
- [x] Kategorioiden hallinta
  - [x] Kategoriamallin luonti
  - [x] Kategorioiden CRUD-operaatiot
- [x] MSA autentikoinnin integrointi
  - [x] Azure AD konfigurointi
  - [x] Token validointi backendissä
  - [x] Autentikoinnin integrointi frontendiin
  - [x] Käyttäjän luonti/synkronointi ensimmäisellä kirjautumisella
- [x] Käyttäjäroolien hallinta (users, support, admin)
  - [x] Roolipohjainen pääsynhallinta (RBAC)
  - [x] Käyttöliittymän mukauttaminen roolin mukaan
  - [x] Tukihenkilö-roolin toiminnallisuus
  - [x] Admin-käyttäjien hallintapaneeli
  - [x] Käyttäjien hakutoiminto hallintapaneelissa
  - [x] Käyttäjien ryhmätietojen (jobTitle) näyttäminen badgeina hallintapaneelissa ja profiilisivulla

## Frontend
### Tikettinäkymät
- [x] Tiketin luontilomake
  - [x] Perustiedot (otsikko, kuvaus)
  - [x] Laitetiedot ja lisätiedot
  - [x] Kategorian valinta
  - [x] Prioriteetin valinta (LOW, MEDIUM, HIGH, CRITICAL)
  - [x] Validointi
  - [x] Virheilmoitukset
- [x] Tikettien listausnäkymä
  - [x] Omat tiketit -näkymä
  - [x] Hallintapaneelin tikettinäkymä
  - [x] Suodatus kategorian mukaan
  - [x] Suodatus tilan mukaan
  - [x] Suodatus prioriteetin mukaan
  - [x] Järjestäminen
  - [ ] Hakutoiminto
- [x] Tiketin yksityiskohtanäkymä
  - [x] Perustiedot
  - [x] Tilan muuttaminen
  - [x] Vastuuhenkilön asettaminen
  - [x] Kategorian muuttaminen

### Kommentit
- [x] Kommenttien käyttöliittymä
  - [x] Listaus tiketissä
  - [x] Lisäys
  - [x] @-maininta toiminnallisuus
  - [x] Automaattinen käyttäjien ehdotus
  - [ ] Muokkaus (vain omat kommentit)
  - [ ] Poisto (vain omat kommentit)

### Ilmoitusjärjestelmä
- [x] Reaaliaikaiset ilmoitukset
  - [x] WebSocket-integraatio
  - [x] Ilmoitusten hallintapaneeli
  - [x] Ilmoitusten merkitseminen luetuiksi
  - [x] Ilmoitusten poistaminen
- [x] Ilmoitusasetukset
  - [x] Selainilmoitukset
  - [x] Mukautettavat ilmoitustyypit
  - [ ] Sähköposti-ilmoitukset
- [x] Profiilisivu
  - [x] Käyttäjän perustiedot
  - [x] Ilmoitusasetusten hallinta

### UI/UX
- [x] Käyttöliittymän peruskomponentit
  - [x] Shadcn/ui komponenttikirjasto
  - [x] Select-komponentti
  - [x] Form-komponentit
  - [x] Toast-ilmoitukset (React Hot Toast)
- [x] Käyttöliittymän parannukset
  - [x] Responsiivisuus
    - [x] Käyttäjien hallintadialogin responsiivisuus mobiililaitteilla
    - [x] Tikettien toimintojen dropdown-valikko
    - [x] Käyttäjänhallinta-painike admin-käyttäjille mobiilinavigaatiossa
  - [x] Latausanimaatiot (React Query)
  - [x] Virheilmoitukset (React Query)
  - [x] Ilmoitusten ulkoasu
  - [ ] Tumma teema
  - [ ] Käyttöliittymän kieliversiot (FI/EN)

### Testaus
- [ ] Komponenttitestit (React Testing Library)
- [ ] End-to-end testit (Cypress)

## Backend
### API Endpointit
- [x] Tikettien CRUD-operaatiot
  - [x] Tikettien luonti
  - [x] Tikettien haku
  - [x] Tikettien päivitys
  - [x] Tikettien poisto
- [x] Kategorioiden hallinta
  - [x] Kategorioiden haku
  - [x] Kategorioiden luonti (seed)
- [x] Kommenttien CRUD-operaatiot
  - [x] Kommenttien luonti
  - [ ] Kommenttien haku
  - [ ] Kommenttien päivitys
  - [ ] Kommenttien poisto
- [x] Käyttäjien hallinta
  - [x] Käyttäjien haku
  - [x] Käyttäjien päivitys (roolit)
  - [ ] Käyttäjien poisto
- [x] Media-integraatiot
  - [x] Tiedostojen lataus järjestelmään
  - [x] Kuva- ja videokommenttien käsittely
  - [x] Kaikki tukihenkilöt voivat lisätä mediakommentteja kaikkiin tiketteihin
  - [x] Käyttöliittymän terminologian yhtenäistäminen: "kuva/video" -> "media"
  - [x] Tiketin luojat voivat lisätä mediasisältöä (kuvat, videot) kommentteihin
  - [x] Tukihenkilöiden on lisättävä mediavastaus ennen tekstikommentin lisäämistä tiketeissä, jotka vaativat mediasisällön

### WebSocket ja ilmoitukset
- [x] WebSocket-integraatio
  - [x] Socket.IO palvelin
  - [x] Autentikointi WebSocket-yhteydelle
  - [x] Yhteyden uudelleenyhdistäminen
- [x] Ilmoitusten hallinta
  - [x] Ilmoitusten luonti
  - [x] Ilmoitusten haku
  - [x] Ilmoitusten merkitseminen luetuiksi
  - [x] Ilmoitusten poistaminen
- [x] Ilmoitusasetusten hallinta
  - [x] Asetusten tallennus
  - [x] Asetusten haku
  - [x] Oletusasetusten luonti

### Testaus ja laadunvarmistus
- [ ] API-testit (Jest)
- [ ] Integraatiotestit
- [x] API-dokumentaatio (docs.md)
- [x] Virhekäsittelyn perusrakenne
- [ ] Lokitus ja monitorointi

## Tekoälyominaisuudet
- [x] AI-tikettien generointijärjestelmä
  - [x] LangChain.js integraatio
  - [x] OpenAI API integraatio
  - [x] Tikettien generointi opetuskäyttöön
  - [x] Tiketin tietojen parametrisointi (kompleksisuus, kategoria, käyttäjäprofiili)
  - [x] Selkeät ratkaisut tiketteihin sisältäen tiedon mikä lopulta korjasi ongelman
- [x] AI-työkalujen käyttöliittymä
  - [x] AI Tools -sivu admin- ja tukikäyttäjille
  - [x] Tikettigeneraattorin käyttöliittymä
  - [x] Generointiparametrien lomake
- [x] AI-dokumentaatio
  - [x] Tekninen dokumentaatio (ai-docs.md)
  - [x] Käyttöohje tikettigeneraattoriin
- [ ] Lisäominaisuudet
  - [ ] Tikettien luokittelu tekoälyn avulla
  - [ ] Vastausehdotusten generointi tukihenkilöille
  - [ ] Tietämyskannan integraatio
  - [ ] Tikettihistorian analyysi

## Tuotantoon vienti
- [x] Docker-konfiguraatio
  - [x] docker-compose.yml
  - [x] PostgreSQL kontti
  - [x] Backend kontti
- [x] Tietokannan migraatiot
  - [x] Automaattinen migraatioiden ajo
  - [x] Prisma Client generointi
- [ ] CI/CD pipeline
  - [ ] GitHub Actions konfiguraatio
  - [ ] Automaattinen testaus
  - [ ] Automaattinen deployaus
- [ ] Tuotantoympäristön pystytys
  - [ ] Palvelimen konfigurointi
  - [ ] SSL-sertifikaatit
  - [ ] Varmuuskopiointi

## Dokumentaatio
- [x] Kehittäjän ohjeet
  - [x] Asennusohjeet
  - [x] Kehitysympäristön pystytys
  - [x] API-dokumentaatio
  - [x] Tietokannan dokumentaatio
- [ ] Käyttöohjeet
  - [ ] Perustoiminnot
  - [ ] Ylläpitäjän ohjeet
- [ ] Tietoturvaohjeistus
  - [ ] Käyttöoikeuksien hallinta
  - [ ] Tietoturvaperiaatteet

## Uusia tehtäviä
- ~~Muokata TODO.md TODO-listan mukaiseksi~~
- ~~Luoda nyt/tulevan viikon aikana jonkinnäköinen Github Action workflow työkalulla, joka hoitaa järjestelmän automaattisen peilauksen kehitysympäristöstä tuotantoympäristöön (esim. jokainen push master-haaraan käynnistää uuden buildin ja se pushaa koodin tuotantoympäristöön)~~
- ~~Dokumentoida AI toiminnot tikettien generointiin ja keskusteluihin~~
- ~~Jatkaa Backendpuolen testien kirjoitusta~~
- ~~Dockerization palvelulle/deployaukselle~~
- ~~Jatkaa Chat.tsx komponentin refaktorointia omiin pienempiin komponentteihin~~
- ~~Käyttöliittymään käyttäjäprofiili sivu~~
- ~~Julkista rajapintaa testaamaan Swagger UI/dokumentaatio~~
- ~~Backendiin lokien käyttö (kirjoitetaan hyvät lokit tiedostoon (info, warning, error))~~
- ~~Refaktoroida UserController käyttämään DTO:ita~~
- ~~Refaktoroida TicketController käyttämään DTO:ita~~
- ~~Luoda oma router tiedostot eri reiteille, esim. userRouter.ts, jossa määritellään user-reitit~~
- ~~Luoda Singleton tyyppinen SessionManager joka vastaa sessioista~~
- ~~Luoda Servicet (UserService, TicketService)~~
- ~~AWS:n Cloudfront integroiminen dokumentaatiosta löytyneen cloud-init.yml mukaan~~
- ~~Implementoida kommentointi tiketteihin~~
- ~~Julkisten tikettien visualisointi ja haku~~
- ~~AI tikettien luomisen implementointi~~
- ~~AI chatin implementointi~~
- ~~Tikettien hakuominaisuus~~
- ~~Yleinen siistiminen ja refaktorointi~~
- Luoda ChatAgent-dokumentaatio ~~(docs/ai-agents/chatAgent.md)~~
- Luoda TicketGenerator-dokumentaatio (docs/ai-agents/ticketGenerator.md)
- Redis cachen käyttöönotto
- Rate limiting (bottien varalta)
- ~~Mobiilioptimointi~~