# ChatAgent-agentti

ChatAgent on tekoälyagentti, joka simuloi käyttäjää harjoitustikettien keskusteluissa. Se mahdollistaa tukihenkilöiden kouluttamisen todellisen tuntuisissa asiakaspalvelutilanteissa.

## Toimintaperiaate

ChatAgent aktivoituu automaattisesti, kun tukihenkilö vastaa AI-generoituun harjoitustikettiin. Agentti analysoi tukihenkilön vastauksen, vertaa sitä tiketin ratkaisuun ja tuottaa käyttäjän vastauksen, joka on linjassa:

1. Käyttäjän teknisen osaamistason kanssa
2. Ongelman tyypin ja monimutkaisuuden kanssa
3. Keskustelun tähänastisen etenemisen kanssa

**Huom:** Agentille annetaan käyttäjäprofiili (`userProfile`) suomenkielisenä (esim. 'Opiskelija', 'Opettaja'), jotta se voi paremmin mukauttaa vastaustyylinsä.

## Ominaisuudet

### Automaattinen aktivoituminen

- Agentti aktivoituu, kun tukihenkilö kommentoi AI-generoitua tikettiä
- Ei vaadi erillistä käynnistystä tai konfiguraatiota
- Toimii saumattomasti osana tikettijärjestelmää

### Edistymisen arviointi

Agentti arvioi tukihenkilön ehdottamien ratkaisujen laatua:

- **Oikea ratkaisu**: Vastaa kiitollisuudella ja vahvistaa ongelman ratkeamisen
- **Osittainen ratkaisu**: Antaa lisätietoja tai tarkentavia kysymyksiä
- **Väärä ratkaisu**: Ilmaisee kohteliaasti, että ongelma jatkuu

### Realistinen kommunikointi

- Mukautuu käyttäjäprofiilin tekniseen tasoon:
  - **Aloittelija**: Käyttää yksinkertaista kieltä, vähän teknistä sanastoa
  - **Keskitaso**: Pystyy seuraamaan ohjeita, tarvitsee selkeät vaiheet
  - **Edistynyt**: Kykenee tekniseen keskusteluun ja ymmärtää monimutkaisia ohjeita

### Tunneilmaisu

Agentti ilmaisee tilanteeseen sopivia tunteita:

- **Turhautuminen**: Kun ongelma pitkittyy
- **Helpotus**: Kun ongelma ratkeaa
- **Hämmennys**: Vastattaessa teknisiin kysymyksiin, joita käyttäjä ei ymmärrä
- **Kiitollisuus**: Kun tukihenkilö ratkaisee ongelman

## Tekninen toteutus

### Arkkitehtuuri

ChatAgent on toteutettu `ChatAgent`-luokkana, joka integroituu tikettijärjestelmän kommentointitoiminnallisuuteen:

```typescript
class ChatAgent {
  // Agentin päämetodi
  generateUserResponse(
    ticketData: TicketData,
    supportComment: string,
    conversationHistory: Comment[]
  ): Promise<string>;

  // Apumetodi edistymisen arviointiin
  evaluateProgress(
    supportComment: string, 
    solution: string
  ): ProgressLevel;
}
```

### Integraatiopisteet

- `CommentController` - Aktivoi agentin kommenttia lisättäessä
- `TicketService` - Hakee tiketin tiedot ja ratkaisun agentin käyttöön
- `UserService` - Hakee käyttäjäprofiilin määrittämään kommunikaatiotyyliä

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