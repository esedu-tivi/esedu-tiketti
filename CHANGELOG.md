# Changelog

Kaikki merkittävät muutokset tähän projektiin dokumentoidaan tässä tiedostossa.

# 13.02.2025 part 3

### Added
- Lisätty ilmoitusjärjestelmä:
  - Reaaliaikaiset ilmoitukset WebSocket-yhteyden kautta
  - Ilmoitukset seuraavista tapahtumista:
    - Tiketin osoitus käsittelijälle
    - Uusi kommentti tiketissä
    - Tiketin tilan muutos
    - Tiketin prioriteetin muutos
    - @-maininta kommentissa
    - Deadline lähestyy (tulossa)
  - Ilmoitusten hallintapaneeli kellokuvakkeen takana
  - Ilmoitusten merkitseminen luetuiksi
  - Ilmoitusten poistaminen
- Lisätty ilmoitusasetukset:
  - Selainilmoitusten hallinta
  - Sähköposti-ilmoitusten hallinta (tulossa)
  - Yksityiskohtaiset asetukset eri ilmoitustyypeille
  - Asetukset tallennetaan käyttäjäkohtaisesti
- Lisätty profiilisivu:
  - Käyttäjän perustiedot
  - Ilmoitusasetusten hallinta
  - Selkeämpi pääsy profiilisivulle headerissa
- Lisätty @-maininta kommentteihin:
  - Käyttäjien mainitseminen @-merkillä
  - Automaattinen käyttäjien ehdotus kirjoitettaessa
  - Visuaalinen korostus mainituille käyttäjille
  - Ilmoitus mainituille käyttäjille

### Changed
- Päivitetty käyttöliittymää:
  - Selkeämpi profiilipainike headerissa
  - Paranneltu ilmoitusten ulkoasua
  - Lisätty tooltippejä käyttöliittymän elementteihin
- Vaihdettu toast-kirjasto react-toastify:stä react-hot-toast:iin
- Parannettu ilmoitusten käsittelyä:
  - Ilmoitukset näytetään vain jos käyttäjä on sallinut ne
  - Duplikaatti-ilmoitusten esto
  - Parempi virheenkäsittely

### Fixed
- Korjattu tiketin luonnin validointi:
  - Laite-kenttä ei ole enää pakollinen
  - Null-arvojen oikea käsittely
- Korjattu ilmoitusten toiminta offline-tilassa
- Korjattu WebSocket-yhteyden uudelleenyhdistäminen

# 13.02.2024 part 2

### Added
- Lisätty mahdollisuus tiketin luojalle sulkea oma tikettinsä missä tahansa tilassa, paitsi jos tiketti on jo suljettu tai ratkaistu
- Lisätty värikoodatut järjestelmäviestit tapahtumahistoriaan:
  - Keltainen: "Tiketti otettu käsittelyyn" ja "IN_PROGRESS"-tilamuutokset
  - Vihreä: "Tiketti ratkaistu (RESOLVED)"
  - Harmaa: "Tiketti suljettu (CLOSED)"
  - Sininen: "Tiketti vapautettu"
  - Violetti: "Tiketin käsittelijä vaihdettu" ja siirtoviestit

### Changed
- Päivitetty tiketin käsittelyoikeuksien logiikkaa:
  - Tiketin luoja voi nyt sulkea tikettinsä missä tahansa tilassa
  - Parannettu käsittelijän vaihtamisen logiikkaa
- Uudistettu tapahtumahistorian ulkoasua:
  - Selkeämpi visuaalinen hierarkia
  - Parempi värikoodaus eri tapahtumatyypeille
  - Parannettu luettavuutta


# 13.02.2024

### Added
- Lisätty tukihenkilöiden työnäkymä:
  - Kaksi välilehteä:
    - "Käsittelyssä" - näyttää tukihenkilön omat käsittelyssä olevat tiketit
    - "Avoimet tiketit" - näyttää kaikki avoimet tiketit, joita ei ole otettu käsittelyyn
  - Automaattinen päivitys 30 sekunnin välein
  - Selkeä välilehtinäkymä tikettien määrillä
- Lisätty syötteen validointi (Zod):
  - Tiketin validointi:
    - title: String (5-100 merkkiä)
    - description: String (10-2000 merkkiä)
    - device: String (max 100 merkkiä), valinnainen
    - additionalInfo: String (max 1000 merkkiä), valinnainen, voi olla null
    - priority: Enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    - categoryId: UUID
    - responseFormat: Enum ('TEKSTI', 'KUVA', 'VIDEO'), oletuksena 'TEKSTI'
  - Kommentin validointi:
    - content: String (1-1000 merkkiä)
  - HTML-sanitointi kaikille syötteille
- Lisätty kommentoinnin rajoitukset:
  - Estetty kommentointi kun tiketti on ratkaistu tai suljettu
  - Tukihenkilö voi kommentoida vain ottaessaan tiketin käsittelyyn
  - Vain tiketin käsittelijä voi kommentoida käsittelyssä olevaa tikettiä
  - Tiketin luoja voi aina kommentoida (paitsi kun tiketti on suljettu/ratkaistu)

### Changed
- Parannettu backendin arkkitehtuuria:
  - Selkeämpi vastuunjako tiedostojen välillä
  - Express-asetukset keskitetty app.ts:ään
  - Palvelimen käynnistys siirretty index.ts:ään
  - Middleware-komponenttien järjestely
- Päivitetty validointia:
  - Lisätty tuki null-arvoille additionalInfo-kentässä
  - Lisätty oletusarvo responseFormat-kentälle


### Fixed
- Korjattu tiketin luonnin validointi:
  - Lisätty puuttuva responseFormat-kentän validointi
  - Korjattu additionalInfo-kentän null-arvojen käsittely

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