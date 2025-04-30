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
*   **Tapahtumien Kuuntelu:** Hook palauttaa `socket`-instanssin, jota komponentit (esim. `NotificationDropdown`) voivat käyttää kuunnellakseen tapahtumia (`socket.on('notification', handler)`).
*   **Tilan Päivitys:** Vastaanotetut tapahtumat päivittävät relevanttia UI-tilaa (esim. lisäämällä ilmoituksen listaan, näyttämällä toastin).
*   **Yhteyden Tila:** Hook voi myös palauttaa yhteyden tilan (connected/disconnected), jota UI voi hyödyntää.

### Kommenttien @-maininta
*   **Toteutus:** Todennäköisesti käytetään kirjastoa kuten `react-mentions` tai vastaavaa tekstieditorikomponentissa (`CommentForm`).
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
*   `/ai-tools`: **AI-Työkalut -sivu** (`AITools.jsx`) - Käyttöliittymä AI-ominaisuuksille, kuten tikettien generointi ja analysointi (vain Admin).
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