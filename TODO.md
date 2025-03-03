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
- [ ] Käyttöliittymän parannukset
  - [x] Responsiivisuus
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

## Tuotantoon vienti
- [x] Docker-konfiguraatio
  - [x] docker-compose.yml
  - [x] PostgreSQL kontti
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