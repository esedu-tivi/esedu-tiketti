# Changelog

Kaikki merkittävät muutokset tähän projektiin dokumentoidaan tässä tiedostossa.

# 09.05.2025 - fix: Parannettu AI-assistentin palautteenkäsittelyä latauksen jälkeen

- **Ongelma:** Käyttäjä pystyi antamaan palautetta samaan viestiin useita kertoja, jos chat-ikkuna suljettiin ja avattiin uudelleen välissä. Myös alun perin ladatuille viesteille palautteenanto ei toiminut, koska `interactionId` puuttui.
- **Korjaukset (Frontend - `SupportAssistantChat.jsx`):
  - Lisätty `messageToInteractionMap`-tila seuraamaan viestien ja niiden `interactionId`:iden välistä yhteyttä.
  - Muokattu `parseConversationHistory`-funktiota erottelemaan `interactionId` viestihistoriasta (jos tallennettu muodossa `[interaction:uuid]`).
  - `handleFeedback`-funktio käyttää nyt ensisijaisesti viestikohtaista `interactionId`:tä `messageToInteractionMap`:sta tai toissijaisesti `currentInteractionId`:tä.
  - Laajennettu `loadConversationHistory`-funktiota hakemaan myös tiketin aiemmin annetut palautteet (`supportAssistantService.getFeedbackHistory`).
  - `messageFeedback`-tila päivitetään nyt myös haetulla palautetiedolla, estäen jo palautetun viestin uudelleenarvioinnin.
  - Palautteen lähetys estetään nyt, jos `messageFeedback`-tilasta löytyy jo merkintä kyseiselle `interactionId`:lle.
- **Korjaukset (Frontend - `supportAssistantService.js`):
  - Lisätty uusi funktio `getFeedbackHistory(ticketId)` hakemaan palvelimelta kaikki tikettiin liittyvät annetut palautteet.
- **Korjaukset (Backend - `aiController.ts`):
  - `getSupportAssistantResponse`-metodia muokattu siten, että se tallentaa nyt `interactionId`:n osaksi keskusteluhistoriaa käyttäen merkintää `[interaction:uuid] Assistantin vastauksen perässä.
  - Korjattu `getFeedbackByTicket`-funktiossa virhe, jossa yritettiin hakea `updatedAt`-kenttää, jota ei ole olemassa `AIAssistantInteraction`-mallissa. Kenttä vaihdettu `createdAt`-kenttään ja palautetaan frontendille `timestamp`-nimellä.
  - Korjattu `getFeedbackByTicket`-funktion `prisma.AIAssistantInteraction`-mallinimen kirjainkoko vastaamaan Prisma-skeemaa (`aIAssistantInteraction`).
- **Korjaukset (Backend - `aiAnalyticsController.ts`):
  - Lisätty uusi kontrollerifunktio `getFeedbackByTicket` hakemaan kaikki tiettyyn tikettiin liittyvät vuorovaikutukset, joille on annettu palaute.
  - Korjattu `AIAssistantInteraction`-mallinimen kirjainkoko vastaamaan Prisma-skeemaa (`aIAssistantInteraction`) `getFeedbackByTicket`-funktiossa.
- **Korjaukset (Backend - `aiAnalyticsRoutes.ts`):
  - Lisätty uusi reitti `GET /interactions/feedback/ticket/:ticketId` kutsumaan `aiAnalyticsController.getFeedbackByTicket`.
- **Dokumentaation päivitys:**
  - Lisätty uusi päätepiste `GET /ai-analytics/interactions/feedback/ticket/:ticketId` tiedostoon `new_docs/api-endpoints.md`.

# 09.05.2025 - feat: Lisätty tukihenkilöassistenttiin keskusteluhistorian tallennus ja palautus

- **SupportAssistantAgent - Toiminnallisuuden laajennus:**
  - Toteutettu tietokannan taulurakenne keskusteluhistorian tallentamiseen (`SupportAssistantConversation`).
  - Implementoitu backend-logiikka keskusteluhistorian tallentamiseen, noutamiseen ja tyhjentämiseen.
  - Keskusteluhistoria pysyy nyt tallessa tikettien välillä ja ratkaisun löytäminen on kumulatiivinen prosessi.
  - Tukihenkilö voi nyt jatkaa keskustelua aiemmin aloitetusta kohdasta, vaikka välillä sulkisi sovelluksen.
  - Keskustelun tyhjennys-toiminto tyhjentää keskustelun nyt myös tietokannasta.
- **Backend-toteutus:**
  - Luotu uusi tietokantataulun malli `SupportAssistantConversation` Prisma-skeemaan.
  - Lisätty uudet API-päätepisteet keskusteluhistorian noutamista ja tyhjentämistä varten.
  - Muokattu nykyistä tukihenkilöassistenttirajapintaa käyttämään ja päivittämään keskusteluhistoriaa.
- **Frontend-toteutus:**
  - Luotu uusi `supportAssistantService.js` API-kommunikointia varten.
  - Päivitetty `SupportAssistantChat.jsx` hakemaan keskusteluhistoria automaattisesti avatessa.
  - Toteutettu keskusteluhistorian parsiminen viestiobjekteiksi.
  - Tiketin tyhjennys-painike tyhjentää nyt sekä paikallisen että palvelimella olevan keskusteluhistorian.
  - Lisätty latausanimaatio keskusteluhistorian hakemisen ajaksi.
- **Dokumentaation päivitys:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` kuvaamaan uusia API-päätepisteitä.
  - Lisätty kuvaus keskusteluhistorian tallennuksen ja tyhjentämisen toiminnallisuudesta.
  - Merkitty aiemmin listattuna ollut "lisättävä ominaisuus" valmiiksi.

# 09.05.2025 - feat: SupportAssistantAgentille lisätty keskustelumuisti oman dialoginsa osalta

- **SupportAssistantAgent - Toiminnallisuuden laajennus:**
  - Agentti ottaa nyt vastaan oman aiemman keskusteluhistoriansa opiskelijan kanssa (`studentAssistantConversationHistory`) osana promptin syötettä.
  - Tämä mahdollistaa agentille paremman kontekstin ylläpidon, aiemmin annettuihin neuvoihin viittaamisen ja itsensä toistamisen välttämisen saman session aikana.
  - Muutokset tehty `SupportAssistantAgent.ts` (parametrin lisäys) ja `supportAssistantPrompt.ts` (uusi kenttä ja ohjeistus).
- **Dokumentaation päivitys:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` kuvaamaan uutta keskustelumuistia ja sen vaikutusta toimintaan.
  - Lisätty huomio tarvittavista backend-muutoksista tämän historian keräämiseksi ja välittämiseksi agentille.
- **Huom:** Tämä on osittainen toteutus. Agentti on valmis vastaanottamaan historian, mutta backend-logiikka historian keräämiseksi `AIAssistantInteraction`-tietueista ja välittämiseksi agentille tulee vielä toteuttaa erikseen.

# 09.05.2025- fix: SupportAssistantAgent huomioi nyt eksplisiittisemmin ChatAgent-keskustelun

- **SupportAssistantAgent - Promptin tarkennus:**
  - Lisätty ohjeistus (`backend/src/ai/prompts/supportAssistantPrompt.ts`) agentille mainitsemaan vastauksensa alussa, kun se huomioi uutta tietoa opiskelijan ja ChatAgentin (loppukäyttäjän simulaatio) välisestä keskusteluhistoriasta. Tämä parantaa dialogin luonnollisuutta.

# 09.05.2025 - fix: Edelleen tarkennettu SupportAssistantAgent-promptia proaktiivisemmaksi

- **SupportAssistantAgent - Promptin lisätarkennus:**
  - Vahvistettu ohjeistusta (`backend/src/ai/prompts/supportAssistantPrompt.ts`) niin, että agentti tarjoaa selkeämmin konkreettisia ensiaskeleita, kun opiskelija on jumissa tai kysyy yleisluontoista apua. Vältetään tilanteita, joissa agentti vastaa vain avoimilla vastakysymyksillä.
  - Muokattu promptin aloituskohtaa, ohjetta #1 ja lopun toimintakehotusta korostamaan tätä proaktiivista ensiaskelten ehdottamista.

# 09.05.2025 - fix: Hienosäädetty SupportAssistantAgent-promptia yhteistyöhaluisemmaksi

- **SupportAssistantAgent - Promptin tarkennus:**
  - Päivitetty prompt (`backend/src/ai/prompts/supportAssistantPrompt.ts`) ohjeistamaan agenttia olemaan aktiivisempi ehdottamaan seuraavia vianetsintäaskeleita ja toimimaan enemmän yhteistyökumppanina opiskelijan kanssa.
  - Tavoitteena on tasapainottaa ohjaavat kysymykset konkreettisilla neuvoilla, jotta opiskelija etenee ongelmanratkaisussa eikä koe agenttia pelkästään kyselijänä.
- **Dokumentaation päivitys:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` heijastamaan agentin proaktiivisempaa ja yhteistyökykyisempää roolia.

# 09.05.2025 - feat: Muokattu SupportAssistantAgent opastavaksi IT-opiskelijoille

- **SupportAssistantAgent - Toiminnallisuuden muutos:**
  - Agentin rooli muutettu suorien ratkaisujen tarjoajasta pedagogiseksi oppaaksi IT-alan opiskelijoille.
  - Sen sijaan, että antaisi vastauksia suoraan, agentti nyt ohjaa opiskelijaa kysymyksillä, vihjeillä ja vaiheittaisilla neuvoilla kohti ratkaisun itsenäistä löytämistä.
  - Tietopankin artikkeleita käytetään hienovaraisesti taustatiedoksi ohjauksessa, ei suorien vastausten lähteenä.
- **Promptin päivitys (`backend/src/ai/prompts/supportAssistantPrompt.ts`):
  - Promptia muokattu merkittävästi ohjeistamaan AI:ta toimimaan mentorina ja opettajana.
  - Lisätty selkeät ohjeet olla paljastamatta ratkaisuja suoraan ja keskittymään opiskelijan oman ajattelun tukemiseen.
- **Dokumentaation päivitykset:**
  - Päivitetty `new_docs/ai-agents/supportAssistantAgent.md` kuvaamaan uutta toimintalogiikkaa ja pedagogista lähestymistapaa.
  - Päivitetty `new_docs/ai-agents/index.md` agentin kuvaus vastaamaan uutta roolia.

# 05.05.2025 - feat: Näkymäasetusten tallentaminen selaimen muistiin

- **Käyttöliittymän parannukset:**
  - Lisätty näkymäasetusten (kortti/listanäkymä) tallennus selaimen localStorage-muistiin
  - Käyttäjien valitsemat näkymäasetukset säilyvät nyt selainikkunan sulkemisen ja uudelleen avaamisen välillä
  - Toteutettu seuraavilla sivuilla:
    - Kaikki tiketit (Tickets.jsx)
    - Omat tikettini (MyTickets.jsx)
    - Oma työnäkymä (MyWorkView.jsx)
  - Lisätty myös tuki Oma työnäkymä -välilehden aktiivisen välilehden muistamiselle
  - Uudelleenkäytettävät custom hookit:
    - useViewMode: näkymäasetusten käsittelyyn
    - useLocalStorage: yleiseen localStorage-tallennukseen
  - Parempi käyttäjäkokemus: käyttäjän ei tarvitse vaihtaa näkymää joka kerta sivuille palatessaan

# 05.05.2025 - feat: Lisätty interaktiivinen demo tukihenkilöassistentille

- **AI-avustaja-välilehden parannukset:**
  - Toteutettu enterprise-tason interaktiivinen demo tukihenkilöassistentille
  - Lisätty demo-komponentti `AIAssistantDemo.jsx` tukihenkilöassistentin simuloimiseksi
  - Mahdollisuus testata avustajaa kolmella erilaisella tikettiskenaariolla
  - Toteutettu ammattimainen kaksiosainen käyttöliittymä, jossa tiketin tiedot ja keskusteluhistoria
  - Lisätty tuki tietopankin artikkelien selaamiselle 
  - Simuloitu AI-avustajan chat-käyttöliittymä, joka reagoi käyttäjän kysymyksiin
  - Lisätty kirjoitusindikaattori, esimerkkikysymykset ja keskusteluhistoria
  - Käytetty edistyksellisiä UI-komponentteja: animaatiot, konfiguroidontipaneeli, responsiivinen asettelu
  - Toteutettu toimiva markdown-muotoilu AI-vastauksissa (lihavointi, kursivointi, listat)

# 05.05.2025 - feat: Aktivoitu tukihenkilöassistentin AITools-välilehti

- **AITools-käyttöliittymän parannus:**
  - Aktivoitu "AI-avustaja"-välilehti AITools-sivulla (`AITools.jsx`)
  - Integroitu AIAssistantInfo-komponentti tukihenkilöassistentti-välilehdelle
  - Poistettu "Tulossa"-merkintä välilehdestä
  - Korvattu placeholder-sisältö informatiivisella AIAssistantInfo-komponentilla
  - Päivitetty välilehden tila aktiiviseksi (`disabled: false`)

# 05.05.2025 - feat: Uudistettu tukihenkilöassistentin käyttöliittymä ammattimaisemmaksi

- **SupportAssistantChat-käyttöliittymän uudistus:**
  - Uudistettu käyttöliittymän visuaalinen ilme modernimmaksi ja ammatimaisemmaksi
  - Lisätty hienovaraisia gradientteja ja varjostuksia luomaan syvyysvaikutelmaa
  - Parannettu elementtien välistystä, marginaaleja ja pyöristyksiä
  - Lisätty visuaalisia tehosteita (taustakuviot, animaatiot, hover-tyylit)
  - Paranneltu painikkeiden ja vuorovaikutuselementtien tyylejä
  - Optimoitu käyttöliittymän responsiivisuutta ja selkeyttä
  - Tehostettu tekstin luettavuutta ja hienovaraisuutta
  - Lisätty hienostuneempia animaatioita ja siirtymiä
  - Parannettu tiketin tietojen näkyvyyttä otsikossa

# 05.05.2025 - fix: Korjattu tukihenkilöassistentin tekstialueen automaattinen koon muutos

- **SupportAssistantChat-tekstialue korjaus:**
  - Korjattu ongelma, jossa pitkän tekstin syöttäminen ei kasvattanut tekstialueen korkeutta automaattisesti
  - Toteutettu automaattinen tekstialueen koon muutos, joka huomioi sekä rivinvaihdot että pitkät rivit
  - Käytetty scrollHeight-arvoa tekstialueen korkeuden dynaamiseen säätämiseen
  - Parannettu käyttöliittymän reagointia reaaliajassa kirjoitettaessa
  - Korjattu vierityspalkkien näkyvyys: vierityspalkit ilmestyvät automaattisesti, kun teksti ylittää maksimikoon
  - Lisätty dynaaminen overflow-tyylin hallinta tekstisisällön pituuden perusteella

# 05.05.2025 - fix: Paranneltu tukihenkilöassistentin käyttöliittymää

- **SupportAssistantChat-parannukset:**
  - Vaihdettu yhden rivin tekstikenttä moniriviseksi tekstialueeksi (textarea)
  - Tekstialue kasvaa automaattisesti tekstin määrän mukaan (max 4 riviä)
  - Lisätty tuki Enter-näppäimen käyttöön viestin lähettämiseen (Shift+Enter lisää rivinvaihdon)
  - Muutettu aikaleimoja käyttämään suomalaista aika- ja päivämäärämuotoa (24h kello)
  - Muokattu tekstialueen ulkoasua helpommin käytettäväksi (pyöristetty reunat)
  - Päivitetty ohjeteksti osoittamaan uusia näppäinkomentoja

# 05.05.2025 - fix: Paranneltu tukihenkilöassistentin tietämysartikkelien hakua

- **SupportAssistantAgent-parannukset:**
  - Muutettu assistentin tapa hakea tietämysartikkeleita
  - Poistettu kategoriaperusteinen haku, joka palautti yleiset artikkelit
  - Muokattu haku käyttämään vain tiketin ID:tä `relatedTicketIds`-kentässä
  - Tämä varmistaa, että assistentti antaa ainoastaan suoraan tikettiin liittyvää täsmällistä tietoa
  - Päivitetty dokumentaatio muutosten mukaisesti (`supportAssistantAgent.md`)

# 04.05.2025 - feat: Tukihenkilön AI assistentti

# 30.04.2025 - fix: Korjattu AI-chatin toimintaa ja lisätty kirjoitusindikaattori
- **AI Chat Agent -korjaukset (`TicketDetailsModal`, `CommentSection`):
  - Korjattu ongelma, jossa AI-agentin vastaukset saattoivat näkyä väärässä järjestyksessä (ennen käyttäjän viestiä).
  - Varmistettu kommenttien tallennusjärjestys backendissä (`ticketController.ts`) ennen AI-vastauksen generointia.
  - Lisätty ID toissijaiseksi lajitteluavaimeksi frontendin kommenttilistoihin (`TicketDetailsModal.jsx`) aikaleimojen ollessa identtiset.
  - Korjattu ongelma, jossa AI-vastaukset eivät päivittyneet reaaliaikaisesti käyttöliittymään ilman modaalin uudelleenavaamista.
  - Toteutettu WebSocket-kuuntelija (`CommentSection.jsx`, `TicketDetailsModal.jsx`) vastaanottamaan `'newComment'`-tapahtumia ja päivittämään näkymä.
  - Lisätty backend-logiikka (`socketService.ts`, `ticketController.ts`, `aiController.ts`) lähettämään `'newComment'`-tapahtumat asiaankuuluville käyttäjille.
  - Korjattu bugi, jossa `@mentions` välilyönneillä ei tunnistettu oikein (`ticketController.ts`).
  - Korjattu bugi, jossa profiilikuvat eivät näkyneet kommenteissa (`CommentSection.jsx`).
- **Uusi ominaisuus: AI Typing Indicator:**
  - Lisätty reaaliaikainen kirjoitusindikaattori (`CommentSection.jsx`), joka näyttää, kun AI-agentti käsittelee ja generoi vastausta.
  - Lisätty backend-logiikka (`socketService.ts`, `aiController.ts`) lähettämään `'updateTypingStatus'` (start/stop) -tapahtumat WebSocketin kautta.

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
