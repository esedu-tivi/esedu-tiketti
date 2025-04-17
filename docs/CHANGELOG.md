# Changelog

Kaikki merkittävät muutokset tähän projektiin dokumentoidaan tässä tiedostossa.

# 17.04.2025 - feat: Parannettu tiketin poistoprosessia ja käyttöliittymää + bulk-generointi AI-tiketeille
- **Käyttöliittymän parannukset (TicketList):**
  - Korvattu tiketin poiston vahvistusdialogi (`AlertDialog`) `react-hot-toast`-ilmoituksella, joka sisältää vahvistus- ja peruutuspainikkeet.
  - Korjattu `AlertDialog`-importtivirhe ja parannettu käyttökokemusta poiston vahvistuksessa.
  - Varmistettu `authService.acquireToken()`-metodin käyttö tokenin hakemiseen poisto-operaatiossa `localStorage`:n sijaan.
- **Backendin korjaukset (Ticket Deletion):**
  - Muokattu `ticketService.deleteTicket`-funktiota merkittävästi vankemmaksi.
  - Varmistettu, että kaikki tikettiin liittyvät tietueet (Kommentit, Liitetiedostot tietokannasta, Mahdolliset KnowledgeArticlet AI-tiketeille) poistetaan *ennen* itse tiketin poistamista.
  - Kaikki poistotoiminnot suoritetaan nyt yhden Prisma-transaktion (`prisma.$transaction`) sisällä atomisuuden takaamiseksi.
  - Lisätty toiminnallisuus poistamaan myös liitetiedostot palvelimen tiedostojärjestelmästä (`fs.unlink`) osana transaktiota.
  - Korjattu `P2003` (Foreign key constraint violation) -virheet, jotka saattoivat ilmetä kommenttien tai liitetiedostojen takia.
  - Estetty orpojen tietueiden (kommentit, liitteet, knowledge articles) ja tiedostojen jääminen järjestelmään tiketin poiston jälkeen.
  Tikettigeneraattori:
    - **Bulk-generointi:**
    - Lisätty määrä-kenttä (`ticketCount`), jolla voi generoida useita tikettejä kerralla.
    - Esikatselunäkymä näyttää nyt listan generoiduista tiketeistä.
    - Vahvistus luo kaikki jäljellä olevat esikatsellut tiketit kerralla.
  - **Esikatselun hallinta:**
    - Lisätty "Poista"-painike jokaiseen esikatselukohtaan, jolla voi poistaa ei-toivotut tiketit ennen vahvistusta.
    - Lisätty "Generoi uudelleen"-painike jokaiseen esikatselukohtaan, jolla voi generoida kyseisen tiketin ja ratkaisun uudelleen.
  - **Käyttöliittymäparannukset:**
    - Luotujen tikettien listassa "Avaa"-painike avaa nyt `TicketDetailsModal`-ikkunan uuden sivun sijaan.
    - Lokit tyhjennetään nyt automaattisesti, kun uusi generointi aloitetaan.
    - Päivitetty painikkeiden tekstejä ja tiloja vastaamaan bulk-toiminnallisuutta.
    - Estetty tiketin osoitus tukihenkilölle, jos generoidaan useampi kuin yksi tiketti.

# 16.04.2025 - feat: Lisätty esikatselu- ja vahvistusvaihe AI-tikettien luontiin
- **AI-tikettien luonnin työnkulku:**
  - Muokattu tiketin luontia sisältämään esikatseluvaiheen ennen tallennusta.
  - Admin/Tukihenkilö luo nyt ensin esikatselun ja vahvistaa sen jälkeen tiketin luonnin.
  - Ratkaisu luodaan nyt *esikatseluvaiheessa* ja näytetään käyttäjälle.
  - Backend API jaettu `/generate-ticket-preview`- ja `/confirm-ticket-creation`-päätepisteisiin.
  - Frontend (`AITicketGenerator.jsx`) päivitetty käsittelemään kaksivaiheisen prosessin (esikatseludata, vahvista/peruuta-painikkeet).
- **AI-kontekstin parannukset:**
  - `userProfile` (student, teacher, jne.) käännetään nyt suomeksi ennen sen käyttöä prompteissa sekä `TicketGeneratorAgent`- että `ChatAgent`-agenteille paremman kontekstuaalisen tarkkuuden saavuttamiseksi.
- **Backend (`TicketGeneratorAgent`):**
  - Lisätty uusi metodi `generateSolutionForPreview` luomaan ratkaisu raakadatan perusteella (ilman tallennettua ID:tä).
  - Alkuperäinen `generateSolution(ticketId)`-metodi säilytetty on-demand-generointia varten erillisen päätepisteen (`/api/ai/tickets/:ticketId/generate-solution`) kautta.
  - Lisätty kattava `console.debug`-lokitus agentin suorituksen seurantaan, mukaan lukien lopulliset LLM-syötteet.
- **Virheenkorjaukset:**
  - Korjattu `toast.info is not a function` -virhe `AITicketGenerator.jsx`:ssä korvaamalla se standardilla `toast()`-kutsulla.

# 14.04.2025 - feat: Parannettu AI-tikettianalyysiä ja lisätty yhteenvetoagentti
- **Tikettien analyysin käyttöliittymäparannukset:**
  - Korvattu sivulla olleet suodattimet modaali-ikkunalla ("Suodattimet").
  - Lisätty suodatusvaihtoehdot dialogiin: Kategoria, Vastuuhenkilö (automaattitäydennyksellä), Tila, AI-interaktioiden vähimmäismäärä, Luontipäivämääräväli.
  - Lisätty dialogiin "Tyhjennä suodattimet" -painike.
  - Toteutettu taulukon sarakkeiden lajittelu (Otsikko, Kategoria, Vastuuhenkilö, Luotu, Tila, AI Interaktiot).
  - Toteutettu sivutus tikettilistalle.
  - Lisätty yhteenvetotilastojen osio taulukon yläpuolelle (Tikettejä yhteensä, Keskim. AI Interaktiot, Tikettien jakauma tilan mukaan).
- **AI-keskustelun yhteenveto:**
  - Lisätty ominaisuus AI-yhteenvetojen luomiseksi tikettikeskusteluista Keskustelu-modaalissa.
  - Yhteenvedon luonti käynnistetään painikkeella laajennettavassa osiossa.
  - Luodut yhteenvedot tallennetaan `Ticket`-mallin `aiSummary`-kenttään.
  - Toteutettu yhteenvedon uudelleengenerointi.
  - Suodatettu järjestelmäviestit pois yhteenvedon AI:lle annettavasta keskusteluhistoriasta.
  - Annettu tiketin nykyinen tila yhteenvedon AI:lle paremman kontekstin saamiseksi.
- **Uusi agentti: SummarizerAgent:**
  - Luotu `SummarizerAgent` (`backend/src/ai/agents/summarizerAgent.ts`) käsittelemään keskusteluyhteenvetojen logiikkaa.
  - Luotu `CONVERSATION_SUMMARY_PROMPT` (`backend/src/ai/prompts/conversationSummaryPrompt.ts`).
  - Refaktoroitu backend-kontrolleri (`aiController.ts`) käyttämään uutta agenttia.
- **Backend-päivitykset:**
  - Muokattu `/api/ai/analysis/tickets` -päätepistettä tukemaan uusia suodattimia, lajittelua ja sivutusta, sekä palauttamaan aggregaatit/sivutustiedot.
  - Lisätty Prisma-migraatio lisäämään `aiSummary`-kenttä `Ticket`-malliin.
  - Lisätty `/api/ai/tickets/:id/summarize` -päätepiste.
  - Päivitetty `/api/ai/analysis/tickets/:ticketId/conversation` -päätepiste palauttamaan tallennettu yhteenveto.
- **Frontend-päivitykset:**
  - Päivitetty `AiTicketAnalysis.jsx` sisältämään suodatindialogin integraation, tilastojen näytön, lajittelukäsittelijät, sivutuksen integraation.
  - Luotu `FilterDialog.jsx` ja `PaginationControls.jsx` -komponentit.
  - Päivitetty `ConversationModal.jsx` käsittelemään yhteenvedon näyttämisen, luonnin, tallennuksen ja uudelleengeneroinnin laajennettavassa osiossa.

# 14.04.2025 - feat: Lisätty AI-tikettianalyysi-välilehti
- Lisätty uusi "Tikettien analyysi" -välilehti AI Tools -sivulle Admin-käyttäjille.
- Välilehti näyttää listan AI-generoiduista tiketeistä.
- Adminit voivat tarkastella tukihenkilöiden ja ChatAgentin välistä keskusteluhistoriaa kullekin AI-tiketille modaalin kautta.
- Lisätty arviointimerkit (EARLY, PROGRESSING, CLOSE, SOLVED, ERROR) AI-kommentteihin keskustelumodaalissa, sisältäen tooltipit kunkin tilan selittämiseksi.
- Lisätty AI-generoidun oikean ratkaisun näyttö keskustelumodaaliin (laajennettava osio).
- Lisätty mahdollisuus avata ratkaisu erilliseen ikkunaan keskustelumodaalin viereen.
- Varmistettu responsiivinen suunnittelu modaalin ja ikkunan pinoamiseksi mobiililaitteilla.
- Käännetty käyttöliittymäelementit suomeksi.
- Toteutettu backend-päätepisteet (`/api/ai/analysis/tickets`, `/api/ai/analysis/tickets/:ticketId/conversation`, `/api/ai/tickets/:ticketId/solution`).
- Luotu/päivitetty frontend-komponentit (`AiTicketAnalysis.jsx`, `ConversationModal.jsx`, `SolutionWindow.jsx`) käyttäen Tailwind/Lucide/Axiosia.

# 10.04.2025 (Implemented chat agent for AI tickets and improved solution format)

- Toteutettu ChatAgent keskustelemaan tukihenkilöiden kanssa AI-generoiduissa tiketeissä:
  - Uusi tekoälyagentti, joka simuloi käyttäjää tikettikeskusteluissa
  - Agentti arvioi, kuinka lähellä tukihenkilön ehdotus on oikeaa ratkaisua
  - Agentti osoittaa tilanteeseen sopivia tunteita (turhautuminen, kiitollisuus) keskustelussa
  - Automaattinen aktivointi kun tukihenkilö kommentoi AI-generoitua tikettiä
  - Luotu dokumentaatio chatAgent-toiminnallisuudesta

- Parannettu tekoälyn tikettien ratkaisugeneraattoria:
  - Korjattu ongelma, jossa tikettigeneraattori ei määritellyt selkeästi mikä toimenpide lopulta ratkaisi ongelman
  - Luotu erillinen SOLUTION_GENERATOR_PROMPT-tiedosto parempaa modulaarisuutta varten
  - Päivitetty ratkaisupromptia sisältämään selkeä osio "Mikä lopulta korjasi ongelman"
  - Muokattu ratkaisun otsikkorakennetta sisältämään sekä ongelma että ratkaisu
  - Paranneltu ratkaisujen jäsentelyä analyysistä konkreettiseen ratkaisuun
  - Tehty tietokantaintegraatio tunnistamaan ja käyttämään ratkaisun otsikkomuotoa

# 10.04.2025 (Containerized backend application with Docker)

- Lisätty Docker-kontitus backend-sovellukselle:
  - Luotu Dockerfile backend-sovellukselle multi-stage buildilla
  - Päivitetty docker-compose.yml sisältämään sekä backend- että PostgreSQL-kontit
  - Siirretty tarvittavat kehitysriippuvuudet (@prisma/client, langchain, ym.) tuotantoriippuvuuksiksi Docker-kontissa
  - Toteutettu automaattinen tietokannan migraatioiden suoritus kontin käynnistyessä
  - Lisätty volumet tietokannan ja upload-tiedostojen persistoimiseksi
  - Päivitetty dokumentaatio Docker-konttien käytöstä (docs.md)

# 12.03.2025 (Improved AI documentation structure)

- Selkeytetty tekoälydokumentaation rakennetta:
  - Virtaviivaistettu ai-docs.md sisältöä poistamalla päällekkäisyyksiä
  - Tiivistetty tikettigeneraattorin kuvaus yleiseksi esittelyksi
  - Ohjattu käyttäjät erillisiin agenttidokumentteihin yksityiskohtia varten
  - Parannettu linkkejä dokumenttien välillä navigoinnin helpottamiseksi

# 12.03.2025 (Restructured AI agent documentation)

- Uudistettu tekoälyagenttien dokumentaatiorakennetta:
  - Luotu erillinen `ai-agents` hakemisto yksityiskohtaiselle agenttidokumentaatiolle
  - Siirretty tikettien generaattorin dokumentaatio omaan tiedostoonsa `ticketGenerator.md`
  - Luotu `index.md` hakemistosivu, joka listaa kaikki saatavilla ja tulevat agentit
  - Päivitetty pääasiallinen `ai-docs.md` dokumentaatio viittaamaan uuteen rakenteeseen
  - Parannettu dokumentaatiorakennetta tulevien agenttien lisäämisen helpottamiseksi

# 12.03.2025 (Fixed responseFormat parameter in AI ticket generator and improved documentation)

- Korjattu tekoälygeneraattorin vastausmuodon (responseFormat) käsittely:
  - Korjattu bug, jossa käyttäjän valitsemaa vastausmuotoa ei huomioitu
  - Lisätty responseFormat-parametrin validointi
  - Päivitetty aiController välittämään responseFormat-parametri agentille
  - Lisätty lokiviestit vastausmuodon käsittelyn seurantaan
- Paranneltu tekoälydokumentaatiota:
  - Luotu erillinen ai-agents.md -dokumentti tekoälyagenttien dokumentaatiota varten
  - Siirretty agenttien yksityiskohtainen dokumentaatio erilliseen tiedostoon
  - Päivitetty yleinen ai-docs.md viittaamaan uuteen agenttidokumentaatioon
  - Lisätty ohjeistusta vastausmuoto-ongelmien ratkaisuun

# 11.03.2025 (Korjattu tekoälytyökalujen kieliasetus ja konfiguraation käyttö)

- Paranneltu tekoälytyökalujen suomenkielistä toteutusta:
  - Muutettu tikettien generointipromptit tuottamaan sisältöä suomeksi
  - Lisätty selkeät ohjeet suomen kielen käyttöön prompteissa
  - Varmistettu asianmukaisen IT-terminologian käyttö suomeksi
- Optimoitu AI_CONFIG-konfiguraation hyödyntämistä:
  - Lisätty automaattinen prioriteettien määritys vaikeustason perusteella (helppo → LOW, jne.)
  - Implementoitu kuvauksen maksimipituuden rajoitus konfiguraation mukaisesti
  - Parannettu vastausformaatin validointia hyödyntäen konfiguraatiomäärityksiä
  - Lisätty virheenkäsittely puuttuville tai virheellisille parametreille
- Päivitetty tekoälytyökalujen dokumentaatiota (ai-docs.md):
  - Lisätty osio kieliasetusten selventämiseksi
  - Dokumentoitu konfiguraation käyttö tarkemmin
  - Lisätty esimerkkejä keskeisimmistä konfiguraatioasetuksista

# 11.03.2025 (Implemented AI ticket generator and tools infrastructure)

- Lisätty tekoälytyökalut järjestelmään:
  - Toteutettu AI-tikettien generointijärjestelmä koulutuskäyttöön (mahdollisuus generoida useita tikettejä kerralla).
  - Integroitu LangChain.js-kirjasto tekoälysovelluksia varten
  - Lisätty backend API tikettigeneraattorin käyttöön
  - Luotu käyttöliittymä AI-työkaluille (/ai-tools)
  - Näytetään AI-työkalujen linkit navigaatioissa admin- ja tukikäyttäjille
  - Lisätty kattava dokumentaatio tekoälyominaisuuksista (ai-docs.md)
- Paranneltu järjestelmän modulaarisuutta:
  - Erotettu tekoälykomponentit omiin tiedostoihinsa
  - Lisätty konfiguraatiojärjestelmä AI-mallin asetuksille
  - Toteutettu parametrisoitavat promptit tekoälyominaisuuksia varten

# 10.03.2025 (Optimized Microsoft Graph API profile picture integration)

- Optimized profile picture fetching to reduce API calls to Microsoft Graph:
  - Profile pictures are now cached in the database
  - Microsoft Graph API is only called when necessary:
    - When a user first logs in
    - Once a week during login to refresh the profile picture
    - Once a day when visiting the profile page (if needed)
  - Added frontend caching using localStorage to track last refresh time
- Improved loading performance by checking for cached profile pictures first
- Maintained the ability to display profile pictures throughout the application
- Added informative message on profile page about Microsoft synchronization

## 10.03.2025 (Integrated profile pictures with Microsoft Graph API)

- Modified the profile picture system to exclusively use Microsoft Graph API
- Added backend caching to store Microsoft profile pictures in the database
- Removed the ability for users to upload custom profile pictures
- Synchronizes profile pictures when users log in and visit their profile page
- Added profile pictures to user interfaces throughout the application
- Profile pictures are now displayed for all users across the system

## 10.03.2025 (Added jobTitle badges to User Management dialog)

- Lisätty käyttäjien ryhmätiedot (jobTitle) näkyviin käyttäjänhallintadialogiin
  - Ryhmätieto näytetään pienenä badgena käyttäjän nimen vieressä
  - Tieto haetaan Microsoft-kirjautumisen yhteydessä MSAL-tokenista
  - Tietokantarakennetta päivitetty tallentamaan jobTitle-kenttä
  - Hakutoiminto etsii myös ryhmätiedon perusteella
  - Toteutettu sekä työpöytä- että mobiiliversioissa
- Lisätty ryhmätieto myös käyttäjän profiilisivulle
  - Näytetään visuaalisena badgena roolitiedon vieressä
  - Lisätty myös profiilitietoihin omana kenttänään

## 10.03.2025 (Added search functionality to User Management dialog)

- Lisätty hakutoiminto käyttäjänhallintadialogiin
  - Mahdollisuus hakea käyttäjiä nimen tai sähköpostin perusteella
  - Hakukenttä ja tulosten suodatus reaaliajassa
  - Hakutulosten määrän näyttäminen
  - Hakutulosten tyhjentäminen -painike
  - Tyylitelty yhtenäisesti muun käyttöliittymän kanssa

## 10.03.2025 (Added User Management button for admins in mobile view)

- Lisätty Käyttäjänhallinta-painike admin-käyttäjille mobiilinavigaatioon
  - Painike avaa käyttäjänhallintadialogin suoraan mobiilinavigaatiosta
  - Muokattu mobiilinavigaation asettelua admin-käyttäjille (5 painiketta 4:n sijaan)
  - Varmistettu yhtenäinen käyttökokemus työpöytä- ja mobiiliversioiden välillä

## 09.03.2025 (Improved media comment handling in tickets)

- Paranneltu mediakommenttien työnkulkua tiketeissä:
  - Tukihenkilöiden on nyt lisättävä mediavastaus (kuva/video) ensin ennen tekstikommentteja tiketeissä, jotka vaativat mediaa
  - Lisätty selkeä käyttäjäpalaute, kun yritetään lisätä tekstikommenttia ennen mediaa
  - Toteutettu automaattinen tunnistus, kun mediavastaus on jo annettu
- Lisätty mediakommenttien tuki tiketin luojille: 
  - Tiketin luojat voivat nyt lisätä kuvia ja videoita kommentteihin missä tahansa vaiheessa tiketin käsittelyä
  - Paranneltu mediasisällön näyttämistä kommenteissa selkeämmäksi
- Paranneltu virheenhallintaa kommentoinnissa:
  - Lisätty käyttäjäystävälliset virheilmoitukset suoraan käyttöliittymään
  - Tarkennettu ohjeistus median lisäämisestä selkeämmäksi
  - Pidennetty virheilmoitusten näyttöaikaa käyttökokemuksen parantamiseksi

## 09.03.2025 (Added profile pictures and improved responsiveness)

- Lisätty Microsoft-profiilikuvien tuki käyttäjille käyttäen Microsoft Graph API:a
- Toteutettu profiilikuvien näyttäminen headerissa, käyttäjäprofiilissa ja kommenteissa
- Lisätty automaattinen fallback käyttäjien nimikirjaimiin, jos profiilikuvaa ei ole saatavilla
- Parannettu tiketinnäkymän responsiivisuutta mobiililaitteilla
- Uudistettu kommenttiosion ulkoasua profiilikuvien kanssa selkeämmäksi
- Paranneltu toimintovalikkoa (dropdown) mobile-käyttöliittymässä
  - Lisätty fullscreen-overlay mobiililaitteilla
  - Siirretty valikko näytön alalaitaan mobiililaitteilla
  - Suurennettu painikkeiden kokoa kosketuskäyttöä varten
  - Lisätty sulkemispainike mobiiliversioon
- Parannettu kaikkien lomakkeiden ja komponenttien responsiivisuutta eri näyttökoilla
- Muokattu ilmoitusasetuksia selkeämmiksi ja responsiivisemmiksi

## 09.03.2025 (Improved ticket actions with dropdown menu)

- Lisätty dropdown-valikko tiketin toiminnoille (Vapauta, Siirrä toiselle, Merkitse ratkaistuksi, Sulje tiketti)
- Parannettu käyttöliittymän tilankäyttöä korvaamalla useat painikkeet yhdellä toimintovalikolla
- Toteutettu responsiivinen dropdown-ratkaisu, joka toimii hyvin mobiililaitteilla
- Lisätty kuvakkeet kaikille toiminnoille selkeyttämään käyttöliittymää
- Yhtenäistetty tiketin toimintojen käyttöliittymä sekä TicketDetailsModal- että TicketPage-komponenteissa

## 09.03.2025 (Made user management dialog responsive on mobile)

- Päivitetty käyttäjien hallintadialogia responsiiviseksi mobiililaitteilla
- Lisätty korttipohjainen näkymä mobiililaitteille taulukkonäkymän sijaan
- Optimoitu painikkeiden asettelu pienillä näytöillä
- Parannettu dialogin kokoa ja padding-arvoja eri näyttöko'oilla
- Lisätty mediakyselyt (media queries) responsiisuuden varmistamiseksi

## 03.03.2025 (Enhanced support staff permissions for media comments)

- Parannettu tukihenkilöiden työnkulkua sallimalla kaikille tukihenkilöille mediakommenttien (kuvat, videot) lisääminen tiketteihin riippumatta siitä, onko tiketti heille osoitettu
- Päivitetty käyttöliittymä näyttämään mediakommenttipainike kaikille tukihenkilöille kaikkien tikettien yhteydessä
- Poistettu rajoitus, joka vaati tiketin osoittamista tukihenkilölle ennen mediakommenttien lisäämistä
- Tukihenkilöt voivat nyt helpommin auttaa toisiaan jakamalla visuaalista materiaalia kaikkiin tiketteihin
- Päivitetty dokumentaatio vastaamaan uutta ominaisuutta (API-dokumentaatio ja README.md)

## 03.03.2025 (Implemented attachment functionality for ticket creation)

- Lisätty mahdollisuus liittää tiedostoja tiketteihin sitä luodessa
- Parannettu liitetiedostojen näyttämistä tikettinäkymissä:
  - Ammattimainen ulkoasu liitetiedostoille grid-layoutilla
  - Kuvien esikatselu suoraan tiketissä ilman uuteen välilehteen siirtymistä
  - Kuvien lightbox-näkymä, joka mahdollistaa kuvien katselun täysikokoisena
  - Hover-efektit ja animaatiot käyttökokemuksen parantamiseksi
  - Tiedostotyypin mukaan mukautuva näkymä (kuvat, videot, muut tiedostot)
  - Yhtenäinen tiedostojen käsittely sekä TicketPage että TicketDetailsModal -komponenteissa

## 03.03.2025 (Implemented media response functionality for ticket comments)

- Lisätty mediaUrl ja mediaType -kentät Comment-malliin mediatiedostojen viittauksia varten
- Luotu tiedostojen lähetysjärjestelmä multer-kirjaston avulla kuvien ja videoiden käsittelyyn
- Toteutettu backend-reitit ja kontrollerit mediakommenttien käsittelyyn
- Päivitetty CommentSection-komponentti näyttämään mediasisältöä (kuvat ja videot)
- Lisätty käyttöliittymä tukihenkilöille mediatiedostojen lähettämiseen kun tiketti vaatii KUVA- tai VIDEO-vastauksen
- Parannettu kommenttien näyttämistä näyttämään asianmukaiset mediaformaatit
- Lisätty validointi varmistamaan, että tukihenkilöt vastaavat oikealla mediaformaatilla tiketin vaatimusten mukaisesti

# 03.03.2025 (Improved TicketPage and mention functionality)

### Added
- Päivitetty TicketPage-komponentti vastaamaan TicketDetailsModal-toiminnallisuutta:
  - Lisätty tiketin tilan hallinta
  - Lisätty API-mutaatiot tiketin päivittämiseen
  - Lisätty aikamäärittelyt ja formatointi
  - Lisätty tiketin kontrollit (vapauta, ratkaise, sulje, siirrä)
  - Lisätty CommentSection-komponentti
  - Lisätty Timeline-komponentti
  - Lisätty käyttöliittymän parannukset ja tyylit

### Changed
- Uudistettu @-maininta toiminnallisuus:
  - Yksinkertaistettu mainintalogiikka
  - Pakollinen valinta pudotusvalikosta
  - Selkeämpi visuaalinen erottelu mainituille käyttäjille
  - Parannettu CSS-tyylejä mainintoja varten
  - Lisätty nollalevyinen välilyönti (zero-width space) mainintojen erottamiseksi
  - Päivitetty regex-kaavat mainintojen tunnistamiseen

### Fixed
- Korjattu ongelma, jossa maininnat eivät toimineet oikein tekstin seuratessa niitä
- Korjattu mainintojen visuaalinen duplikaatio
- Korjattu ongelma, jossa käyttäjä jäi "maininta-tilaan" käyttäjän valinnan jälkeen
- Yksinkertaistettu mainintojen CSS-tyylejä

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

## [Unreleased]

## [YYYY-MM-DD] - Short description of changes

### Added
- Added documentation for configuring frontend subdirectory deployment in `docs/docs.md`.

### Changed
- Configured Vite (`frontend/vite.config.js`) with `base: '/tiketti/'` for subdirectory deployment.

### Fixed
- Resolved 404 errors for frontend assets when served from a subdirectory.
