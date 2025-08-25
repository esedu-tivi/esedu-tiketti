# Tekoälyagentit

Tässä dokumentissa listataan järjestelmässä käytettävät tekoälyagentit, niiden toiminta ja dokumentaatiolinkit.

## Käytössä olevat agentit

| Agentti | Kuvaus | Dokumentaatio |
|---------|--------|---------------|
| TicketGeneratorAgent | Luo realistisia harjoitustikettejä helpdesk-koulutusta varten | [ticketGenerator.md](ticketGenerator.md) |
| ChatAgent | Simuloi käyttäjää keskusteluissa tukihenkilön kanssa (perinteinen toteutus) | [chatAgent.md](chatAgent.md) |
| ModernChatAgent | Uuden sukupolven chat-agentti yhdellä LLM-kutsulla ja strukturoidulla outputilla | [modernChatAgent.md](modernChatAgent.md) |
| SummarizerAgent | Tuottaa tiivistelmän tiketin keskusteluhistoriasta | [summarizerAgent.md](summarizerAgent.md) |
| SupportAssistantAgent | Ohjaa IT-alan opiskelijoita ongelmanratkaisussa ja auttaa heitä oppimaan itsenäisesti. | [supportAssistantAgent.md](supportAssistantAgent.md) |

## Tulevat agentit

Seuraavat agentit ovat suunnitteilla tuleviin versioihin:

| Agentti | Kuvaus | Aikataulu |
|---------|--------|-----------|
| ClassificationAgent | Luokittelee tikettejä kategorioihin ja prioriteetteihin automaattisesti | Tulossa |
| KnowledgeBaseAgent | Hakee relevantteja artikkeleita tietämyskannasta tukihenkilölle | Tulossa |
| ResponseSuggestionAgent | Ehdottaa vastauksia tukihenkilölle yleisiin kysymyksiin | Tulossa |

## Agenttien Työnkulku (Flowcharts)

### TicketGeneratorAgent (Highly Detailed)

```mermaid
graph TD
    A["<b>1. SUPPORT/ADMIN Käyttäjä</b><br/>Valitsee parametrit (vaikeustaso,<br/>kategoria, käyttäjäprofiili) UI:ssa.<br/><i>(Voi mahdollisesti pyytää useita kerralla)</i>"] --> B{"<b>2. UI Trigger</b><br/>Lähettää Preview-pyynnön<br/>(yhdelle tai useammalle tiketille)"};
    B --> C["<b>3. API Endpoint</b><br/>POST /api/ai/generate-ticket-preview"];
    C -- "req.body (parametrit)" --> D["<b>4. TicketGeneratorAgent</b><br/>Vastaanottaa pyynnön"];
    D --> D1["<b>4a. Format Prompt</b><br/>Luo LLM-syötteen.<br/><b>Konteksti:</b> Ohjeistus generoida<br/>1) Realistinen tikettiskenaario (otsikko, kuvaus,<br/>   prioriteetti, laite, käyttäjätyyppi)<br/>2) Erillinen mahdollinen RATKAISU tikettiin.<br/>   Pohjautuen annettuihin parametreihin."];
    D1 -- "Muotoiltu prompti" --> E["<b>5. LLM Call (OpenAI)</b><br/>Pyytää skenaarion JA ratkaisun<br/>generointia (tekstinä)"];
    E -- "LLM Vastaus (teksti, sis. skenaario + ratkaisu)" --> D2["<b>6. TicketGeneratorAgent</b><br/>Jäsentää vastauksen.<br/>Erottelee skenaarion ja ratkaisun.<br/>Muodostaa JSON-esikatselun (sisältää<br/>sekä skenaarion että ratkaisun)."];
    D2 -- "previewData (JSON, sis. skenaario + solution)" --> C;
    C --> F["<b>7. UI</b><br/>Renderöi esikatselun ADMINille:<br/>- Tiketin tiedot (otsikko, kuvaus...)<br/>- Generoitu ratkaisuehdotus"];
    F --> G{"<b>8. Käyttäjän Päätös Esikatselusta</b><br/>Valitse toiminto:"};
    G -- "Delete Preview / Cancel" --> H["<b>9a. Prosessi Päättyy</b><br/>(Esikatselu poistetaan UI:sta)"];
    G -- "Regenerate" --> B; subgraph Regenerate Loop; B; end;
    G -- "Confirm Creation" --> I["<b>9b. API Endpoint</b><br/>POST /api/ai/confirm-ticket-creation"];
    I -- "req.body (previewData + tallennettu ratkaisu)" --> J["<b>10. TicketGeneratorAgent</b><br/>Vastaanottaa vahvistuksen"];
    J --> K["<b>11. Format DB Record</b><br/>Muotoilee datan<br/>AITrainingTicket-mallin mukaiseksi."];
    K -- "Tallennusobjekti<br/>(sis. scenario, difficulty,<br/><b>solution</b>, generatedById...)" --> L["<b>12. Database Write</b><br/>INSERT INTO AITrainingTicket"];
    L -- "Tallennettu AITrainingTicket (sis. solution)" --> J;
    J --> M["<b>13. API Response</b><br/>Palauttaa vahvistuksen (esim. 201 Created)"];
    M --> N["<b>14. UI</b><br/>Näyttää onnistumisilmoituksen<br/>ja poistaa vahvistetun esikatselun."];
```

### ChatAgent (Traditional - Two LLM Calls)

```mermaid
graph TD
    A["<b>1. SUPPORT/ADMIN</b><br/>Kirjoittaa kommentin AI-tikettiin UI:ssa"] --> B{"<b>2. UI Trigger</b><br/>Lähettää kommentin ja pyytää AI-vastausta"};
    B --> C["<b>3. API Endpoint</b><br/>POST /api/ai/tickets/:id/generate-response"];
    C -- "req.params.id, req.body.comment" --> D["<b>4. ChatAgent</b><br/>Vastaanottaa pyynnön"];
    D --> D1["<b>5. Database Read</b><br/>Hae AITrainingTicket (alkuperäinen skenaario,<br/><b>tavoiteratkaisu (solution)</b>)<br/>JA AITrainingConversation (koko keskusteluhistoria)"];
    D1 -- "Kontekstitiedot" --> D2["<b>6. ChatAgent</b><br/>Muodostaa kontekstin LLM-kutsuja varten"];
    D2 -- "<b>Konteksti Evalille:</b><br/>- Alkuperäinen skenaario<br/>- Tavoiteratkaisu<br/>- Koko keskusteluhistoria" --> E1["<b>7a. Format Eval Prompt</b><br/>Luo prompti edistymisen arviointiin<br/>(esim. 'Kuinka lähellä ratkaisua ollaan?')"];
    E1 -- "Muotoiltu prompti" --> E2["<b>7b. LLM Call (OpenAI)</b><br/>Arvioi keskustelun edistyminen<br/>(evaluateSolutionProgressWithLLM)"];
    E2 -- "LLM Vastaus (esim. 'PROGRESSING')" --> D3["<b>8. ChatAgent</b><br/>Jäsentää edistymisen arvion<br/>(enum: EARLY, PROGRESSING, CLOSE, SOLVED)"];
    subgraph "Vastauksen Muotoilu Perustuen Arvioon"
        direction LR
        D3 -- "evaluationResult" --> F1["<b>9a. Format Reply Prompt</b><br/>Luo prompti vastauksen generointiin.<br/><b>Konteksti Vastaus-LLM:lle:</b><br/>- Alkuperäinen skenaario<br/>- Tavoiteratkaisu<br/>- Koko keskusteluhistoria<br/>- Uusin SUPPORT-kommentti<br/>- <b>evaluationResult (tulos vaiheesta 8)</b><br/>- Ohjeistus käyttäytymiseen:<br/>  <i>EARLY:</i> Kysy tarkentavia kysymyksiä.<br/>  <i>PROGRESSING:</i> Ohjaa kohti ratkaisua.<br/>  <i>CLOSE:</i> Viimeistele, vahvista ymmärrys.<br/>  <i>SOLVED:</i> Totea ratkaisu, kiitä."];
    end
    F1 -- "Muotoiltu, tilanteeseen sopiva prompti" --> F2["<b>9b. LLM Call (OpenAI)</b><br/>Generoi simuloidun käyttäjän vastaus<br/>(generateResponse)"];
    F2 -- "LLM Vastaus (teksti)" --> G["<b>10. ChatAgent</b><br/>Jäsentää generoidun vastauksen"];
    G -- "Vastaus (message),<br/>Arvio (evaluationResult)" --> H["<b>11. Database Write</b><br/>INSERT INTO Comment<br/>(content, evaluationResult, isAiGenerated=true...)"];
    H -- "Tallennettu keskustelutieto" --> G;
    G --> I["<b>12. API Response</b><br/>Palauttaa generoidun vastauksen (JSON)<br/>(sisältäen ehkä evaluationResult?)"];
    I --> J["<b>13. UI</b><br/>Lisää AI:n vastauksen keskusteluun.<br/>Voi näyttää evaluationResult esim. tooltipissä."];
```

### ModernChatAgent (Single LLM Call with Hint System)

```mermaid
graph TD
    A["<b>1. SUPPORT/ADMIN</b><br/>Kirjoittaa kommentin AI-tikettiin UI:ssa"] --> B{"<b>2. UI Trigger</b><br/>Lähettää kommentin ja pyytää AI-vastausta"};
    B --> C["<b>3. API Endpoint</b><br/>POST /api/ai/tickets/:id/generate-response"];
    C --> D["<b>4. AISettings Check</b><br/>Hae AI-asetukset tietokannasta<br/>aiSettingsService.getSettings()"];
    
    D --> E{"<b>5. Version Selection</b><br/>chatAgentVersion?"};
    
    E -- "'modern'" --> F["<b>6a. Modern Path</b><br/>aiController käyttää ModernChatAgent"];
    E -- "'legacy'" --> G["<b>6b. Legacy Path</b><br/>aiController käyttää ChatAgent<br/>(kaksi LLM-kutsua)"];
    
    F --> H["<b>7. Database Read</b><br/>Hae tiketin konteksti:<br/>- AITrainingTicket (skenaario + ratkaisu)<br/>- Keskusteluhistoria<br/>- Käyttäjätiedot ja kategoria"];
    
    H --> I["<b>8. ConversationStateMachine</b><br/>- Hae tai luo tilakone tikettille<br/>- Tarkista shouldProvideHint() AI-asetusten kanssa<br/>- Jos stuck >= earlyThreshold → forceHint = true<br/>- Huomioi cooldown ja maxHints rajoitukset"];
    
    I --> J["<b>9. Context Building</b><br/>Rakennetaan TicketContext:<br/>- title, description, device<br/>- category, additionalInfo<br/>- solution (tietämysartikkeli)<br/>- userProfile (nimi, rooli, tekninen taso)"];
    
    J --> K["<b>10. Single LLM Call</b><br/>modernChatAgent.respond()<br/>Yksi kutsu OpenAI:lle<br/>+ forceHint parametri"];
    
    subgraph "Strukturoitu Output (JSON Schema)"
        direction LR
        K --> L1["<b>evaluation</b><br/>EARLY/PROGRESSING/<br/>CLOSE/SOLVED"];
        K --> L2["<b>reasoning</b><br/>Sisäinen päättely<br/>(tallennetaan DB:hen)"];
        K --> L3["<b>response</b><br/>Käyttäjän vastaus<br/>suomeksi"];
        K --> L4["<b>emotionalState</b><br/>frustrated/hopeful/<br/>excited/satisfied/confused"];
        K --> L5["<b>shouldRevealHint</b><br/>true jos vihje annettu"];
    end
    
    L1 & L2 & L3 & L4 & L5 --> M["<b>11. Zod Validation</b><br/>ChatResponseSchema.parse()<br/>Varmistaa tyypin oikeellisuuden"];
    
    M --> N["<b>12. State Update</b><br/>stateMachine.transition(evaluation)<br/>Päivittää stuck-laskuria"];
    
    N --> O["<b>13. Database Write</b><br/>INSERT INTO Comment<br/>- content (response text)<br/>- evaluationResult<br/>- emotionalState<br/>- reasoning<br/>- shouldRevealHint<br/>- isAiGenerated: true"];
    
    O --> P["<b>14. API Response</b><br/>Palauttaa:<br/>- responseText<br/>- evaluation<br/>- emotionalState<br/>- shouldRevealHint"];
    
    P --> Q{"<b>15. UI Update</b><br/>Näkymä riippuu käyttäjästä"};
    
    Q -- "Support/Student" --> R["<b>CommentSection.jsx</b><br/>- AI:n vastaus<br/>- 'Vihje annettu' badge<br/>- EI sisäisiä tietoja"];
    
    Q -- "Admin/Trainer" --> S["<b>ConversationModal.jsx</b><br/>- Kaikki tiedot<br/>- Evaluation badges<br/>- Emotional states<br/>- Reasoning dropdown"];
    
    G --> T["Legacy flow<br/>(katso ChatAgent-kaavio)"];
```

### ConversationStateMachine (Dialogue Flow Control with Hint System)

**Status**: KÄYTÖSSÄ ModernChatAgentin kanssa vihjesysteemin hallintaan.

```mermaid
stateDiagram-v2
    [*] --> initial: Start
    
    initial --> initial: EARLY (stuck++)
    initial --> diagnosing: PROGRESSING (stuck=0)
    
    diagnosing --> diagnosing: EARLY (stuck++)
    diagnosing --> diagnosing: PROGRESSING (stuck=0)
    diagnosing --> attempting: CLOSE (stuck=0)
    
    attempting --> attempting: EARLY (stuck++)
    attempting --> attempting: PROGRESSING/CLOSE (stuck=0)
    attempting --> verifying: SOLVED (stuck=0)
    
    verifying --> verifying: CLOSE/PROGRESSING (stuck=0)
    verifying --> resolved: SOLVED
    
    resolved --> [*]: End
    
    note right of initial
        User describes problem
        Support gathering info
        stuck >= 3 = hint provided
    end note
    
    note right of diagnosing
        Support identifies area
        Testing solutions
        Hint if stuck >= 3
    end note
    
    note right of attempting
        Close to solution
        Fine-tuning approach
        Hint if stuck >= 3
    end note
    
    note right of verifying
        Solution works
        User confirms fix
        No stuck tracking
    end note
```

**Vihjesysteemin toiminta (AISettings-pohjaiset):**
- `stuckCounter` kasvaa aina kun evaluation = EARLY
- `stuckCounter` nollautuu aina kun evaluation ≠ EARLY  
- Vihje annetaan kun:
  - `hintSystemEnabled = true` (AISettings)
  - `stuckCounter >= hintOnEarlyThreshold` (oletuksena 3)
  - Tai vastaavat kynnykset PROGRESSING/CLOSE-tiloissa
  - Ottaen huomioon `hintCooldownTurns` (vihjeiden väli)
  - Ja `hintMaxPerConversation` (maksimimäärä per keskustelu)
- Vihjeet sisällytetään AI:n vastaukseen luonnollisesti
- Asetukset haetaan tietokannasta AISettings-taulusta

### SummarizerAgent (Detailed)

```mermaid
graph TD
    A["<b>1. Käyttäjä</b><br/>Klikkaa 'Generoi Yhteenveto' UI:ssa<br/>(esim. AI Analyysi -näkymä)"] --> B{"<b>2. UI Trigger</b><br/>Lähettää yhteenvetopyynnön"};
    B --> C["<b>3. API Endpoint</b><br/>GET /api/ai/tickets/:ticketId/summarize"];
    C -- "req.params.ticketId" --> D["<b>4. SummarizerAgent</b><br/>Vastaanottaa pyynnön"];
    D --> D1["<b>5. Database Read</b><br/>Hae kaikki Comment / AITrainingConversation<br/>tietueet annetulle ticketId:lle"];
    D1 -- "Koko keskusteluhistoria" --> D2["<b>6. SummarizerAgent</b><br/>Muotoilee keskustelun<br/>syötteeksi LLM:lle"];
    D2 -- "Keskusteluhistoria (teksti)" --> E1["<b>7a. Format Summary Prompt</b><br/>Luo prompti yhteenvedon generointiin"];
    E1 -- "Muotoiltu prompti" --> E2["<b>7b. LLM Call (OpenAI)</b><br/>Generoi yhteenveto keskustelusta"];
    E2 -- "LLM Vastaus (yhteenvetoteksti)" --> F["<b>8. SummarizerAgent</b><br/>Jäsentää yhteenvedon"];
    F --> G{"<b>9. Tallenna Yhteenveto?</b><br/>(Sovelluksen konfiguraatio/logiikka)"};
    G -- "Kyllä" --> H["<b>10a. Database Write</b><br/>UPDATE Ticket SET aiSummary = [yhteenveto]"];
    H --> I["<b>11. API Response</b><br/>Palauttaa generoidun yhteenvedon (JSON)"];
    G -- "Ei" --> I;
    I --> J["<b>12. UI</b><br/>Näyttää yhteenvedon käyttäjälle<br/>(esim. modaalissa tai kentässä)"];
```

### SupportAssistantAgent (Detailed)

```mermaid
graph TD
    A["<b>1. Tukihenkilö</b><br/>Avaa tikettinäkymän<br/>ja klikkaa Tuki AI -painiketta"] --> B["<b>2. SupportAssistantChat UI</b><br/>Avaa chat-ikkunan<br/>tilassa 'Odottaa kysymystä'"];
    
    B --> C["<b>3. Käyttäjä</b><br/>Kirjoittaa kysymyksen<br/>ja lähettää viestin"];
    
    C --> D["<b>4. UI Komponentti</b><br/>Näyttää latausanimaation<br/>ja lähettää API-pyynnön"];
    
    D --> E["<b>5. API Endpoint</b><br/>POST /api/ai/tickets/:ticketId/support-assistant<br/>Käsittelee pyynnön"];
    
    E --> F["<b>6. AIController</b><br/>Tarkistaa käyttöoikeudet<br/>ja hakee tiketin tiedot"];
    
    F --> G["<b>7. SupportAssistantAgent</b><br/>Vastaanottaa tiketin tiedot<br/>ja käyttäjän kysymyksen"];
    
    G --> H["<b>8. Tietojen kokoaminen</b><br/>- Tiketin tiedot<br/>- Keskusteluhistoria<br/>- Tietämysartikkelit<br/>- Mahdolliset ratkaisut"];
    
    H --> I["<b>9. Promptin formatointi</b><br/>Kokoaa tiedot<br/>LLM-promptiksi"];
    
    I --> J["<b>10. LLM-kutsu</b><br/>Lähettää promptin<br/>OpenAI API:lle"];
    
    J --> K["<b>11. Vastauksen käsittely</b><br/>Muotoilee vastauksen<br/>ja palauttaa sen"];
    
    K --> L["<b>12. API-vastaus</b><br/>Lähettää vastauksen<br/>takaisin frontend-sovellukselle"];
    
    L --> M["<b>13. UI Päivitys</b><br/>Chat-ikkuna näyttää vastauksen<br/>formatoituna viestinä"];
    
    M --> N["<b>14. Interaktiiviset toiminnot</b><br/>- Kopiointi leikepöydälle<br/>- Palaute (peukku ylös/alas)<br/>- Keskustelun jatkaminen"];
    
    N --> O["<b>15. Lisätoiminnot</b><br/>- Keskustelun tyhjennys<br/>- Chat-ikkunan pienennys<br/>- Ikkunan sulkeminen"];
```

## Agenttien integrointi

Kaikki agentit on integroitu järjestelmään käyttäen samaa perusrakennetta:

1. Agentti-luokka: `backend/src/ai/agents/[agenttiNimi].ts`
2. Prompti: `backend/src/ai/prompts/[agenttiNimi]Prompt.ts`
3. Kontrolleri: Kutsu agenttia kontrollerin kautta
4. Rajapinta: Tarjoa API-päätepiste agentin toiminnoille

## Agenttien kehitys

Kun kehität uusia agentteja, seuraa seuraavia periaatteita:

1. Käytä yhtenäistä koodiarkkitehtuuria ja nimeämiskäytäntöjä
2. Kirjoita kattava dokumentaatio agentin toiminnasta
3. Tarjoa selkeät esimerkit käyttötapauksista
4. Varmista tietoturva ja yksityisyys
5. Testaa agenttia perusteellisesti ennen tuotantoon vientiä

## Yhteinen arkkitehtuuri

Kaikki tekoälyagentit käyttävät seuraavaa yhteistä arkkitehtuuria:

1. **LangChain.js-integraatio**:
   - ChatPromptTemplate: Rakenteelliset promptit parametreineen
   - StructuredOutputParser: Jäsennetyn JSON-datan validointi ja käsittely
   - ChatOpenAI: Yhteys OpenAI:n kielimalleihin

2. **Konfiguraatio**:
   - Keskitetty `AI_CONFIG`-objekti (`config.ts`)
   - Ympäristömuuttujapohjainen konfiguraatio (API-avain, mallit)
   - Agenttikohtaiset asetukset konfiguraatiokohteessa

3. **Integraatio järjestelmään**:
   - API-rajapinnat agenttien kutsumiseen (`aiController.ts`)
   - Reitit: Express-reitit agenttitoimintojen käyttöön (`aiRoutes.ts`)
   - Käyttöoikeustarkistukset: Rajoitettu pääsy ADMIN ja SUPPORT -käyttäjille

## Kansiorakenne

```
backend/
├── src/
│   ├── ai/
│   │   ├── agents/           # Yksittäiset agentit
│   │   │   └── ticketGeneratorAgent.ts
│   │   ├── config/           # Tekoälyasetukset
│   │   │   └── aiConfig.ts
│   │   ├── prompts/          # Prompttipohjat
│   │   │   └── ticketGeneratorPrompt.ts
│   │   └── tools/            # Agenttien käyttämät työkalut
```
