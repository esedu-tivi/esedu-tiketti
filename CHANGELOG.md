# Changelog

Kaikki merkittävät muutokset tähän projektiin dokumentoidaan tässä tiedostossa.

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