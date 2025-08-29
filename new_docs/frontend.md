# Frontend-sovellus (React)

Tämä dokumentti kuvaa tikettijärjestelmän frontend-sovelluksen arkkitehtuurin, käytetyt teknologiat, projektin rakenteen, konfiguroinnin, keskeiset UI-toteutukset ja vianetsinnän.

## Teknologiapino ja Keskeiset Kirjastot

Frontend on moderni Single Page Application (SPA), joka on rakennettu seuraavilla teknologioilla:

*   **Framework:** [React](https://react.dev/) (v18+) - Käyttöliittymien rakentamiseen käytetty pääkirjasto.
*   **Build-työkalu:** [Vite](https://vitejs.dev/) - Nopea ja moderni kehityspalvelin ja build-työkalu.
*   **Kieli:** JavaScript (JSX) - Reactin syntaksi HTML:n upottamiseen JavaScriptiin.
*   **Käyttöliittymäkirjasto:** [Shadcn/UI](https://ui.shadcn.com/) - Kokoelma uudelleenkäytettäviä, saavutettavia ja tyylikkäitä UI-komponentteja, jotka rakentuvat [Radix UI](https://www.radix-ui.com/) -primitiivien ja [Tailwind CSS](https://tailwindcss.com/) -tyylien päälle.
*   **Tyylit:** [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS-framework nopeaan ja joustavaan käyttöliittymien muotoiluun.
*   **Tilan Hallinta:**
    *   **Globaali tila:** React Context API (esim. `AuthProvider` käyttäjän autentikointitilan ja roolin jakamiseen koko sovelluksessa).
    *   **Palvelimen tilan hallinta & Caching:** [TanStack Query (React Query)](https://tanstack.com/query/latest) - Tehokas kirjasto datan noutoon, välimuistitukseen, synkronointiin ja palvelimen tilan päivitykseen.
*   **Reititys:** [React Router](https://reactrouter.com/) (v6+) - Deklaratiivinen reititys SPA-sovelluksissa, mahdollistaa eri näkymien (sivujen) välillä navigoinnin.
*   **API-kutsut:** [Axios](https://axios-http.com/) - Promise-pohjainen HTTP-client selaimelle ja Node.js:lle, käytetään kommunikointiin backendin REST API:n kanssa.
*   **Reaaliaikainen Kommunikaatio:** [Socket.IO Client](https://socket.io/docs/v4/client-api/) - Yhteyden muodostamiseen backendin Socket.IO-palvelimeen reaaliaikaisia ilmoituksia ja päivityksiä varten.
*   **Autentikointi:** [MSAL React (@azure/msal-react)](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react) - Microsoftin kirjasto Azure Active Directory (Azure AD) -pohjaisen autentikoinnin integroimiseen React-sovelluksiin.
*   **Ikonit:** [Lucide React](https://lucide.dev/) - Selkeä ja kevyt ikonisetti.
*   **UI-Ilmoitukset:** [React Hot Toast](https://react-hot-toast.com/) - Helppokäyttöinen kirjasto tyylikkäiden "toast"-ilmoitusten näyttämiseen.

## Konfigurointi Alihakemistoa Varten (Tuotanto)

### Vite-konfiguraatio (`vite.config.js`)

Koska tämä projekti käyttää Viteä, ensisijainen tapa konfiguroida tämä on asettamalla `base`-asetus tiedostossa `frontend/vite.config.js`.

Jos frontend-sovellus ajetaan tuotannossa palvelimen alihakemistossa (esim. `https://domain.com/tiketti/` juuren `/` sijaan), Vite-build tulee konfiguroida:

```javascript
// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tiketti/', // <-- Aseta tähän alihakemiston polku
  // ... muut asetukset
})
```
Kun `base`-polku on lisätty tai muutettu, frontend täytyy buildata uudelleen (`npm run build` tai `yarn build` `frontend`-hakemistossa) ja uusi build-kansion sisältö tulee ottaa käyttöön palvelimella.

### Create React App (CRA) -vaihtoehto (`package.json`)

Vaikka tämä projekti käyttää Viteä, jos käytössä olisi Create React App, yleinen tapa saavuttaa sama tulos on asettamalla `homepage`-kenttä tiedostossa `frontend/package.json`:

```json
// frontend/package.json (Esimerkki CRA:lle)
{

  "homepage": "/tiketti", // <-- Aseta tähän alihakemiston polku (yleensä ilman lopun vinoviivaa 
  // ... muut kentät
}
```
## Keskeiset UI-Toteutukset ja Toiminnallisuudet

### Autentikointi (MSAL React)
*   **Komponentit:**
    *   `AuthProvider` (`providers/AuthProvider.jsx`): Kapseloi sovelluksen, tarjoaa autentikointitilan (`isAuthenticated`, `user`-objekti) ja `msalInstance`-objektin Contextin kautta.
    *   `AuthGuard` (tai vastaava suojattu reittikomponentti): Käyttää `useIsAuthenticated`-hookia ja `user`-tietoa `AuthProvider`:sta varmistaakseen, että käyttäjä on kirjautunut ja hänellä on tarvittava rooli sivun näyttämiseen.
    *   `LoginButton`, `LogoutButton` (`components/auth/`): Käyttävät `msalInstance.loginRedirect()` tai `msalInstance.logoutRedirect()` -metodeja.
*   **Profiilikuvien Hallinta (Microsoft Graph API):**
    *   Kirjautumisen yhteydessä (`AuthProvider`): Tarkistetaan `localStorage` viimeisimmän päivityksen ajankohdan varalta. Jos yli 7 päivää tai ei koskaan päivitetty, haetaan Graph API -token (`msalInstance.acquireTokenSilent`) ja kutsutaan backendin `/api/users/profile-picture/microsoft`-endpointia, joka hakee kuvan Graphista ja tallentaa sen base64-muodossa tietokantaan käyttäjän `profilePictureUrl`-kenttään.
    *   Muiden käyttäjien kuvat: Haetaan backendistä (`/api/users/profile-picture/:userId`), joka palauttaa tietokantaan tallennetun base64-kuvan.
    *   Fallback: Jos kuvaa ei löydy, näytetään käyttäjän nimikirjaimet (`Avatar`-komponentti Shadcn/UI:sta).
    *   Välimuistitus: Backend hoitaa tietokantavälimuistin. Frontend käyttää `localStorage`a päivitystiheyden hallintaan ja `@tanstack/react-query` voi välimuistittaa API-kutsujen vastauksia.

### Reaaliaikainen Kommunikaatio (Socket.IO Client)
*   **Hook:** `hooks/useSocket.js` muodostaa yhteyden backendin Socket.IO-palvelimeen käyttäjän JWT-tokenilla autentikoituen (`io(baseUrl, { auth: { token }})`).
*   **Singleton Pattern:** Käyttää singleton-patternia välttääkseen useita yhteyksiä.
*   **Tapahtumien Kuuntelu:** Hook palauttaa funktiot tapahtumien tilaamiseen ja peruuttamiseen.
*   **Uudet tapahtumat:** 
    - `ticketCreated`, `ticketUpdated`, `ticketStatusChanged`
    - `ticketAssigned`, `ticketDeleted`, `ticketAssignedToYou`
    - `newComment`, `newNotification`
    - `typingStart`, `typingStop`
*   **React Query -integraatio:** WebSocket-tapahtumat päivittävät automaattisesti React Query:n välimuistin.
*   **Yhteyden Tila:** Hook palauttaa yhteyden tilan ja automaattisen uudelleenyhdistämisen.

### React Query Hooks ja Tilan Hallinta

Frontend käyttää laajasti React Query -kirjastoa palvelimen tilan hallintaan. Kaikki data-hakuoperaatiot on keskitetty custom hookeiksi, jotka sijaitsevat `hooks/`-hakemistossa:

#### Perus Data Hooks
*   **`useTickets`** - Tikettien haku, luonti, päivitys ja poisto
    - Käyttää React Query:n `useQuery` ja `useMutation` funktioita
    - Automaattinen välimuistin päivitys mutaatioiden jälkeen
    - Tukee sivutusta ja suodatusta
*   **`useUsers`** - Käyttäjälistan haku
    - Roolipohjainen pääsynhallinta (vain ADMIN ja SUPPORT)
    - Palauttaa tyhjän datan USER-roolille ilman API-kutsua
    - Välimuistitus 5 minuutiksi
*   **`useCategories`** - Kategorioiden keskitetty haku
    - Pidempi välimuistiaika (10 min) koska kategoriat muuttuvat harvoin
    - Estää duplikaatti API-kutsut
*   **`useNotifications`** - Ilmoitusten haku ja hallinta
    - Reaaliaikainen päivitys WebSocketin kautta
    - Luku- ja poisto-operaatiot

#### AI-toiminnallisuuksien Hooks
*   **`useAIAnalytics`** - AI-analytiikan dashboard-data (vain ADMIN)
    - Kokonaisstatistikat, käyttötilastot, agenttien suorituskyky
    - Keskustelumetriikat ja onnistumisprosentit
*   **`useAITicketGenerator`** - AI-tikettien generointi
    - Esikatselu, luonti ja uudelleengenerointi
    - Konfiguraation haku
*   **`useConversation`** - AI-keskustelujen haku ja yhteenvedot
    - Tikettien keskusteluhistoria
    - Ratkaisuehdotukset
    - Yhteenvetojen generointi
*   **`useSupportAssistant`** - Tukiassistentti support-henkilökunnalle
    - Kysymykset, historia ja palaute
    - Streaming-vastaukset

#### Roolien ja Käyttäjähallinta
*   **`useRoleChange`** - Käyttäjäroolien päivitys
    - Kehitystilan roolin vaihto
    - Admin-käyttäjien roolihallinta
*   **`useCanAccessUsers`** - Helper hook pääsynhallintaan
    - Palauttaa boolean-arvon käyttäjän oikeuksista

#### Hook-arkkitehtuurin Periaatteet
1. **Keskitetty Data-haku:** Kaikki API-kutsut tehdään custom hookeissa, ei suoraan komponenteissa
2. **Automaattinen Välimuistitus:** React Query hoitaa datan välimuistuksen ja päivitykset
3. **Roolipohjainen Pääsynhallinta:** Hookit tarkistavat käyttäjän roolin ennen API-kutsuja
4. **Virheenkäsittely:** Hookit käsittelevät 403-virheet hiljaisesti unauthorized-käyttäjille
5. **Optimistinen Päivitys:** Mutaatiot päivittävät UI:n välittömästi ja rollback virhetilanteessa
6. **Request Deduplication:** Identtiset pyynnöt yhdistetään automaattisesti

### Kommenttien @-maininta
*   **Käyttäjälista:** Kirjoitettaessa `@` haetaan käyttäjälista backendistä (esim. `/api/users?search=...`) ehdotuksia varten.
*   **Tallennus:** Kommentin sisältö tallennetaan backendille, joka tunnistaa maininnat ja lähettää tarvittavat ilmoitukset.
*   **Näyttäminen:** Maininnat korostetaan CSS:llä (`.mention`-luokka).

### Media Vastaukset
*   **Tiedoston Lataus:** `CommentForm` tai erillinen `MediaUpload`-komponentti käyttää `<input type="file">` ja `FormData`-objektia lähettääkseen kuvan/videon backendin `/api/tickets/:id/comments/media`-endpointtiin.
*   **Validointi (Client):** Tarkistetaan tiedoston tyyppi ja koko ennen lähetystä.
*   **UI Logiikka:** Jos tiketin `responseFormat` on `KUVA` tai `VIDEO`, tekstikommenttikenttä saatetaan disabloida, kunnes vaadittu mediatyyppi on lähetetty. UI näyttää selkeät ohjeet.
*   **Median Näyttäminen:** Kommenttilistauksessa (`CommentList`) `mediaUrl` ja `mediaType` -tietojen perusteella renderöidään joko `<img>`-tagi tai `<video>`-soitin.

## Vianetsintä (Frontend)

*   **Sovellus ei lataudu / Valkoinen sivu:** Tarkista selaimen konsoli virheiden varalta (F12 -> Console). Varmista, että `npm install` on ajettu ja `npm run dev` on käynnissä ilman virheitä.
*   **API-kutsut epäonnistuvat:**
    *   Tarkista selaimen Network-välilehti (F12 -> Network). Näyttääkö pyyntö 4xx- tai 5xx-virhekoodin? Mitä backend vastaa?
    *   Varmista, että `VITE_API_URL` `.env`-tiedostossa on oikein.
    *   Varmista, että olet kirjautunut (JWT-token lähetetään headerissa).
*   **Kirjautuminen ei onnistu:**
    *   Tarkista MSAL-asetukset (`VITE_MSAL_CLIENT_ID`, `VITE_MSAL_AUTHORITY`, `VITE_MSAL_REDIRECT_URI`) `.env`-tiedostossa. Niiden on vastattava Azure AD -sovelluksen asetuksia.
    *   Tarkista selaimen konsoli MSAL-virheiden varalta.
*   **Profiilikuvat eivät näy / päivity:**
    *   Tyhjennä `localStorage` (F12 -> Application -> Local Storage -> Oikea domain -> Clear All tai poista `lastProfilePictureRefresh`).
    *   Varmista, että käyttäjällä on kuva Microsoft-tilillä.
    *   Tarkista konsoli- ja network-välilehdet virheiden varalta liittyen `/api/users/profile-picture/*`-kutsuihin.
*   **Reaaliaikaiset päivitykset eivät toimi:**
    *   Tarkista selaimen konsoli Socket.IO-yhteysvirheiden varalta.
    *   Varmista, että backendin Socket.IO-palvelin on käynnissä.
*   **Tyylit näyttävät rikkinäisiltä:** Varmista, että Tailwind CSS on konfiguroitu oikein (`tailwind.config.cjs`, `postcss.config.cjs`, `index.css`) ja että build-prosessi toimii.

## Hakemistorakenne (`frontend/src`)

Frontend-sovelluksen lähdekoodi on organisoitu seuraavasti:

```plaintext
src/
├── App.jsx            # Sovelluksen pääkomponentti, sisältää reitityksen ja globaalit providerit.
├── components/        # Uudelleenkäytettävät UI-komponentit
│   ├── Admin/         # Komponentit admin-näkymiin (esim. käyttäjien hallinta)
│   ├── auth/          # Autentikointiin liittyvät komponentit (esim. LoginButton)
│   ├── Comments/      # Kommentointiin liittyvät komponentit (lista, lomake)
│   ├── Layout/        # Sivupohjaan liittyvät komponentit (esim. Sidebar, Header)
│   ├── Notifications/ # Ilmoituskomponentit (esim. NotificationDropdown)
│   ├── Tickets/       # Tiketteihin liittyvät komponentit (lista, kortti, lomake, yksityiskohdat)
│   ├── ui/            # Shadcn/UI:hin perustuvat yleiset UI-elementit (Button, Input, Card, jne.)
│   └── User/          # Käyttäjäprofiiliin ja -asetuksiin liittyvät komponentit
├── config/            # Konfiguraatiotiedostot
│   └── msal.js        # MSAL-kirjaston konfigurointi (clientId, authority, jne.)
├── hooks/             # Custom React Hookit
│   └── useSocket.js   # Hook Socket.IO-yhteyden ja tapahtumien hallintaan
├── index.css          # Globaalit CSS-tyylit (sis. Tailwind base/components/utilities)
├── lib/               # Shadcn/UI:n generoimat apufunktiot (esim. `cn` tyylien yhdistämiseen)
│   └── utils.js
├── main.jsx           # Sovelluksen käynnistyspiste, jossa `App` renderöidään DOMiin.
├── pages/             # Sivukohtaiset pääkomponentit (reittien kohdekomponentit)
│   ├── AdminDashboard.jsx
│   ├── LoginPage.jsx
│   ├── MyTicketsPage.jsx
│   ├── SettingsPage.jsx
│   ├── SupportDashboard.jsx
│   ├── TicketDetailPage.jsx
│   └── UserDashboard.jsx
├── providers/         # React Context Providerit
│   └── AuthProvider.jsx # Hallinnoi autentikointitilaa ja tarjoaa sen lapsikomponenteille
├── services/          # Backend API -palvelukutsut
│   ├── authService.js   # Autentikointiin liittyvät API-kutsut
│   ├── ticketService.js # Tiketteihin liittyvät API-kutsut (CRUD)
│   └── ... (muut palvelut tarpeen mukaan, esim. commentService, notificationService)
└── utils/             # Yleiskäyttöiset apufunktiot
    └── api.js         # Axios-instanssin konfigurointi (baseURL, headerit, interceptorit) 
```

## Keskeiset Toiminnallisuudet ja Toteutus

*   **Autentikointi:** `msal.js` konfiguroi MSAL-instanssin Azure AD -sovelluksen tiedoilla. `AuthProvider` käyttää `@azure/msal-react`-hookeja (kuten `useMsal`, `useIsAuthenticated`) kirjautumisen ja uloskirjautumisen hoitamiseen sekä käyttäjätietojen (nimi, sähköposti, rooli) hakemiseen ja tallentamiseen Contextiin. Backendistä saatu JWT-token tallennetaan (esim. `localStorage` tai muistiin) ja liitetään automaattisesti `api.js`:n kautta lähteviin pyyntöihin `Authorization`-headerissa.
*   **Reititys:** `App.jsx` määrittelee reitit käyttäen `react-router-dom`-komponentteja (`BrowserRouter`, `Routes`, `Route`). Osa reiteistä on suojattuja (`ProtectedRoute`-komponentti, joka tarkistaa autentikointitilan `AuthProvider`:sta) ja ohjaa kirjautumattomat käyttäjät kirjautumissivulle (`LoginPage`). Reitit ohjaavat käyttäjän eri `pages`-kansion komponentteihin URL-polun perusteella.
*   **Tilan hallinta:**
    *   Globaali autentikointitila (`isAuthenticated`, `user`) jaetaan `AuthProvider`-Contextin kautta.
    *   Palvelimelta haettava data (tiketit, kommentit, käyttäjät) haetaan ja hallitaan `TanStack Query`:n avulla `services`-kansion funktioiden kautta. Esimerkiksi `ticketService.getTickets()` kutsuu backendin API:a, ja `useQuery(['tickets'], ticketService.getTickets)` -hook `pages`- tai `components`-kansiossa hakee datan, hoitaa välimuistituksen ja taustapäivitykset.
    *   Lomakkeiden paikallista tilaa hallitaan tyypillisesti Reactin `useState`-hookilla.
*   **Komponentit:** Komponentit on pyritty pitämään pieninä ja fokusoituneina. `components/ui`-kansio sisältää Shadcn/UI:sta räätälöityjä tai suoraan käytettyjä peruskomponentteja. Ominaisuuskohtaiset komponentit (esim. `TicketList`, `CommentForm`) sijaitsevat omissa alikansioissaan (`components/Tickets`, `components/Comments`). `pages`-komponentit koostavat näitä pienempiä komponentteja kokonaisiksi sivunäkymiksi.
*   **Reaaliaikaisuus:** `useSocket`-hook alustaa Socket.IO-yhteyden backend-palvelimeen käyttäjän autentikoinnin jälkeen. Hook tarjoaa funktiot tapahtumien kuunteluun (`socket.on`) ja lähettämiseen (`socket.emit`, jos tarpeen). Esimerkiksi kuunnellaan `new_notification`-tapahtumaa ja päivitetään ilmoituskomponentin tilaa tai näytetään toast-ilmoitus `React Hot Toast`:lla.
*   **API-kommunikaatio:** `utils/api.js` luo ja konfiguroi keskitetyn Axios-instanssin, joka asettaa `baseURL`:n ja lisää automaattisesti JWT-tokenin `Authorization`-headeriin jokaiseen lähtevään pyyntöön (interceptorin avulla). `services`-kansion funktiot käyttävät tätä instanssia kommunikoidakseen backendin kanssa.

## Näkymät ja Polut

Sovelluksen keskeiset näkymät (sivut) ja niitä vastaavat URL-polut:

*   `/login`: **Kirjautumissivu** (`LoginPage.jsx`) - Hoitaa käyttäjän autentikoinnin MSAL:n avulla.
*   `/unauthorized`: **Ei Oikeuksia -sivu** (`Unauthorized.jsx`) - Näytetään, kun käyttäjällä ei ole riittäviä oikeuksia.
*   `/`: **Juuri (Uudelleenohjaus)** - Ohjaa autentikoidut käyttäjät `/my-tickets`-polkuun.
*   `/my-tickets`: **Omat Tiketit -sivu** (`MyTicketsPage.jsx`) - Näyttää sisäänkirjautuneen käyttäjän luomat tiketit.
*   `/tickets/:id`: **Tiketin Yksityiskohtasivu** (`TicketDetailPage.jsx`) - Näyttää tietyn tiketin tiedot ja kommentit.
*   `/my-work`: **Oma Työ -näkymä** (`MyWorkView.jsx`) - Tuki-/Admin-roolien dashboard, näyttää todennäköisesti heille osoitetut tiketit.
*   `/admin` / `/admin/tickets`: **Admin Tiketinhallintasivu** (`Tickets.jsx`) - Näyttää kaikki tiketit, mahdollisesti laajennetuilla suodatus-/hallintatoiminnoilla Admin/Support-rooleille.
*   `/ai-tools`: **AI-Työkalut -sivu** (`AITools.jsx`) - Käyttöliittymä AI-ominaisuuksille, kuten tikettien generointi, analysointi ja asetukset (vain Admin).
*   `/profile`: **Profiilisivu** (`ProfileView.jsx`) - Näyttää käyttäjän profiilitiedot.
*   `*`: **Catch-all (Uudelleenohjaus)** - Ohjaa kaikki tuntemattomat polut juureen (`/`).

## Käyttöliittymän Suunnittelumallit ja Tyylit

*   **UI-kirjasto:** Pääasiallisesti käytössä **Shadcn/UI**, joka rakentuu Radix UI -primitiivien päälle ja on tyylitelty Tailwind CSS:llä.
*   **Tyylit:** **Tailwind CSS** -kirjastoa käytetään koko sovelluksessa utility-first-tyylittelyyn.
*   **Layout:** Yhtenäistä sivupohjaa (`Layout.jsx`) käytetään useimmilla autentikoiduilla sivuilla, sisältäen todennäköisesti sivupalkin/navigaation ja pääsisältöalueen.
*   **Responsiivisuus:** Tailwind CSS mahdollistaa responsiivisen suunnittelun.
*   **Ilmoitukset:** `react-hot-toast` -kirjastoa käytetään toast-ilmoitusten näyttämiseen.
*   **Ikonit:** `lucide-react` -kirjastoa käytetään ikoneihin.
*   **Datan Haku/Tila:** Käytetään todennäköisesti `axios`-kirjastoa API-kutsuihin ja `@tanstack/react-query` -kirjastoa palvelimen tilan hallintaan, välimuistitukseen ja taustapäivityksiin.

## AI Settings

AI Settings -komponentti tarjoaa käyttöliittymän tekoälyagenttien toiminnan konfigurointiin. Admineille se mahdollistaa AI:n käyttäytymisen hienosäädön ilman koodimuutoksia.

### Sijainti Sovelluksessa
Komponentti sijaitsee AI Tools -sivun "AI-asetukset"-välilehdellä (`/ai-tools` URL-polku, välilehti "AI-asetukset"). Se on saatavilla vain ADMIN-rooleille.

### Komponentti (AISettings.jsx)
`AISettings.jsx` tarjoaa seuraavat ominaisuudet:

* **Chat Agent Version** - Valinta ModernChatAgentin ja perinteisen ChatAgentin välillä
* **Mallivalinnat** - Erillinen mallivalinta jokaiselle AI-agentille:
  * Chat Agent malli (dropdown)
  * Support Assistant malli (dropdown)
  * Ticket Generator malli (dropdown)
  * Summarizer Agent malli (dropdown)
* **Vihjesysteemi** - Kytkin vihjesysteemin päälle/pois kytkemiseen
* **Vihjekynnykset** - Konfiguroitavat kynnysarvot EARLY, PROGRESSING ja CLOSE tiloille
* **Lisäasetukset** - Cooldown-aika vihjeiden välillä ja maksimi vihjeiden määrä

### Käyttöliittymän ominaisuudet:
* **Reaaliaikainen muutosten seuranta** - Näyttää kun tallentamattomia muutoksia on
* **Toggle-kytkimet** - Yhdenmukaiset NotificationSettings-komponentin kanssa
* **Collapsible-osiot** - Lisäasetukset piilotettu oletuksena
* **Toast-ilmoitukset** - Palaute toiminnoista react-hot-toastilla
* **Validointi** - Numerokenttien min/max arvot tarkistetaan

### Tiedonhallinta:
* Hakee asetukset `GET /api/ai/settings` -rajapinnasta
* Päivittää asetukset `PUT /api/ai/settings` -rajapintaan
* Palauttaa oletukset `POST /api/ai/settings/reset` -rajapinnalla
* Vertaa muutoksia alkuperäisiin arvoihin tunnistaakseen tallentamattomat muutokset

## Token Analytics

Token Analytics -komponentti tarjoaa kattavan näkymän AI-agenttien token-käytöstä ja kustannuksista.

### Sijainti Sovelluksessa
Komponentti sijaitsee AI Tools -sivun "Token-seuranta"-välilehdellä (`/ai-tools` URL-polku). Saatavilla vain ADMIN-rooleille.

### Komponentti (TokenAnalytics.jsx)
`TokenAnalytics.jsx` tarjoaa seuraavat ominaisuudet:

#### Päänäkymä:
* **KPI-kortit** - Tokenien kokonaismäärä, kustannukset, pyynnöt, onnistumisprosentti
* **Päivittäinen käyttökaavio** - Line chart tokenien ja kustannusten kehityksestä
* **Agenttien käyttö** - Interaktiivinen piirakkakaavio, klikkaa nähdäksesi syväanalyysin
* **Top käyttäjät** - 5 aktiivisinta käyttäjää token-käytön mukaan
* **Mallijakauma** - Taulukko eri mallien käytöstä ja tehokkuudesta

#### Syväanalyysi (per agentti):
* **Suorituskyky** - Min/max/mediaani vastausajat
* **Token-tehokkuus** - Prompt/completion suhde, min/max tokenit
* **Kustannusanalyysi** - Halvin/kallein pyyntö, ROI per 1000 tokenia
* **Käyttöhistoria** - Viimeisten 20 pyynnön visualisointi
* **Pyyntötyypit** - Jakauma eri pyyntötyypeistä

#### Lisäanalyysit:
* **Tuntikohtainen käyttö** - 24h heatmap käyttöajoista
* **Virheanalyysi** - Epäonnistuneet pyynnöt agenteittain
* **Vastausaikajakauma** - Pyynnöt ryhmiteltyinä vastausajan mukaan
* **Yksityiskohtainen historia** - Hakusuodattimet ja taulukkonäkymä
* **Tehokkuusanalyysi** - Scatter plot mallien tehokkuudesta

### Tiedonhallinta:
* Käyttää `useTokenAnalytics`, `useDailyTokenUsage`, `useTopUsersByTokenUsage` ja `useTokenUsageSummary` hookeja
* Hakee datan `/ai/token-analytics` API-rajapinnoista
* Reaaliaikainen päivitys React Query:n avulla
* Suodattimet agentin, mallin ja pyyntötyypin mukaan

### Numeroformatointi:
* Tokenit näytetään tarkkana lukuna ilman pyöristyksiä
* Tuhaterotin suomalaisella formaatilla (välilyönti)
* Kustannukset 4 desimaalin tarkkuudella pienille summille

## AI Assistant Analytics

AI Assistant Analytics -komponentti tarjoaa interaktiivisen käyttöliittymän, jolla voidaan tarkastella ja analysoida AI-avustajan käyttöä, sen vaikutusta tikettien ratkaisuaikoihin ja tukihenkilöiden toimintaa.

### Sijainti Sovelluksessa

Komponentti sijaitsee AI Tools -sivun "Analytiikka"-välilehdellä (`/ai-tools` URL-polku, välilehti "Analytiikka"). Se on saatavilla vain ADMIN- ja SUPPORT-rooleille.

### Käyttöliittymän Osat

1. **Yhteenvetokortit**
   * Neljä numeerista KPI-mittaria yläosassa, jotka näyttävät:
     * Kokonaisinteraktioiden määrä
     * Tukihenkilöiden määrä, jotka käyttävät AI-avustajaa
     * Tikettien määrä, joissa AI-avustajaa on käytetty
     * Keskimääräinen tyytyväisyysaste
   * Kullakin KPI:llä on selkeä otsikko, arvo ja graafinen elementti

2. **Käyttötrendi**
   * Interaktiivinen pylväskaavio, joka näyttää:
     * AI-avustajan käyttömäärän ajan myötä tai vaihtoehtoisesti vastausajat
     * Vaihtopainike interaktioiden määrän ja vastausaikojen välillä
     * Keskiarvon havainnollistus vaakaviivalla
     * Hover-tilat, jotka näyttävät tarkat arvot
   * Aikajaksosuodatin (7/14/30/90 päivää)

3. **Tukihenkilöiden AI-avustajan Käyttö**
   * Taulukko tukihenkilöistä, joka näyttää:
     * Tukihenkilön nimi
     * Käyttömäärä
     * Keskimääräinen AI-vastausten arviointi
     * "Näytä tiedot" -painike kullekin tukihenkilölle
   * Painikkeesta avautuu modaali, jossa näkyy:
     * Interaktiot päivittäin (kaavio)
     * Vastausaikojen keskiarvo
     * Arvosanajakauma (palkkikaavio 1-5)
     * Yleisimmät AI-avustajalle esitetyt kysymykset

4. **Kategoria-analyysi**
   * Piirakkakaavio, joka näyttää AI-avustajan käytön jakautumisen eri tikettikategorioihin
   * Selkeät selitteet ja prosenttiosuudet

5. **Ratkaisuaikojen Vertailu**
   * Korttimuotoinen vertailu, joka näyttää:
     * Keskimääräinen ratkaisuaika AI-avustajan kanssa
     * Keskimääräinen ratkaisuaika ilman AI-avustajaa
     * Prosentuaalinen parannus
   * Visualisointi, joka käyttää sopivaa mittayksikköä (tunteja tai minuutteja)
   * Tuki myös negatiivisten parannusprosenttien visualisointiin

6. **Vastausaikatilastot**
   * Taulukko ja/tai visualisointi, joka näyttää AI-avustajan vastausaikojen persentiilitilastot (50%, 75%, 90%, 95%, 99%)
   * Keskimääräinen ja nopein vastausaika

### Tekniset yksityiskohdat

* **Datakyselyt:** Komponentti käyttää `AIAnalyticsService`-palvelua, joka tekee kutsut backend-API:n `/api/ai-analytics/*` päätepisteisiin.
* **Kaaviot:** Visualisoinnit toteutetaan [Recharts](https://recharts.org/)-kirjastolla.
* **Modaali:** Tukihenkilön yksityiskohtainen näkymä avataan `Dialog`-komponentilla (Shadcn/UI).
* **Aikasuodatus:** Aikavälisuodatus (7d/14d/30d/90d) toteutetaan `RadioGroup`-komponentilla, joka päivittää dataa muutoksen yhteydessä.
* **Virheiden Käsittely:** Komponentti näyttää selkeitä virheilmoituksia, jos API-kutsut epäonnistuvat.
* **Latausilmaisimet:** Datahakujen aikana näytetään `Skeleton`-latausilmaisimet.

### Koodirakenne

```plaintext
├── components/
│   ├── Admin/
│   │   ├── AIAssistantAnalytics.jsx     # Pääkomponentti
│   │   ├── analytics/
│   │   │   ├── AnalyticsSummaryCards.jsx  # KPI-kortit
│   │   │   ├── UsageTrendChart.jsx     # Käyttötrendi-kaavio
│   │   │   ├── AgentUsageTable.jsx     # Tukihenkilöiden käyttötaulukko
│   │   │   ├── AgentDetailsModal.jsx   # Tukihenkilön yksityiskohdat
│   │   │   ├── CategoryDistribution.jsx # Kategoria-analyysi
│   │   │   ├── ResolutionComparison.jsx # Ratkaisuaikojen vertailu
│   │   │   └── ResponseTimeStats.jsx   # Vastausaikatilastot
```

### Toiminnallisuus

1. **Datalataus:**
   * Komponentti hakee datan `useEffect`-hookissa.
   * Käyttää `react-query`-kirjastoa hallitsemaan data-lukujen tilaa (loading, error, data).
   * Datan päivitys aika-asetuksen muuttuessa.

2. **Interaktiivisuus:**
   * Aikajakson valinta muuttaa kaikkien kaavioiden dataa.
   * Tukihenkilön lisätietojen näyttäminen modaalissa "Näytä tiedot" -painikkeesta.
   * Käyttötrendin vaihto interaktioiden ja vastausaikojen välillä.
   * Hover-tilat lisätietojen näyttämiseen kaavioissa.

3. **Toimiva "Näytä tiedot" -painike:**
   * Hakee agentID:n oikeasta kohdasta käyttäjätietoja ja välittää sen modaalille.
   * Modaali tekee oman API-kutsunsa `/api/ai-analytics/agents/:agentId/details` päätepisteeseen.
   * Näyttää yksityiskohtaista dataa agentin AI-käytöstä.

4. **Ratkaisuaikojen näyttäminen:**
   * Näyttää sopivan yksikön (tunnit tai minuutit) ratkaisuajoille.
   * Käsittelee myös tapaukset, joissa AI-avustajan käyttö ei paranna ratkaisuaikaa.

// ... existing code ... 