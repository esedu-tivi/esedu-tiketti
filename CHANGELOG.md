# Changelog

Kaikki merkittävät muutokset tähän projektiin dokumentoidaan tässä tiedostossa.

# 12.02.2025

### Added
- Lisätty tiketin käsittelyyn liittyvät toiminnot:
  - Tiketin vapauttaminen takaisin OPEN-tilaan
  - Tiketin tilan muuttaminen (RESOLVED, CLOSED)
  - Tiketin uudelleen avaaminen IN_PROGRESS-tilaan
  - Tiketin siirtäminen toiselle tukihenkilölle
- Lisätty käsittelyajan seuranta:
  - Käsittelyn aloitusaika (processingStartedAt)
  - Käsittelyn päättymisaika (processingEndedAt)
  - Arvioitu valmistumisaika prioriteetin mukaan (estimatedCompletionTime)
- Lisätty automaattiset kommentit tiketin tilan muutoksista
- Lisätty käsittelyajan näyttäminen tiketin tiedoissa
- Lisätty tiketin lukitus käsittelijälle:
  - Vain tiketin käsittelijä voi muokata tikettiä kun se on IN_PROGRESS-tilassa
  - Muut tukihenkilöt eivät voi ottaa käsittelyyn jo käsittelyssä olevaa tikettiä
  - Admin voi aina muokata tikettejä riippumatta tilasta
- Lisätty middleware käsittelyoikeuksien tarkistamiseen (canModifyTicket)

### Changed
- Päivitetty TicketDetailsModal näyttämään uudet käsittelyyn liittyvät tiedot
- Parannettu tiketin käsittelyn käyttöliittymää:
  - Lisätty napit tiketin vapauttamiselle
  - Lisätty napit tilan muuttamiselle
  - Lisätty käsittelyaikojen näyttäminen
  - Lisätty nappi tiketin siirtämiselle toiselle tukihenkilölle
- Päivitetty tiketin käsittelylogiikka:
  - Tiketin ottaminen käsittelyyn lukitsee sen käsittelijälle
  - Tiketin vapauttaminen poistaa käsittelijän ja palauttaa tiketin OPEN-tilaan
  - Tiketin sulkeminen tai ratkaiseminen poistaa käsittelijän
  - Tiketin siirtäminen vaihtaa käsittelijän ja lisää automaattisen kommentin

### Fixed
- Korjattu tiketin käsittelyoikeuksien tarkistus
- Optimoitu tiketin tilan päivityksen logiikka
- Korjattu ongelma, jossa useampi tukihenkilö pystyi ottamaan saman tiketin käsittelyyn

# 10.02.2025

### Added
- Lisätty vastausmuoto (responseFormat) tiketteihin
- Lisätty uusi addComment API-funktio kommenttien lisäämiseen
- Parannettu kommenttien käsittelyä
  - Lisätty authMiddleware kommenttien lisäämiseen
  - Lisätty autentikoitu API-instanssi kommenttien käsittelyyn

### Changed
- Päivitetty TicketDetailsModal käyttämään uutta addComment-funktiota
- Parannettu kommenttien lisäämisen virhekäsittelyä
- Siirretty kommenttien käsittely käyttämään autentikoitua API-instanssia

### Fixed
- Korjattu kategoriasuodatuksen toiminta
  - Korjattu case-sensitive haku kategorioille
  - Lisätty tuki dynaamisille kategorioille
  - Korjattu kategorioiden nimet vastaamaan tietokannan arvoja
- Korjattu kommenttien autentikointi
  - Korjattu kommentoijan tietojen näyttäminen
  - Poistettu anonyymit kommentit
  - Korjattu käyttäjätietojen välitys backendille

### Security
- Parannettu kommenttien tietoturvaa
  - Lisätty autentikaatiotarkistukset
  - Varmistettu käyttäjän identiteetti kommentoinnissa

## 31.01.2025

### Added
- RBAC (Role-Based Access Control) järjestelmä
  - Kolmiportainen roolihierarkia (USER -> SUPPORT -> ADMIN)
  - Roolikohtaiset käyttöoikeudet ja näkymät
  - Dynaaminen käyttöliittymän mukautuminen roolin mukaan
- Käyttäjien hallintajärjestelmä
  - Käyttäjien listaus ja suodatus
  - Roolien hallinta käyttöliittymästä
  - Muutosten vahvistus ja peruutus
- Tukihenkilö-roolin (SUPPORT) toiminnallisuus
  - Pääsy hallintapaneeliin
  - Kaikkien tikettien käsittely
  - Tikettien tilan ja vastuuhenkilön muuttaminen
- Uudet näkymät ja komponentit
  - "Omat tiketit" -näkymä käyttäjille
  - Hallintapaneeli tukihenkilöille ja admineille
  - Käyttäjien hallintadialogi admineille

### Changed
- Päivitetty käyttöoikeuksien hallinta
  - Lisätty SUPPORT-roolin tarkistukset
  - Parannettu middlewaren toimintaa
  - Lisätty roolikohtaiset pääsyoikeudet API-endpointteihin
- Uudistettu navigaatiorakenne
  - Siirretty käyttäjien hallinta headeriin
  - Roolikohtaiset navigaatioelementit
  - Selkeämpi visuaalinen hierarkia
- Parannettu tikettien käsittelyä
  - Eriytetty omat tiketit ja kaikki tiketit

### Fixed
- Korjattu käyttöoikeuksien tarkistus tikettien käsittelyssä
- Korjattu roolien päivityksen aiheuttamat layout-ongelmat
- Korjattu virhetilanteiden käsittely käyttäjien hallinnassa

### Security
- Parannettu käyttöoikeuksien tarkistusta
  - Lisätty roolikohtaiset middleware-tarkistukset
  - Estetty luvaton pääsy hallintapaneeliin
  - Varmistettu, että vain admin voi muuttaa käyttäjien rooleja
  - Lisätty tarkistukset tikettien käsittelyoikeuksiin


## 30.01.2025

### Added
- MSA (Microsoft Authentication) integraatio
  - Azure AD kirjautuminen
  - Käyttäjien automaattinen luonti/synkronointi
- Autentikoinnin komponentit
  - AuthProvider
  - AuthGuard
  - Login-sivu

### Fixed
- Korjattu tyyppiongelmat autentikoinnissa
- Korjattu reitityksen ongelmat

## 30.01.2025

### Added
- Rakennettu yksittäisen tiketin näkymä:
  - pages/TicketDetails

### Changed
- Päivitetty tikettilistan näkymää

## 29.01.2025 v2

### Added
- Lisätty uudet kentät tiketteihin:
  - `device`: Laitteen tiedot (valinnainen)
  - `additionalInfo`: Lisätiedot (valinnainen)
- Lisätty kategorioiden hallinta
- Lisätty automaattinen migraatioiden ajo tuotannossa
- Lisätty Prisma Client:in automaattinen generointi asennuksen yhteydessä

### Changed
- Päivitetty tiketin luontilomake sisältämään uudet kentät
- Muokattu prioriteettiasteikkoa:
  - Lisätty "Kriittinen" taso
  - Muutettu "Korkea" prioriteetin väri punaisesta oranssiksi
- Päivitetty dokumentaatio vastaamaan uusia ominaisuuksia

### Fixed
- Korjattu kategorian tallennus tiketin luonnissa
- Korjattu tyyppiongelmat Prisma Clientin kanssa

## 29.01.2025

### Added
- Perustoiminnallisuudet:
  - Tikettien luonti ja hallinta
  - Käyttäjien hallinta
  - Kommentointi
  - Tilan ja prioriteetin hallinta
- Docker-pohjainen kehitysympäristö
- Prisma ORM ja PostgreSQL-tietokanta
- Perusdokumentaatio

## 27.01.2025

### Lisätty
- Uuden tiketin luonti
  - Komponentti NewTicketForm.jsx
  - UI-komponentteja src/components/ui


## 21.01.2025

### Lisätty
- Projektin perusrakenne
  - Frontend (React + Vite)
    - React Query datan hakuun
    - React Router navigointiin
    - Tikettien listausnäkymän pohja
    - Komponenttien perusrakenne
    - Tyylit (CSS)
  - Backend (TypeScript + Express)
    - Express-palvelin
    - Mock data tiketit
    - Perus API-endpointit (/api/health, /api/tickets)
    - Ympäristömuuttujien konfiguraatio (.env)

### Tekninen
- Projektin kansiorakenne
- Kehitysympäristön konfiguraatio
- API proxy konfiguroitu
- TypeScript konfiguraatio