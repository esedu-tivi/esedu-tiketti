# Tekoälyominaisuudet

Tämä dokumentti kuvaa Esedu Tikettijärjestelmän tekoälyyn (AI) perustuvat ominaisuudet, jotka on suunniteltu rikastuttamaan IT-tukihenkilöiden koulutuskokemusta tarjoamalla realistisia ja interaktiivisia harjoitustilanteita.

## Yleiskatsaus

Tekoälyä hyödynnetään pääasiassa seuraavissa tarkoituksissa:

1.  **Harjoitustikettien generointi:** Luodaan realistisia tukipyyntöskenaarioita harjoittelua varten.
2.  **Keskustelun simulointi:** Simuloidaan käyttäjän vuorovaikutusta generoiduissa harjoitustiketeissä.
3.  **Keskustelujen yhteenveto:** Tiivistetään pitkiä tikettikeskusteluja nopeaa ymmärrystä varten.
4.  **Tukihenkilöiden avustaminen:** Tarjotaan tukihenkilöille AI-avustaja ratkaisujen löytämiseen.
5.  **AI-tikettien analysointi:** Tarjotaan työkaluja admin-käyttäjille AI-generoitujen tikettien ja keskustelujen tarkasteluun.

Nämä ominaisuudet toteutetaan käyttämällä [LangChain.js](https://js.langchain.com/) -frameworkia ja kommunikoimalla [OpenAI](https://openai.com/):n suurten kielimallien (LLM) kanssa. Backend-sovelluksessa (`backend/src/ai/`) AI-logiikka on organisoitu agentteihin (`agents/`) ja prompt-mallipohjiin (`prompts/`).

## Käytössä Olevat Tekoälytyökalut

Järjestelmä sisältää seuraavat erikoistuneet AI-agentit ja työkalut:

### 1. Tikettigeneraattori (`TicketGeneratorAgent`)

*   **Tarkoitus:** Generoida realistisia IT-tukipyyntöjä (harjoitustikettejä) ja niihin liittyviä mahdollisia ratkaisuja koulutuskäyttöön.
*   **Toiminta:**
    *   **Parametrisointi:** Agentti ottaa vastaan parametreja, kuten halutun **vaikeustason**, **kategorian** (esim. "Salasanan resetointi", "Verkko-ongelma"), ja mahdollisen **käyttäjäprofiilin** (simuloidakseen tietyn tyyppistä käyttäjää, esim. "Kokematon käyttäjä").
    *   **Generointi:** Se käyttää ennalta määriteltyä promptia (`prompts/`-kansiossa) ja annettuja parametreja pyytääkseen kielimallia luomaan uskottavan tiketin **otsikon**, **kuvauksen**, **prioriteetin**, **laitetiedot** ja **mahdollisen ratkaisuehdotuksen** (tallennettu `AITrainingTicket`-mallin `solution`-kenttään).
    *   **Esikatselu & Vahvistus:** Generointi on kaksivaiheinen. Ensin luodaan esikatselu (`/api/ai/generate-ticket-preview`), jonka käyttäjä (SUPPORT/ADMIN) voi tarkistaa. Hyväksynnän jälkeen tiketti ja ratkaisu tallennetaan tietokantaan (`/api/ai/confirm-ticket-creation`).
    *   **Tallennus:** Tallennettu harjoitustiketti tallennetaan `AITrainingTicket`-tietokantamalliin.
*   **Käyttöliittymä:** Toiminto löytyy AI Tools -sivulta SUPPORT- ja ADMIN-rooleille.
*   **Hyöty:** Tarjoaa tukihenkilöille laajan valikoiman erilaisia harjoitusskenaarioita ilman, että oikeita käyttäjiä tarvitsee vaivata.
*   **Lisätietoja:** Tarkempi kuvaus agentista löytyy dokumentista: [`docs/ai-agents/ticketGenerator.md`](../docs/ai-agents/ticketGenerator.md).

### 2. Keskusteluagentti (`ChatAgent`)

*   **Tarkoitus:** Simuloida käyttäjän roolia keskusteluissa, jotka liittyvät AI-generoituihin harjoitustiketteihin (`AITrainingTicket`).
*   **Toiminta:**
    *   **Automaattinen Aktivointi:** Kun tukihenkilö kommentoi AI-generoitua tikettiä, `ChatAgent` aktivoituu automaattisesti backendissä (`/api/ai/tickets/:id/generate-response`).
    *   **Konteksti:** Agentti saa kontekstiksi **alkuperäisen AI-tiketin skenaarion**, **koko tähänastisen keskusteluhistorian**, **generoidun malliratkaisun** ja **simuloidun käyttäjän profiilin**.
    *   **Vastaus:** Se käyttää näitä tietoja ja omaa promptiaan muodostaakseen realistisen ja kontekstiin sopivan vastauksen tukihenkilön kommenttiin, simuloiden käyttäjää.
    *   **Edistymisen Arviointi:** Agentti arvioi jokaisen tukihenkilön kommentin perusteella, kuinka lähellä ratkaisua ollaan (käyttäen LLM-kutsua, esim. `evaluateSolutionProgressWithLLM`). Arvio (EARLY, PROGRESSING, CLOSE, SOLVED, ERROR) tallennetaan AI:n vastauksen yhteyteen (`AITrainingConversation.evaluationResult`) ja vaikuttaa AI:n seuraavan vastauksen sävyyn ja sisältöön.
    *   **Tallennus:** Agentin generoimat vastaukset tallennetaan `AITrainingConversation`-tietokantamalliin `senderType` -arvolla `\'AI\'`.
*   **Hyöty:** Antaa tukihenkilöille mahdollisuuden harjoitella viestintä- ja ongelmanratkaisutaitojaan interaktiivisessa ympäristössä ilman oikeaa vastapuolta, saaden samalla implisiittistä palautetta edistymisestään.
*   **Lisätietoja:** Tarkempi kuvaus agentista löytyy dokumentista: [`docs/ai-agents/chatAgent.md`](../docs/ai-agents/chatAgent.md).

### 3. Yhteenvetoagentti (`SummarizerAgent`)

*   **Tarkoitus:** Luoda tiivis yhteenveto tiketin (joko oikean tai AI-generoidun) keskusteluhistoriasta.
*   **Toiminta:**
    *   **Aktivointi:** Agentti voidaan aktivoida tietyn tiketin näkymästä (todennäköisesti napista \"Generoi yhteenveto\" AI Analyysi -näkymässä tai mahdollisesti suoraan tiketinäkymässä) kutsumalla endpointia `/api/ai/tickets/:ticketId/summarize`.
    *   **Syöte:** Se saa syötteenä koko tiketin kommenttiketjun.
    *   **Generointi:** Käyttäen kielimallia ja sopivaa promptia, se tuottaa lyhyen yhteenvedon keskustelun pääkohdista, käänteistä ja lopputuloksesta (jos saavutettu).
    *   **Tallennus:** Yhteenveto voidaan tallentaa tiketin `aiSummary`-kenttään (tai vastaavaan) tulevaa käyttöä varten.
*   **Hyöty:** Auttaa nopeasti ymmärtämään pitkien tai monimutkaisten tikettien historian, esimerkiksi kun tiketti siirtyy toiselle tukihenkilölle tai kun tarvitaan nopeaa tilannekatsausta.
*   **Lisätietoja:** Tarkempi kuvaus agentista löytyy dokumentista: [`docs/ai-agents/summarizerAgent.md`](../docs/ai-agents/summarizerAgent.md) (Huom: Tarkista tiedostonimi, jos se on eri).

### 4. Tukihenkilön Avustaja (`SupportAssistantAgent`)

*   **Tarkoitus:** Auttaa tukihenkilöitä ratkaisemaan tikettejä tehokkaammin tarjoamalla kontekstisidonnaista ohjeistusta, ratkaisuehdotuksia ja teknistä tietoa.
*   **Toiminta:**
    *   **Aktivointi:** Tukihenkilö voi kysyä AI-avustajalta neuvoa tikettinäkymässä esittämällä kysymyksen tai pyytämällä apua tietyn ongelman kanssa.
    *   **Konteksti:** Agentti analysoi **tiketin tiedot**, **keskusteluhistorian**, **mahdolliset tietämyskanta-artikkelit** ja **aikaisemmat ratkaisut samankaltaisiin ongelmiin**.
    *   **Generointi:** Käyttäen kielimallia ja kontekstia, agentti tuottaa hyödyllisen vastauksen, joka voi sisältää vianmääritysohjeita, ratkaisuehdotuksia tai lisäkysymyksiä.
    *   **API-päätepiste:** Agenttia kutsutaan endpointin `/api/ai/tickets/:ticketId/support-assistant` kautta.
*   **Hyöty:** Tehostaa tukihenkilöiden työtä tarjoamalla välitöntä apua, jakamalla tietämystä ja nopeuttamalla ongelmanratkaisua.
*   **Käyttöliittymä:** Avustaja on saatavilla tukihenkilöille tikettinäkymässä "Avaa tukiavustaja" -painikkeen kautta, kun tiketti on otettu käsittelyyn. 
*   **Lisätietoja:** Tarkempi kuvaus agentista löytyy dokumentista: [`new_docs/ai-agents/supportAssistantAgent.md`](ai-agents/supportAssistantAgent.md).

### 5. Tikettien Analyysi (Admin-työkalu)

*   **Tarkoitus:** Tarjoaa ADMIN-käyttäjille näkymän ja työkalut AI-generoitujen tikettien ja keskustelujen analysointiin.
*   **Sijainti:** AI Tools -sivun "Tikettien analyysi" -välilehti.
*   **Toiminnallisuus:**
    *   **Listaus:** Näyttää taulukossa kaikki AI-generoidut tiketit (`AITrainingTicket`) perustietoineen (ID, otsikko, kategoria, tila, luontiaika, vastuuhenkilö (jos linkitetty todelliseen tikettiin)) sekä AI-keskustelun (`AITrainingConversation`) kommenttien määrän.
    *   **Suodatus, Lajittelu, Sivutus:** Mahdollistaa listan suodattamisen (kategoria, vastuuhenkilö, tila, AI-interaktioiden määrä, päivämäärä), lajittelun sarakkeiden mukaan ja tulosten sivuttamisen.
    *   **Yhteenvetotilastot:** Näyttää suodatettuihin tuloksiin perustuvat yhteenvedot (tikettien määrä, keskimääräinen AI-interaktioiden määrä, jakauma tilan mukaan).
    *   **Keskustelunäkymä (Modaali):** Avaa valitun AI-tiketin keskusteluhistorian (`AITrainingConversation`) modaali-ikkunaan.
        *   Erottaa selkeästi tukihenkilön kommentit ja `ChatAgent`:in simuloidut vastaukset.
        *   Näyttää `ChatAgent`:in tekemän edistymisarvion (EARLY, PROGRESSING, CLOSE, SOLVED, ERROR) jokaisen AI-kommentin yhteydessä (tooltipillä).
        *   Mahdollistaa AI-generoidun yhteenvedon luomisen/tarkastelun (`SummarizerAgent`).
        *   Mahdollistaa AI-generoidun malliratkaisun tarkastelun ja avaamisen erilliseen ikkunaan.
    *   **Käyttöoikeudet:** Vain ADMIN-rooli.

## Tekninen Toteutus (Yleiskatsaus)

*   **Framework:** [LangChain.js](https://js.langchain.com/) - Käytetään AI-agenttien, prompt-mallipohjien (`prompts/`) ja logiikkaketjujen (chains) rakentamiseen ja hallintaan.
*   **Kielimalli:** [OpenAI API](https://openai.com/) - Yhteys OpenAI:n kielimalleihin (kuten GPT-3.5 tai GPT-4) tekstin generointiin ja ymmärtämiseen. API-avainta hallitaan ympäristömuuttujalla.
*   **Backend-integraatio:**
    *   AI-logiikka sijaitsee pääosin `backend/src/ai/`-kansiossa (agentit, promptit, konfiguraatio).
    *   API-päätepisteet AI-toiminnoille löytyvät `aiController.ts` ja `aiRoutes.ts` -tiedostoista.
    *   AI-agentit on integroitu backendin palveluihin (`services/`), jotka kutsuvat niitä tarvittaessa.
*   **Frontend-integraatio:**
    *   AI-työkalujen käyttöliittymäkomponentit sijaitsevat `frontend/src/components/Admin/` ja `frontend/src/pages/AITools.jsx`.
    *   Frontend kommunikoi backendin AI API -päätepisteiden kanssa `axios`:n avulla.

## Konfiguraatio

*   **API-avain:** Järjestelmä vaatii toimiakseen OpenAI API -avaimen. Aseta se backendin `.env`-tiedostoon:
    ```
    OPENAI_API_KEY=your_openai_api_key_here
    ```
*   **Malliasetukset:** Tekoälymallien (esim. käytettävä GPT-malli) ja muiden AI-parametrien oletusasetuksia voidaan mahdollisesti säätää `backend/src/ai/config/aiConfig.ts` -tiedostossa (tai vastaavassa).

## Tulevat Ominaisuudet (Suunnitelmia)

*   **Tikettien automaattinen luokittelu:** Saapuvien tikettien kategorisointi AI:n avulla.
*   **Vastausgeneraattori:** AI-pohjaisia vastaus- tai ratkaisuehdotuksia tukihenkilöille.
*   **Tietämyskannan integraatio:** AI hakee tietoa tai ratkaisuja olemassa olevasta tietämyskannasta.
*   **Historiatietojen analyysi:** Trendien ja kuvioiden tunnistaminen tikettidatasta.
*   **Mielipideanalyysi (Sentiment Analysis):** Käyttäjän viestien sävyn (esim. tyytyväisyys, kiireellisyys) tunnistaminen.

## Vianetsintä

Yleisiä ongelmia ja ratkaisuehdotuksia AI-ominaisuuksiin liittyen:

*   **Generointivirheet:** Varmista, että `OPENAI_API_KEY` on asetettu oikein `.env`-tiedostoon, avain on voimassa ja tilillä on käyttöoikeutta/krediittejä. Tarkista myös backendin lokit tarkempien virheilmoitusten varalta.
*   **Epärealistiset tai Huonolaatuiset Tulokset:** Säädä agenttien käyttämiä prompteja (`backend/src/ai/prompts/`) tarkemmiksi tai kokeile eri kielimallia (jos konfiguroitavissa).
*   **Hitaus:** Tekoälymallien kutsut voivat olla hitaita. Harkitse asynkronista suoritusta tai käyttäjälle indikaattoreita odotuksen aikana. Suorituskykyongelmissa voi harkita myös välimuistia usein toistuville pyynnöille (jos sovellettavissa).
*   **Kieliongelmat (generointi väärällä kielellä):** Varmista, että prompteissa ohjeistetaan selkeästi käyttämään suomen kieltä.
*   **ChatAgentin Edistymisarviointi Epäonnistuu:** Voi johtua promptin epäselvyydestä tai LLM:n vaikeudesta arvioida monimutkaista keskustelua. Promptin säätäminen voi auttaa.
*   **API-kutsut Epäonnistuvat (Frontend):** Tarkista selaimen kehitystyökalujen verkkopyynnöt (Network tab) ja konsoli virheiden varalta. Varmista, että frontend lähettää pyynnöt oikeisiin endpointteihin ja oikeassa muodossa.

## AI Analytics

Järjestelmä sisältää kattavan analytiikkakomponentin, joka tarjoaa tietoa AI-avustajan käytöstä, tehokkuudesta ja vaikutuksesta tikettien käsittelyyn.

### 1. AI Assistant Analytics -näkymä

* **Tarkoitus:** Tarjota visuaalisia ja dataperusteisia näkymiä AI-avustajan käytöstä ja tehokkuudesta tukihenkilöiden ja järjestelmän hallinnoijien käyttöön.
* **Käyttöliittymä:** Komponentti löytyy AI Tools -sivulta erillisellä "Analytiikka"-välilehdellä.
* **Saatavuus:** Vain ADMIN- ja SUPPORT-rooleille.

### 2. Tärkeimmät ominaisuudet

* **Käyttötilastot:**
  * Interaktioiden määrä ja trendi valitulla aikavälillä
  * Mahdollisuus vaihtaa näkymää interaktioiden määrän ja vastausaikojen välillä
  * Interaktiivinen kaavio keskiarvon visualisoinnilla ja hover-tiloilla
  * Aikafiltterit (7pv, 14pv, 30pv, 90pv)

* **Tukihenkilöiden käyttö:**
  * Listaus tukihenkilöistä, jotka käyttävät AI-avustajaa
  * Käyttömäärät ja keskimääräiset arvosanat per tukihenkilö
  * Yksityiskohtainen näkymä per tukihenkilö, joka sisältää:
    * Interaktiot päivittäin
    * Vastausaikojen keskiarvo
    * Arvosanajakauma
    * Yleisimmät kyselyt

* **Kategoriajakauma:**
  * Visualisointi AI-avustajan käytöstä eri tikettikategorioissa
  * Piirakkakuvaajat kategorioiden osuuksista

* **Ratkaisuaikojen vertailu:**
  * Tikettikohtaiset ratkaisuajat AI-avustajan kanssa vs. ilman
  * Prosentuaalinen parannus ratkaisuajoissa
  * Tuki ajan esittämiselle sekä tunteina että minuutteina pienille arvoille

* **Vastausajat:**
  * Persentiilianalyysi vastausajoista (50%, 75%, 90%, 95%, 99%)
  * Keskimääräinen ja nopein vastausaika

### 3. Tekninen toteutus

* **Frontend:** 
  * Reaktiiviset visualisointikomponentit (kaaviot, piirakkakuvaajat, taulukot)
  * Rechart.js-visualisointikirjasto kaavioihin
  * Tiedon suodatus ja ryhmittely

* **Backend:**
  * Datamallien tallennus:
    * `AIAssistantInteraction` - tallentaa yksittäiset AI-interaktiot
    * `AIAssistantUsageStat` - päivittäiset käyttötilastot
    * `AIAssistantCategoryStat` - kategoriakohtaiset tilastot
  * API-päätepisteet:
    * `/api/ai-analytics/dashboard` - kokonaiskuvan data
    * `/api/ai-analytics/usage` - käyttötilastot 
    * `/api/ai-analytics/categories` - kategoriadata
    * `/api/ai-analytics/agents` - tukihenkilöiden käyttödata
    * `/api/ai-analytics/agents/:agentId/details` - yksittäisen tukihenkilön tarkemmat tiedot
    * `/api/ai-analytics/response-times` - vastausaikatilastot
    * `/api/ai-analytics/resolution-times` - ratkaisuaikojen vertailu

### 4. Hyödyt

* **Tietopohjaiset päätökset:** Mahdollistaa AI-avustajan tehokkuuden ja vaikutuksen mittaamisen
* **Tehokkuuden optimointi:** Tunnistaa kehitysalueet ja seuraa parannuksia
* **Käyttäjäkohtainen analyysi:** Tunnistaa tukihenkilöt, jotka hyödyntävät AI-avustajaa tehokkaimmin
* **Käyttötrendien seuranta:** Mahdollistaa käytön määrän ja laadun kehityksen seurannan ajan myötä
* **Ratkaisuaikojen kehitys:** Mittaa todellista vaikutusta tikettien käsittelyn tehokkuuteen

### 5. Tulevat kehityskohteet

* **Heatmap-visualisoinnit:** Aktiivisimmat ajat ja käyttäjät
* **Hakutrendien analyysi:** Yleisimmät hakutermit ja niiden tuloksellisuus
* **Laajempi kategoria-analyysi:** Tarkempi näkymä kategorioiden sisältöön
* **Automatisoidut raportit:** Säännölliset sähköpostiyhteenvedot käytöstä ja tehokkuudesta
* **Käyttäjäsegmentointi:** Erilaisten käyttäjäprofiilien tunnistaminen käyttötapojen perusteella
