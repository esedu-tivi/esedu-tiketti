# Tekoälytyökalut - Dokumentaatio

Tämä dokumentti tarjoaa yleiskatsauksen tikettijärjestelmän tekoälytyökalujen toteutuksesta. Yksityiskohtaiset tiedot tekoälyagenteista löytyvät [ai-agents](./ai-agents/index.md) hakemistosta.

## Sisällysluettelo
- [Yleiskatsaus](#yleiskatsaus)
- [Tekoälytyökalut](#tekoälytyökalut)
- [Tekninen arkkitehtuuri](#tekninen-arkkitehtuuri)
- [Hakemistorakenne](#hakemistorakenne)
- [Dokumentaatiorakenne](#dokumentaatiorakenne)
- [Riippuvuudet](#riippuvuudet)
- [Konfiguraatio](#konfiguraatio)
- [Tulevat ominaisuudet](#tulevat-ominaisuudet)
- [Vianetsintä](#vianetsintä)

## Yleiskatsaus

Tekoälytyökalut laajentavat tikettijärjestelmän toiminnallisuutta tekoälyominaisuuksilla, jotka parantavat tukiprosesseja, koulutusta ja tikettien hallintaa. Ensimmäinen toteutettu työkalu on harjoitustikettien generaattori, joka luo realistisia tukipyyntöjä koulutuskäyttöön.

## Tekoälytyökalut

Järjestelmässä on toteutettu seuraavat tekoälytyökalut:

### Harjoitustikettien generaattori

Generoi realistisia IT-tukipyyntöjä koulutuskäyttöön, käyttäen tekoälyä niiden luomiseen. Työkalu tarjoaa erilaisia parametreja, joilla luotavan tiketin vaikeustasoa, kategoriaa ja muita ominaisuuksia voidaan säätää.

**Käyttöoikeudet**: Saatavilla vain käyttäjille, joilla on ADMIN- tai SUPPORT-rooli.

**Dokumentaatio**: Katso täydelliset tiedot tikettigeneraattorista [tämän linkin kautta](./ai-agents/ticketGenerator.md).

## Tekninen arkkitehtuuri

### LangChain.js-integraatio

Tekoälytyökalut on rakennettu käyttäen LangChain.js-kirjastoa, joka tarjoaa kehyksen kielimalleihin perustuvien sovellusten kehittämiseen. Tärkeimmät komponentit ovat:

- **PromptTemplates**: Strukturoidut mallipohjat tekoälyn tuottaman sisällön ohjaamiseen
- **OpenAI-integraatio**: Yhteys OpenAI:n kielimalleihin
- **Agentit**: Erikoistuneet tekoälykomponentit tiettyjä tehtäviä varten (dokumentoitu [ai-agents](./ai-agents/index.md) hakemistossa)
- **Työkalut**: Mukautetut funktiot, joita tekoäly voi käyttää tehtävien suorittamiseen

## Hakemistorakenne

```
backend/
├── src/
│   ├── ai/
│   │   ├── agents/
│   │   │   └── ticketGeneratorAgent.ts  # Tikettien generointiagentti
│   │   ├── config/
│   │   │   └── aiConfig.ts              # Tekoälyn konfiguraatioasetukset
│   │   ├── prompts/
│   │   │   └── ticketPrompts.ts         # Promptit tikettien generointiin
│   │   └── tools/                       # Agentin käyttämät työkalut
│   ├── controllers/
│   │   └── aiController.ts              # API-päätepisteet tekoälytoiminnoille
│   └── routes/
│       └── aiRoutes.ts                  # Reittimäärittelyt tekoälyominaisuuksille
│
frontend/
├── src/
│   ├── components/
│   │   └── Admin/
│   │       └── AITicketGenerator.jsx    # Tikettien generaattorikomponentti
│   └── pages/
│       └── AITools.jsx                  # Tekoälytyökalujen pääsivu välilehdillä
```

## Dokumentaatiorakenne

Tekoälytoiminnallisuuksien dokumentaatio on jaettu seuraavasti:

```
docs/
├── ai-docs.md                      # Yleiskatsaus tekoälytyökaluihin
└── ai-agents/                      # Yksityiskohtainen agenttidokumentaatio
    ├── index.md                    # Agenttien yleiskatsaus
    └── ticketGenerator.md          # Tikettien generointiagentin dokumentaatio
```

## Riippuvuudet

Tekoälytyökalujen toteutus perustuu seuraaviin tärkeisiin riippuvuuksiin:

- **LangChain.js**: Kehys kielimalleihin perustuvien sovellusten rakentamiseen
- **OpenAI API**: Tarjoaa kielimallien toiminnallisuuden
- **Axios**: Frontend-backend-kommunikaatioon
- **React**: Frontend-käyttöliittymäkomponentteihin
- **Express**: Backend API -päätepisteisiin

## Konfiguraatio

### API-avaimet

Järjestelmä vaatii toimiakseen OpenAI API -avaimen. Tämä avain tulee tallentaa turvallisesti ympäristömuuttujiin:

```
OPENAI_API_KEY=your_api_key_here
```

### Malliasetukset

Tekoälyn asetuksia voidaan konfiguroida `aiConfig.ts`-tiedostossa. Yksityiskohtainen konfiguraatio on dokumentoitu [ai-agents](./ai-agents/index.md) hakemistossa.

## Tulevat ominaisuudet

Suunnitellut parannukset tekoälytyökaluihin sisältävät:

1. **Tikettien luokittelu**: Tulevien tikettien automaattinen kategorisointi
2. **Vastausgeneraattori**: Tekoälyavusteiset vastausehdotukset tukihenkilöille
3. **Tietämyskannan integraatio**: Tekoälytyökalujen yhdistäminen sisäiseen tietämyskantaan
4. **Historiatietojen analyysi**: Kuvioiden tunnistus ja näkemykset tikettihistoriasta
5. **Mielipideanalyysi**: Käyttäjien tyytyväisyyden ja kiireellisyyden tunnistaminen tiketeissä

Tulevista agenteista on lisätietoa [ai-agents/index.md](./ai-agents/index.md) dokumentissa.

## Vianetsintä

Yleisiä ongelmia ja niiden ratkaisuja:

1. **Generointivirheet**: Jos tiketin generointi epäonnistuu, tarkista, että OpenAI API -avain on voimassa ja että siinä on riittävästi käyttöoikeuksia
2. **Epärealistiset tiketit**: Säädä prompteja tiedostossa `ticketPrompts.ts` parantaaksesi tulosten laatua
3. **Suorituskykyongelmat**: Harkitse välimuististrategioiden käyttöä usein generoidulle sisällölle
4. **Kieliongelmat**: Jos tiketit eivät generoidu suomeksi, tarkista että promptissa on selkeät ohjeet suomen kielen käytöstä
5. **Vastausmuoto-ongelmat**: Jos vastausmuodon valinta ei toimi, varmista että frontend lähettää oikean parametrin ja että agentti käsittelee sen oikein

---
