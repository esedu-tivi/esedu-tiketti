# Tehtävälista (TODO)

Tähän tiedostoon listataan projektin tulevat tehtävät ja niiden tila.

## Merkinnät

*   `✅` - Tehty
*   `⏳` - Työn alla
*   `❌` - Ei aloitettu

## Seuraavaksi Työn Alle (suositus)

Suositeltu järjestys. Perusteena se, mikä on tuotannossa auki tai rikki juuri nyt — ei se, mikä on nopeinta tehdä.

1.  **Julkaise todennuskorjaus tuotantoon.** Korjaus on committattu, mutta **tuotannossa pyörii yhä vanha koodi**, jossa tokenin allekirjoitusta ei tarkisteta. Niin kauan kuin julkaisu on tekemättä, kuka tahansa voi esiintyä pääkäyttäjänä. Etene `AUTH_VERIFY_MODE=warn` -tilan kautta ja siirry `enforce`-tilaan heti kun lokit ovat puhtaat. Varmista, että `AZURE_TENANT_ID` ja `AZURE_CLIENT_ID` ovat palvelimen `.env`-tiedostossa.
2.  **Julkaise docker-composen porttikorjaukset.** Tuotannon Postgres (`0.0.0.0:5434`) ja backend (`0.0.0.0:3001`) ovat auki internetiin. Muutos vaatii konttien uudelleenluonnin (`docker compose up -d`), ei pelkkää uudelleenkäynnistystä. Tarkista samalla, ettei `.env`-tiedostossa ole esimerkkisalasanaa `admin123`.
3.  **Julkaise nginx-korjaukset.** Liitetiedostot ovat rikki tuotannossa, koska `/uploads` puuttuu konfiguraatiosta.
4.  **Suojaa `/api/health`.** Julkinen, rajoittamaton ja tekee tietokantakyselyn joka kutsulla.
5.  **Lisää ensimmäiset automaattitestit.** Todennuksen hyökkäystestit on jo kertaalleen ajettu käsin — vakinaista ne, jotta sama aukko ei pääse palaamaan huomaamatta.
6.  **Pakkaa 3,2 MB:n kuva.** Suurin yksittäinen käyttökokemusparannus, muutaman minuutin työ.

Kohdat 1–3 ovat tuotannon tilaa koskevia. Loput voi tehdä normaalissa järjestyksessä.

## Tehtävät

### Tietoturva

*   `✅` Tokenin allekirjoituksen tarkistus palautettu (`azureTokenVerifier.ts`)
    *   Varmistettu hyökkäystesteillä: algoritmisekaannus (HS256 julkisella avaimella), `alg: none`, oma RSA-avain aidolla `kid`-arvolla, vanhentunut token, väärä audience, väärä issuer — kaikki hylätään
    *   `POST /api/auth/login` vaatii nyt tokenin, ja käyttäjätiedot luetaan siitä
    *   `optionalAuthMiddleware` ei enää aseta `req.user`-kenttää tarkistamattomasta tokenista
    *   WebSocket-yhteydet käyttävät samaa tarkistusta
    *   Profiilikuvareitit (`/api/users/profile-picture/...`) vaativat todennuksen
*   `❌` **Suojaa `/api/health`.** Palauttaa käyttöjärjestelmän, muistin, CPU-ytimet ja kuormituksen kenelle tahansa, ja tekee tietokantakyselyn (`SELECT 1`) joka kutsulla. Rate limit ohittaa sen erikseen (`app.ts`), joten sitä voi kutsua rajattomasti. Jätä `/live` ja `/ready` julkisiksi, vaadi todennus yksityiskohtaiseen.
*   `❌` **Harkitse käyttäjän tunnistusta `oid`-kentällä sähköpostin sijaan.** `preferred_username` on Azuressa muuttuva kenttä. Jos jonkun sähköposti vaihtuu, hän saa uuden tilin ja menettää roolinsa. Microsoft suosittelee pysyväksi tunnisteeksi `oid` + `tid`. Vaatii migraation ja koskee kaikkia paikkoja, joissa käyttäjä haetaan sähköpostilla.
*   `❌` `GET /api/categories` on ilman todennusta. Paljastaa vain kategorioiden nimet, joten riski on pieni.
*   `❌` Muista poistaa `AUTH_VERIFY_MODE=warn` tuotannosta käyttöönoton jälkeen. Warn-tilassa järjestelmä on käytännössä ilman todennusta. Käynnistysloki varoittaa tästä.
*   `❌` JWKS-haun rajoitus on 10 pyyntöä minuutissa. Satunnaisilla `kid`-arvoilla syötetyt tokenit voivat kuluttaa budjetin ja aiheuttaa aidoille käyttäjille hetkellisen 401:n. Välimuisti (10 min) suojaa normaalikäytössä. Harkitse rajan nostoa, jos ilmiötä näkyy lokeissa.
*   `❌` Tee `prisma/seed.ts` idempotentiksi: demotiketit luodaan `create`-kutsulla, joten ne monistuvat joka ajolla. Siivoa myös aiemmin syntyneet duplikaatit tuotannosta.

### Ydinominaisuudet

*   `[Merkki]` Kuvaus tehtävästä...

### Käyttöliittymä (UI/UX)

*   `✅` Paranna tukihenkilöassistentin chat-käyttöliittymää:
    * Moniriviinen tekstialue yhden rivin tekstikentän sijaan
    * Aikaleimoja näytetään suomalaisessa formaatissa (24h)
*   `✅` Tallenna käyttäjän näkymäasetukset (kortti/lista) selaimen paikallismuistiin (localStorage):
    * Tikettilistat (Kaikki tiketit, Omat tikettini, Oma työnäkymä)
    * Muista valittu välilehti Oma työnäkymä -sivulla
*   `[Merkki]` Kuvaus tehtävästä...

### Backend & API

*   `✅` Azure AD -autentikoinnin korjaus tuotannossa (JWKS v1/v2 fallback)
    *   Lisätty dynaaminen JWKS-valinta issuerin perusteella (v1 vs v2)
    *   Fallback vaihtoehtoiseen JWKS-joukkoon invalid signature -tilanteissa
    *   Dokumentoitu audience-vaatimus (aud = `AZURE_CLIENT_ID`)
    *   HUOM: tämä toteutus revertoitiin `07efc46`-commitissa 3.9.2025. Juurisyy oli, että frontend lähetti Graph-tokenia, jota kukaan muu ei voi tarkistaa. Nykyinen toteutus on `azureTokenVerifier.ts`, ks. Tietoturva-osio.

### Tekoäly (AI)

*   `✅` Toteuta AI-avustaja tukihenkilöille tikettien ratkaisemiseen (SupportAssistantAgent)
*   `✅` Muokkaa SupportAssistantAgent toimimaan pedagogisena oppaana IT-opiskelijoille, ohjaten ratkaisuun antamatta suoria vastauksia.
    *   `✅` Hienosäädä promptia varmistamaan, että agentti ehdottaa aktiivisesti seuraavia askelia ja toimii yhteistyökumppanina (ei vain kysele).
    *   `✅` Lisää agentille kyky huomioida opiskelijan ja ChatAgentin välinen keskusteluhistoria.
    *   `✅` Lisää SupportAssistantAgentille muisti oman keskustelunsa osalta opiskelijan kanssa:
        *   `✅` Agentti ja prompti päivitetty vastaanottamaan `studentAssistantConversationHistory`.
        *   `✅` Toteuta backend-logiikka keskusteluhistorian tallentamiseen, hakemiseen ja tyhjentämiseen. Toteutettu uudella `SupportAssistantConversation`-mallilla tietokannassa.
        *   `✅` Paranna AI-avustajan palautteenkäsittelyä latauksen jälkeen (interactionId:n ja annettujen palautteiden tallennus/haku).
        *   `✅` Korjattu virhe (P2003) tiketöinnin poistossa varmistamalla, että `SupportAssistantConversation`-tietueet poistetaan transaktiossa.
*   `✅` Paranna tukihenkilöassistentin tietämysartikkelien hakua käyttämään vain tikettiin liittyviä artikkeleita
*   `✅` Toteuta AI-avustajan analytiikkanäkymä ja backend-palvelut tilastointia varten
*   `✅` Korjattu AI-tikettien yksipuolisuus: aihe arvotaan koodissa (48 aiheen katalogi), viimeisten 15 tiketin aiheet jätetään arvonnan ulkopuolelle, verkkoaiheiset esimerkit poistettu promptista
*   `❌` Lisää aihevalikko tikettigeneraattorin käyttöliittymään (oletuksena "Satunnainen"). Generaattori tukee jo `topicId`-parametria, joten työ on pieni.
*   `❌` Lisää aihejakauma AI-analytiikkaan: `generatorMetadata.topicId` tallennetaan jo jokaiseen tikettiin.
*   `❌` Toteuta lisää tilastoja AI-analytiikkaan:
    * Heatmap-visualisoinnit käytön ajoista
    * Hakutermien trendien analyysi
    * Laajempi kategoria-analyysi 
    * Automatisoidut raportit ja yhteenvedot
*   `[Merkki]` Kuvaus tehtävästä...

### Testaus & Laadunvarmistus

*   `❌` Lisää ensimmäiset testit: `jest` on määritelty `package.json`:ssa, mutta testitiedostoja ei ole yhtään. Aloituskohteet tärkeysjärjestyksessä:
    *   Todennuksen hyökkäystestit (algoritmisekaannus, `alg: none`, väärä avain, vanhentunut, väärä aud/iss) — nämä on ajettu kertaalleen käsin, mutta ne pitää saada automaatioon
    *   Roolitarkistukset (`roleMiddleware`)
    *   Tikettigeneraattorin aihearvonta — deterministisesti testattavissa, koska satunnaisuus on koodissa
*   `[Merkki]` Kuvaus tehtävästä...

### Dokumentaatio

*   `✅` Käännä kaikki `new_docs` -kansion dokumentit suomeksi.
*   `❌` Kirjoita `new_docs/deployment.md`: julkaisuprosessi, `deploy.sh`:n valitsimet (`--frontend`, `--backend`), rollback, ympäristömuuttujat, nginx-konfiguraation sijainti ja palvelimen nginx-versio (1.22.1, vaikuttaa HTTP/2-syntaksiin).
*   `[Merkki]` Kuvaus tehtävästä...

### Julkaisu & Infrastruktuuri

*   `✅` Julkaisuskripti `deploy.sh` (koko sovellus, `--frontend`, `--backend`, rollback, tietokannan varmuuskopio)
*   `✅` Docker-composen korjaukset: portit vain `127.0.0.1`:een, seed pois tuotantokäynnistyksestä, backendin healthcheck
*   `✅` Nginx-konfiguraatio versionhallintaan (`deploy/nginx/`): puuttunut `/uploads`, `client_max_body_size`, AI-pyyntöjen timeoutit, välimuistiotsakkeet
*   `❌` Siirry GHCR-pohjaiseen julkaisuun muiden palvelimen palveluiden tapaan (ossi2, vaks): GitHub Actions buildaa imagen, palvelin vain vetää sen. Tuo tagipohjaisen rollbackin eikä kuormita palvelinta buildaamisella.

### Suorituskyky & Riippuvuudet (frontend)

*   `❌` Pakkaa `src/assets/esedu-tiketti.png`: 3,2 MB ja 1536×1024 px, vaikka se näytetään 320 px levyisenä (`ProfileView.jsx`). Skaalaus 640 px:iin ja WebP pudottaisi koon noin 50–100 kt:uun. Tarkista myös `logo.png` (248 kt).
*   `❌` Jaa JS-bundle: nyt 1,76 MB (504 kt gzipattuna) yhtenä tiedostona, koska `React.lazy`-latausta ei käytetä lainkaan. Suurin voitto: `recharts` ladataan laiskasti, sitä käyttää vain kaksi admin-näkymää (`TokenAnalytics`, `DiscordStatistics`).
*   `❌` Nimeä `vite.config.js` → `vite.config.mjs`. Nyt tulee varoitus "The CJS build of Vite's Node API is deprecated", koska `package.json`:ssa on `"type": "commonjs"` mutta konfiguraatio käyttää ESM-syntaksia. **Vite 6 ei enää tue tätä.**
*   `❌` Poista käyttämättömät riippuvuudet: `@mui/material` (nolla importtia), `@shadcn/ui`, `shadcn-ui`, `gensync` sekä Tailwind 4:n paketit `@tailwindcss/postcss` ja `@tailwindcss/vite`.
*   `❌` Selvitä Tailwindin versio: `package.json`:ssa `"tailwindcss": "3.0"` asentaa version 3.0.24 (helmikuu 2022), vaikka projektissa on shadcn-tyylisiä komponentteja ja `tailwindcss-animate`, jotka olettavat 3.3+. Päivitys voi muuttaa ulkoasua, joten vaatii oman testikierroksen.
*   `❌` Päivitä browserslist-data: `npx update-browserslist-db@latest` (data 19 kk vanha).
*   `❌` Päivitä ESLint versioon 9 (v8 on elinkaarensa päässä). Vaatii siirtymän flat config -muotoon.

### Ylläpidettävyys

*   `❌` Siivoa päällekkäiset AI-agentit: `chatAgent` / `modernChatAgent` / `enhancedModernChatAgent` sekä vanha ja uusi tikettigeneraattori. Poista käytöstä jäänyt versio asetuskytkimineen — nyt jokainen korjaus pitää tehdä kahteen paikkaan.
*   `❌` Pilko suuret kontrollerit: `ticketController.ts` (1473 riviä) ja `aiController.ts` (1330 riviä). Siirrä liiketoimintalogiikka services-kerrokseen.
*   `❌` Siivoa `[DEBUG]`-lokit vanhasta tikettigeneraattorista (noin 70 kpl).
*   `❌` Harkitse SVG-tukea liitetiedostoihin: vaatii `/uploads`-vastauksiin otsakkeet `Content-Security-Policy: default-src 'none'` ja `Content-Disposition: attachment`, koska SVG voi sisältää JavaScriptiä.
*   `❌` HEIC-kuvien muunnos JPEG-muotoon palvelimella. Nyt HEIC tallentuu, mutta vain Safari osaa näyttää sen. Vaatii libheif-tuen (sharpin valmiit binäärit eivät sisällä sitä).

### Muut / Yleiset

*   `[Merkki]` Kuvaus tehtävästä...

---

## Ohjeet Listan Ylläpitoon

1.  **Lisää Tehtävä:** Lisää uusi tehtävä sopivan kategorian alle käyttäen bullet-pistettä (`*`).
2.  **Tila:** Merkitse tehtävän tila käyttämällä yhtä ylläolevista merkeistä (`✅`, `⏳`, `❌`) heti bullet-pisteen jälkeen hakasulkeissa, esim. `*   `❌` Lisää uusi ominaisuus X.`.
3.  **Päivitä Tila:** Pidä tehtävien tilat ajan tasalla.
4.  **Priorisointi:** Voit järjestää tehtäviä kategorian sisällä tärkeysjärjestykseen (tärkein ylimpänä) tai lisätä erillisen "Seuraavaksi Työn Alle" -osion. 

## Muutosloki
