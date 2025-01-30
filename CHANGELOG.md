# Changelog

Kaikki merkittävät muutokset tähän projektiin dokumentoidaan tässä tiedostossa.

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