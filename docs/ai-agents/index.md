# Tekoälyagentit

Tässä dokumentissa listataan järjestelmässä käytettävät tekoälyagentit, niiden toiminta ja dokumentaatiolinkit.

## Käytössä olevat agentit

| Agentti | Kuvaus | Dokumentaatio |
|---------|--------|---------------|
| TicketGeneratorAgent | Luo realistisia harjoitustikettejä helpdesk-koulutusta varten | [ticketGenerator.md](ticketGenerator.md) |
| ChatAgent | Simuloi käyttäjää keskusteluissa tukihenkilön kanssa | [chatAgent.md](chatAgent.md) |
| SummarizerAgent | Tuottaa tiivistelmän tiketin keskusteluhistoriasta | [summarizerAgent.md](summarizerAgent.md) |

## Tulevat agentit

Seuraavat agentit ovat suunnitteilla tuleviin versioihin:

| Agentti | Kuvaus | Aikataulu |
|---------|--------|-----------|
| ClassificationAgent | Luokittelee tikettejä kategorioihin ja prioriteetteihin automaattisesti | Tulossa |
| KnowledgeBaseAgent | Hakee relevantteja artikkeleita tietämyskannasta tukihenkilölle | Tulossa |
| ResponseSuggestionAgent | Ehdottaa vastauksia tukihenkilölle yleisiin kysymyksiin | Tulossa |

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
