# Tekoälytyökalut - Dokumentaatio

## Yleiskatsaus

Tiketti-järjestelmän tekoälykomponentit tarjoavat edistyksellisiä työkaluja, jotka auttavat IT-tuen opiskelijoiden koulutuksessa. Tällä hetkellä järjestelmä sisältää harjoitustikettien generointityökalun, jonka avulla ohjaajat voivat luoda realistisia IT-tukipyyntöjä opiskelijoiden harjoittelua varten.

## Sisällysluettelo

1. [Käyttöohjeet](#käyttöohjeet)
   - [Harjoitustikettien luonti](#harjoitustikettien-luonti)
   - [Käyttöliittymä](#käyttöliittymä)
2. [Tekninen rakenne](#tekninen-rakenne)
   - [Arkkitehtuuri](#arkkitehtuuri)
   - [Hakemistorakenne](#hakemistorakenne)
   - [Riippuvuudet](#riippuvuudet)
3. [Implementaation yksityiskohdat](#implementaation-yksityiskohdat)
   - [Tekoälyagentit](#tekoälyagentit)
   - [Promptit](#promptit)
   - [API-rajapinnat](#api-rajapinnat)
4. [Konfigurointi](#konfigurointi)
   - [Ympäristömuuttujat](#ympäristömuuttujat)
   - [OpenAI-asetukset](#openai-asetukset)
5. [Tulevat ominaisuudet](#tulevat-ominaisuudet)
   - [Suunniteltu kehityskartta](#suunniteltu-kehityskartta)

## Käyttöohjeet

### Harjoitustikettien luonti

Tekoälytyökalut ovat saatavilla vain järjestelmänvalvojille (ADMIN) ja tukihenkilöille (SUPPORT). Harjoitustikettien luomiseksi:

1. Kirjaudu sisään järjestelmään ADMIN- tai SUPPORT-tunnuksella
2. Napsauta navigaatiosta "Tekoälytyökalut"
3. Valitse haluamasi asetukset:
   - **Vaikeustaso**: Helppo, Keskitaso tai Haastava
   - **Kategoria**: Valitse tiketin kategoria
   - **Käyttäjäprofiili**: Opiskelija, Opettaja, Henkilökunta tai Järjestelmänvalvoja
   - **Osoitus**: Voit halutessasi osoittaa tiketin suoraan tietylle tukihenkilölle
4. Paina "Luo harjoitustiketti" -painiketta

Järjestelmä luo tekoälyn avulla realistisen tiketin, joka näkyy tikettijärjestelmässä tavallisen tiketin tapaan. Tiketti luodaan admin-käyttäjän nimissä, mutta se on merkitty harjoitustiketiksi.

### Käyttöliittymä

Tekoälytyökalut-sivu on jaettu välilehtiin, joista voit valita haluamasi työkalun:

- **Harjoitustikettien luonti**: Luo realistisia IT-tukipyyntöjä harjoittelua varten
- (Lisää välilehtiä tulevien ominaisuuksien myötä)

## Tekninen rakenne

### Arkkitehtuuri

Tekoälytyökalut on toteutettu käyttäen LangChain.js-kirjastoa, joka tarjoaa rakenteen generatiivisten tekoälymallien käyttöön. Järjestelmä hyödyntää OpenAI:n kielimalleja tikettien generointiin.

```
┌─────────────────┐      ┌───────────────┐      ┌──────────────┐
│                 │      │               │      │              │
│  React Frontend ├──────┤ Express API   ├──────┤ LangChain.js │
│  (Käyttöliittymä)│      │ (Backend)     │      │ (AI Agents)  │
│                 │      │               │      │              │
└─────────────────┘      └───────────────┘      └──────┬───────┘
                                                      │
                                                      │
                                                ┌─────▼──────┐
                                                │            │
                                                │  OpenAI API│
                                                │            │
                                                └────────────┘
```

Järjestelmä koostuu seuraavista osista:

1. **Frontend**: React-komponentit, jotka tarjoavat käyttöliittymän tekoälytyökaluille
2. **Backend API**: Express-pohjaiset API-päätepisteet, jotka käsittelevät tekoälypyyntöjä
3. **AI Agents**: LangChain.js-pohjaiset tekoälyagentit, jotka hoitavat generointitehtävät
4. **OpenAI API**: Ulkoinen rajapinta, joka tarjoaa generatiiviset kielimallit

### Hakemistorakenne

```
backend/
├── src/
│   ├── ai/                  # Tekoälyyn liittyvä koodi
│   │   ├── agents/          # Tekoälyagentit
│   │   │   └── ticketGeneratorAgent.ts
│   │   ├── config.ts        # Tekoälyn konfigurointi
│   │   ├── prompts/         # Promptit tekoälymalleille
│   │   │   └── ticketGeneratorPrompt.ts
│   │   └── tools/           # Agentin käyttämät työkalut
│   ├── controllers/
│   │   └── aiController.ts  # API-päätepisteiden hallinta
│   └── routes/
│       └── aiRoutes.ts      # API-reitit tekoälytoiminnoille
│
frontend/
├── src/
│   ├── components/
│   │   └── Admin/
│   │       └── AITicketGenerator.jsx  # Tikettien luontikomponentti
│   └── pages/
│       └── AITools.jsx  # Tekoälytyökalujen pääsivu
```

### Riippuvuudet

Backend:
- `@langchain/openai`: OpenAI-mallien integrointi LangChain-kirjaston kanssa
- `@langchain/core`: LangChain-ydinkomponentit
- `langchain`: Tekoälyagenttien kehityskirjasto
- `zod`: Tietorakenteiden validointi

Frontend:
- Käyttää samoja riippuvuuksia kuin muu frontend-sovellus

## Implementaation yksityiskohdat

### Tekoälyagentit

#### Tikettien generointiagentti

Tikettien generointiagentti luo realistisia IT-tukipyyntöjä käyttäen sille annettuja parametreja:

```typescript
async generateTicket(params: {
  complexity?: string;     // Tiketin monimutkaisuus
  category?: string;       // Tiketin kategoria
  userProfile?: string;    // Käyttäjäprofiili, jonka nimissä tiketti luodaan
  assignToId?: string;     // Mahdollinen suora osoitus tukihenkilölle
}): Promise<GeneratedTicket>
```

Agentti käyttää konfiguroitua kielimallia generoidakseen strukturoidun tiedon tiketistä ja palauttaa sen muodossa, joka voidaan suoraan tallentaa tietokantaan.

### Promptit

Tikettien generointiin käytetään tarkasti suunniteltua promptia, joka ohjaa tekoälyä luomaan realistisia ja relevantteja tikettejä. Prompt sisältää ohjeita eri vaikeustasojen tikettien luomiseen ja varmistaa, että tiketit vastaavat todellisia IT-tuen ongelmia koulutusympäristössä.

Prompt määrittelee tiketin rakenteen ja ohjaa tekoälyä lisäämään asianmukaisia yksityiskohtia eri vaikeustasoilla:
- **Helppo**: Yksinkertaiset, helposti diagnosoitavat ongelmat
- **Keskitaso**: Keskitason tekniset ongelmat, joissa on syvempää teknistä sisältöä
- **Haastava**: Monimutkaiset ongelmat, jotka voivat sisältää useita ongelmia tai vaativat syvempää teknistä osaamista

### API-rajapinnat

#### Tiketin generointi

```
POST /api/ai/generate-ticket
```

Parametrit:
- `complexity`: Tiketin vaikeustaso ('simple', 'moderate', 'complex')
- `category`: Tiketin kategoria (kategorian ID tai nimi)
- `userProfile`: Käyttäjäprofiili ('student', 'teacher', 'staff', 'administrator')
- `assignToId`: (Valinnainen) Tukihenkilön ID, jolle tiketti osoitetaan

Vastaus:
```json
{
  "ticket": {
    "id": "clsj2n9g0000dtp97zr5lqw3x",
    "title": "Näyttö vilkkuu satunnaisesti",
    "description": "Luokkahuoneen tietokoneen näyttö vilkkuu...",
    ...
  },
  "isAiGenerated": true
}
```

#### Konfiguraation haku

```
GET /api/ai/config
```

Vastaus:
```json
{
  "complexityOptions": ["simple", "moderate", "complex"],
  "categoryOptions": [
    { "id": "clsj2n9g0000dtp97zr5lqw3x", "name": "Tekniset ongelmat" },
    { "id": "clsj2n9g0000etp97zr5lqw3z", "name": "Yleinen" }
  ],
  "userProfileOptions": ["student", "teacher", "staff", "administrator"]
}
```

## Konfigurointi

### Ympäristömuuttujat

Järjestelmä käyttää seuraavia ympäristömuuttujia:

```
# OpenAI API -konfiguraatio
OPENAI_API_KEY=your_api_key_here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_COMPLETION_MODEL=gpt-4o-mini
OPENAI_ADVANCED_MODEL=gpt-4o-mini

# Tekoälyn konfiguraatio
AI_RATE_LIMIT_ENABLED=true
AI_RATE_LIMIT_MAX_REQUESTS=60
AI_RATE_LIMIT_TIME_WINDOW=60
```

### OpenAI-asetukset

Järjestelmä on optimoitu käyttämään OpenAI:n uusimpia malleja:

- `gpt-4o-mini`: Oletusarvoisesti käytetty pienempi malli, joka tarjoaa hyvän tasapainon tehokkuuden ja kustannusten välillä
- `text-embedding-3-small`: Vektoriupotuksiin käytetty malli (tulevaa käyttöä varten)
- `gpt-4o`: Edistyneempi malli, jota voidaan käyttää monimutkaisempiin tehtäviin

## Tulevat ominaisuudet

### Suunniteltu kehityskartta

Tulossa olevia ominaisuuksia:

1. **AI-avusteinen tikettien kommentointi**
   - Tekoäly voi vastata harjoitustiketteihin opiskelijoiden puolesta, simuloiden todellista käyttäjää

2. **Automaattinen tikettien luonti**
   - Ajastettu tikettien luonti, joka simuloi todellista tikettivirtaa

3. **IT-tuen assistentti**
   - Tekoälyassistentti, joka auttaa opiskelijoita ratkaisemaan tikettejä tarjoamalla ehdotuksia ja lisätietoja

4. **Tietopohjainen tukijärjestelmä**
   - Järjestelmä, joka hakee ja tarjoaa relevanttia tietoa tikettien ratkaisemiseksi 