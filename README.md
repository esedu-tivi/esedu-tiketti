# <p align='center'>Esedu-tiketti</p>

🎓 Moderni helpdesk-järjestelmä Etelä-Savon ammattiopiston IT-tuen opiskelijoille. Mahdollistaa opiskelijoiden IT-tukipyyntöjen tehokkaan käsittelyn.

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

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- Azure AD integraatio
- Socket.IO
- Zod validointi
- Multer (tiedostojen käsittely)

### Tietokanta
- PostgreSQL
  - Tiketit ja kommentit
  - Käyttäjät ja roolit
  - Kategoriat
  - Ilmoitukset ja asetukset
  - Media ja liitetiedostot

## 📱 Käyttöliittymä
- Responsiivinen design
- Moderni ja selkeä ulkoasu
- Dynaaminen roolipohjainen navigaatio
- Reaaliaikainen tilojen päivitys
- Käyttäjäystävälliset ilmoitukset
- Selkeä profiilisivu
- Mukautettavat ilmoitusasetukset
- Mediakomponentit kuva- ja videosisällölle

## 📚 Dokumentaatio
- [CHANGELOG.md](./CHANGELOG.md) - Versiohistoria ja muutosloki
- [docs.md](./docs.md) - Tekninen dokumentaatio
- Koodin sisäinen dokumentaatio

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
