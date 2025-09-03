# ChatAgent-agentti

ChatAgent on tekoälyagentti, joka simuloi käyttäjää harjoitustikettien keskusteluissa. Se mahdollistaa tukihenkilöiden kouluttamisen todellisen tuntuisissa asiakaspalvelutilanteissa.

## Toimintaperiaate

ChatAgent aktivoituu automaattisesti, kun tukihenkilö vastaa AI-generoituun harjoitustikettiin. Agentti käyttää kahden vaiheisen LLM-prosessin:

1. **Edistymisen arviointi**: Ensin arvioidaan erillisellä LLM-kutsulla, kuinka lähellä tukihenkilön vastaus on oikeaa ratkaisua
2. **Vastauksen generointi**: Arvioinnin perusteella generoidaan kontekstiin sopiva käyttäjän vastaus

Vastaus mukautuu:
- Käyttäjän teknisen osaamistason mukaan (määritetään tiketin prioriteetin perusteella)
- Ongelman tyypin ja monimutkaisuuden mukaan
- Keskustelun tähänastisen etenemisen mukaan
- Edistymisarvion tuloksen mukaan (EARLY/PROGRESSING/CLOSE/SOLVED)

## Ominaisuudet

### Automaattinen aktivoituminen

- Agentti aktivoituu, kun tukihenkilö kommentoi AI-generoitua tikettiä
- Ei vaadi erillistä käynnistystä tai konfiguraatiota
- Toimii saumattomasti osana tikettijärjestelmää

### Edistymisen arviointi

Agentti käyttää neliportaista arviointiasteikkoa:

- **EARLY**: Tukihenkilö ehdottaa yleisiä toimenpiteitä, ei tunnista varsinaista ongelmaa
- **PROGRESSING**: Oikea ongelma-alue tunnistettu, mutta ratkaisusta puuttuu tarkkuutta
- **CLOSE**: Lähellä ratkaisua, puuttuu vain pieniä yksityiskohtia
- **SOLVED**: Keskeinen ratkaisu löydetty, käyttäjä saisi ongelman ratkaistua

**Erityishuomio**: Arviointi on joustava - tärkeintä on ratkaisun toimivuus käytännössä, ei täydellinen vastaavuus dokumentoidun ratkaisun kanssa

### Realistinen kommunikointi

Tekninen taso määräytyy automaattisesti tiketin prioriteetin perusteella:
- **LOW priority** → Vähäinen tekninen osaaminen (yksinkertainen kieli)
- **MEDIUM priority** → Keskitasoinen osaaminen (seuraa ohjeita)
- **HIGH/CRITICAL priority** → Hyvä tekninen osaaminen (ymmärtää monimutkaisia ohjeita)

Käyttäjäprofiili vaikuttaa kommunikaatiotyyliin:
- **student**: Opiskelija, epävarma teknisistä termeistä
- **teacher**: Opettaja, odottaa nopeaa ratkaisua
- **staff**: Henkilökunta, käytännönläheinen lähestymistapa

### Tunneilmaisu

Agentti ilmaisee tilanteeseen sopivia tunteita:

- **Turhautuminen**: Kun ongelma pitkittyy
- **Helpotus**: Kun ongelma ratkeaa
- **Hämmennys**: Vastattaessa teknisiin kysymyksiin, joita käyttäjä ei ymmärrä
- **Kiitollisuus**: Kun tukihenkilö ratkaisee ongelman

## Tekninen toteutus

### Arkkitehtuuri

ChatAgent on toteutettu `ChatAgent`-luokkana, joka käyttää LangChain-kirjastoa ja OpenAI:n API:a:

```typescript
interface ChatResponseParams {
  ticket: {
    id: string;
    title: string;
    description: string;
    device: string;
    priority: string;
    categoryId: string;
    userProfile?: string;
    createdById: string;
    additionalInfo?: string;
  };
  comments: CommentData[];
  newSupportComment: string;
  supportUserId: string;
  solution?: string | null;
}

interface ChatAgentResponse {
  responseText: string;
  evaluation: string; // EARLY, PROGRESSING, CLOSE, SOLVED
}

class ChatAgent {
  // Agentin päämetodi
  async generateChatResponse(params: ChatResponseParams): Promise<ChatAgentResponse>;
  
  // Yksityinen metodi edistymisen arviointiin
  private async evaluateSolutionProgressWithLLM(...): Promise<string>;
}
```

### Integraatiopisteet

- `AIController` - Käsittelee API-pyynnöt ja kutsuu agenttia
- `Prisma` - Hakee kategoriatiedot ja käyttäjätiedot tietokannasta
- `AI_CONFIG` - Keskitetty konfiguraatio OpenAI API:lle
- Promptit - Erillinen `CHAT_AGENT_PROMPT` ja `PROGRESS_EVALUATION_PROMPT`

### Kahden vaiheinen LLM-prosessi

1. **Edistymisen arviointi** (`evaluateSolutionProgressWithLLM`):
   - Vertaa tukihenkilön kommenttia oikeaan ratkaisuun
   - Huomioi koko keskusteluhistorian
   - Palauttaa arvion: EARLY, PROGRESSING, CLOSE tai SOLVED

2. **Vastauksen generointi** (`generateChatResponse`):
   - Käyttää edistymisarviota kontekstina
   - Sisällyttää käyttäjäprofiilin ja teknisen tason
   - Generoi tilanteeseen sopivan vastauksen

## Käyttöesimerkkejä

### Esimerkki 1: Oikea ratkaisu

**Tukihenkilö**: "Kokeilepa avata Windowsin käynnistysvalikko ja kirjoita 'järjestelmänhallinta'. Avaa se ja etsi sieltä 'Laitehallinta'. Katso näkyykö siellä keltaisia huutomerkkejä näytönohjaimen kohdalla?"

**ChatAgent**: "Hetkinen, kokeilen... Löysin järjestelmänhallinnan ja laitehallinta on nyt auki. Tosiaan, näytönohjaimen kohdalla on keltainen huutomerkki! Mitä se tarkoittaa?"

### Esimerkki 2: Osittainen ratkaisu

**Tukihenkilö**: "Sinun kannattaa käynnistää tietokone uudelleen ja katsoa ratkeaako ongelma."

**ChatAgent**: "Kokeilin käynnistää tietokoneen uudelleen, mutta sama ongelma jatkuu. Näytön resoluutio on edelleen todella pieni ja kaikki näyttää suurelta. Pitäisikö minun tehdä jotain muuta?"

### Esimerkki 3: Väärä ratkaisu

**Tukihenkilö**: "Kokeile tyhjentää selaimen välimuisti."

**ChatAgent**: "Tyhjensin selaimen välimuistin ohjeiden mukaan, mutta se ei vaikuttanut mitenkään tulostusongelmaani. Tulostin ei edelleenkään löydy, kun yritän tulostaa dokumenttia."

## Rajoitukset

- Agentti ei pysty simuloimaan kaikkia mahdollisia käyttäjän reaktioita
- Ei voi suorittaa todellisia järjestelmätoimenpiteitä (esim. kuvakaappauksia tai lokien lähettämistä)
- Simuloidut vastaukset voivat joskus vaikuttaa tekoälypohjaisilta
- Vaatii, että tiketillä on määritelty ratkaisu (`solution`) toimiakseen oikein
- Tekninen taso sidottu prioriteettiin, ei voida määrittää erikseen

## Vinkkejä tukihenkilöille

1. Kohtele agenttia kuin todellista käyttäjää
2. Kysy tarkentavia kysymyksiä saadaksesi lisätietoa
3. Selitä ratkaisuehdotuksesi selkeästi
4. Varmista että käyttäjä on ymmärtänyt ohjeet

## Jatkokehitys

Suunnitellut parannukset:
- Monimutkaisempien käyttäjäprofiilien tuki
- Personointiasetukset agentin käyttäytymiselle
- Kuvakaappausten tai liitetiedostojen simulointi
- Monimutkaisempien dialogi-skenaarioiden tuki
- Siirtyminen modernimpaan yhden LLM-kutsun arkkitehtuuriin (ModernChatAgent)
- Streaming-tuki reaaliaikaisille vastauksille

## Lokitus

ChatAgent käyttää kattavaa lokitusta debuggausta varten:
- Tiketin kontekstitiedot
- Edistymisarvion tulokset
- LLM-kutsujen suoritusajat
- Generoitujen vastausten pituudet
- Virhetilanteiden käsittely

Lokitustaso voidaan säätää `logger`-konfiguraatiosta. 