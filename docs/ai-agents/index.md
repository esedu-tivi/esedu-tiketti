# Tekoälyagentit

Tämä hakemisto sisältää yksityiskohtaisen dokumentaation järjestelmän tekoälyagenteista.

## Saatavilla olevat agentit

- [Harjoitustikettien generointisovellusagentti](./ticketGenerator.md) - Luo realistisia IT-tukipyyntöjä koulutuskäyttöön

## Tulevat agentit

Seuraavat agentit ovat suunnittelu- tai kehitysvaiheessa:

1. **CommentAssistantAgent** - Tarjoaa tukihenkilöille valmiita vastauksia tiketteihin
2. **TicketAnalyzerAgent** - Analysoi tikettejä ja ehdottaa kategorisointia tai ratkaisuja
3. **KnowledgeBaseAgent** - Etsii relevantteja tietämyskannan artikkeleita tikettiin liittyen
4. **SentimentAnalyzerAgent** - Analysoi tiketin sävyä ja kiireellisyyttä

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
