# Tehtävälista

## Tietokanta ja autentikointi
- [x] PostgreSQL-tietokannan asennus ja konfigurointi
- [x] Tietokantamallin luominen (users, tickets, comments)
- [x] Tietokantayhteyden konfigurointi
- [x] Migraatioiden luominen
- [x] Kategorioiden hallinta
  - [x] Kategoriamallin luonti
  - [x] Kategorioiden CRUD-operaatiot
- [ ] MSA autentikoinnin integrointi
  - [ ] Azure AD konfigurointi
  - [ ] Token validointi backendissä
  - [ ] Autentikoinnin integrointi frontendiin
- [ ] Käyttäjäroolien hallinta (admin, user)
  - [ ] Roolipohjainen pääsynhallinta (RBAC)
  - [ ] Käyttöliittymän mukauttaminen roolin mukaan

## Frontend
### Tikettinäkymät
- [x] Tiketin luontilomake
  - [x] Perustiedot (otsikko, kuvaus)
  - [x] Laitetiedot ja lisätiedot
  - [x] Kategorian valinta
  - [x] Prioriteetin valinta (LOW, MEDIUM, HIGH, CRITICAL)
  - [x] Validointi
  - [x] Virheilmoitukset
- [x] Tikettien listausnäkymä (perusversio)
  - [ ] Suodatus kategorian mukaan
  - [ ] Suodatus tilan mukaan
  - [ ] Suodatus prioriteetin mukaan
  - [ ] Järjestäminen
  - [ ] Hakutoiminto
- [ ] Tiketin yksityiskohtanäkymä
  - [ ] Perustiedot
  - [ ] Tilan muuttaminen
  - [ ] Vastuuhenkilön asettaminen
  - [ ] Kategorian muuttaminen

### Kommentit
- [ ] Kommenttien käyttöliittymä
  - [ ] Listaus tiketissä
  - [ ] Lisäys
  - [ ] Muokkaus (vain omat kommentit)
  - [ ] Poisto (vain omat kommentit)

### UI/UX
- [x] Käyttöliittymän peruskomponentit
  - [x] Shadcn/ui komponenttikirjasto
  - [x] Select-komponentti
  - [x] Form-komponentit
- [ ] Käyttöliittymän parannukset
  - [x] Responsiivisuus
  - [x] Latausanimaatiot (React Query)
  - [x] Virheilmoitukset (React Query)
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
- [ ] Kommenttien CRUD-operaatiot
  - [ ] Kommenttien luonti
  - [ ] Kommenttien haku
  - [ ] Kommenttien päivitys
  - [ ] Kommenttien poisto
- [ ] Käyttäjien hallinta
  - [x] Käyttäjien haku
  - [ ] Käyttäjien päivitys
  - [ ] Käyttäjien poisto

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