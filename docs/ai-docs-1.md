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

### Tikettien analyysi

Tarjoaa admin-käyttäjille näkymän AI-generoitujen tikettien ja niihin liittyvien keskustelujen analysointiin.

- **Toiminnallisuus**: Listaa kaikki AI-generoidut tiketit ja näyttää perustiedot (ID, otsikko, kategoria, tila, luontiaika, vastuuhenkilö) sekä `chatAgent`-kommenttien määrän.
- **Keskustelunäkymä**: Avaa modaalin, jossa näkyy valitun AI-tiketin täysi keskusteluhistoria. 
  - Erottaa selkeästi tukihenkilön ja `chatAgent`:in kommentit.
  - Näyttää `chatAgent`:in arvion tukihenkilön edistymisestä kohti ratkaisua (EARLY, PROGRESSING, CLOSE, SOLVED, ERROR) jokaisen AI-kommentin yhteydessä, sisältäen selittävän tooltipin.
- **Ratkaisun tarkastelu**: 
  - Modaali sisältää laajennettavan osion, josta näkee tiketin AI-generoidun malliratkaisun.
  - Tarjoaa painikkeen, jolla ratkaisun voi avata erilliseen ikkunaan keskustelumodaalin viereen.
- **Responsiivisuus**: Keskustelu- ja ratkaisuikkunat asettuvat päällekkäin pienemmillä näytöillä ja vierekkäin suuremmilla.
- **Käyttöoikeudet**: Saatavilla vain käyttäjille, joilla on ADMIN-rooli.
- **Sijainti**: Löytyy AI Tools -sivun "Tikettien analyysi" -välilehdeltä.

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

# Tekoälyominaisuudet

Järjestelmä sisältää useita tekoälyavusteisia toimintoja, joiden tarkoitus on tehostaa tukihenkilöiden työskentelyä ja koulutusta.

## Käytettävissä olevat tekoälyominaisuudet

1. **Tikettien generaattori**
   - Luo realistisia harjoitustikettejä koulutuskäyttöön
   - Mahdollisuus mukauttaa tiketin kompleksisuutta, kategoriaa ja käyttäjäprofiilia
   - Automaattinen ratkaisu ja vastausohjeet
   - Saatavilla admin- ja tukikäyttäjille AI Tools -näkymässä

2. **Keskustelusimulaatio**
   - Simuloi käyttäjää harjoitustikettien keskusteluissa
   - Reagoi tukihenkilön ehdottamiin ratkaisuihin tilanteen edistymisen mukaan
   - Ohjaa keskustelua kohti oikeaa ratkaisua
   - Aktivoituu automaattisesti kun tukihenkilö kommentoi AI-generaitua tikettiä

## Tikettien generaattori

Tikettien generaattori on tekoälyavusteinen työkalu, joka luo realistisia IT-tukitikettejä harjoituskäyttöön. Tämä mahdollistaa tukihenkilöiden kouluttamisen todentuntuisissa tilanteissa ilman todellisia käyttäjien ongelmia.

### Ominaisuudet

- Monipuoliset parametrit (kompleksisuus, kategoria, käyttäjäprofiili)
- Automaattinen prioriteettimääritys vaikeustason perusteella
- Erilaisia vastausmuotoja (teksti, kuva, video)
- Mahdollisuus osoittaa harjoitustiketti tietylle tukihenkilölle
- Jokaiseen tikettiin luodaan yksityiskohtainen ratkaisu, jossa määritellään selkeästi mikä toimenpide ratkaisi ongelman

### Käyttö

1. Siirry AI Tools -sivulle navigaatiovalikosta
2. Valitse "Tikettien generaattori"
3. Määritä parametrit haluamallasi tavalla
4. Paina "Luo harjoitustiketti"

**Dokumentaatio**: Katso täydelliset tiedot tikettigeneraattorista [tämän linkin kautta](./ai-agents/ticketGenerator.md).

## Keskustelusimulaatio

Keskustelusimulaatio on tekoälyagentti, joka simuloi käyttäjää harjoitustikettien keskusteluissa. Agentti reagoi tukihenkilön ehdottamiin ratkaisuihin ja ohjaa keskustelua kohti oikeaa ratkaisua todellisen käyttäjän tapaan.

### Ominaisuudet

- Automaattinen aktivointi tukihenkilön kommentoidessa
- Realistinen kommunikointi teknisen osaamistason mukaan
- Edistymisen arviointi vertaamalla tukihenkilön ehdotuksia oikeaan ratkaisuun
- Tilanteeseen sopiva tunneilmaisu (hämmennys, innostus, kiitollisuus)
- Johdonmukainen keskusteluhistorian seuranta

### Käyttö

Keskustelusimulaatio aktivoituu automaattisesti, kun:
1. Tukihenkilö tai admin kommentoi AI-generoituun tikettiin
2. Järjestelmä analysoi kommentin sisällön
3. Agentti tuottaa käyttäjän vastauksen perustuen edistymiseen

**Dokumentaatio**: Katso täydelliset tiedot keskustelusimulaatiosta [tämän linkin kautta](./ai-agents/chatAgent.md).

## Rajoitukset

- Tekoälyominaisuudet ovat saatavilla vain ADMIN ja SUPPORT -käyttäjäroolien käyttäjille
- Tekoäly ei korvaa todellista käyttäjätestausta tai koulutusta
- AI-ominaisuudet voivat vaatia hienosäätöä täydellisen realismin saavuttamiseksi

## Tulossa olevat ominaisuudet

Kehitteillä olevat tekoälyominaisuudet:
- Tikettien automaattinen luokittelu ja priorisointi
- Tietämyskannan integraatio ja hakutoiminnot
- Vastausehdotusten generointi tukihenkilöille
- Tikettihistorian analyysi ja trendit

---
