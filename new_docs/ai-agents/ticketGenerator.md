# Harjoitustikettien generointisovellusagentti

`TicketGeneratorAgent` on tekoälyagentti, joka on suunniteltu luomaan realistisia harjoitustikettejä koulutuskäyttöön.

## Agentin toimintaperiaate (Uusi Esikatselu/Vahvistus-malli)

Generointiprosessi on kaksivaiheinen:

**1. Esikatselun luonti (`generateTrainingTicketPreview` kontrollerifunktio):**
   - Vastaanottaa käyttäjän määrittämät parametrit (vaikeustaso, kategoria, käyttäjäprofiili, jne.).
   - Kääntää `userProfile`-parametrin suomeksi (esim. 'student' -> 'Opiskelija') promptia varten.
   - Validoi parametrit ja varmistaa niiden kelvollisuuden.
   - Muodostaa strukturoidun promptin (`TICKET_GENERATOR_PROMPT`) parametrien pohjalta.
   - Lähettää promptin OpenAI:n kielimallille luodakseen tiketin tiedot (otsikko, kuvaus, laite, jne.).
   - Parsii ja validoi vastaukseksi saadun JSON-datan.
   - Täyttää puuttuvat tai virheelliset kentät (prioriteetti, vastausmuoto) oletusarvoilla tai käyttäjän antamilla arvoilla.
   - **Kutsuu `generateSolutionForPreview` -metodia** luodakseen ratkaisun generoidun tikettidatan perusteella (ilman tallennettua ID:tä).
   - Palauttaa sekä generoidun `ticketData`-objektin että `solution`-tekstin frontendille esikatselua varten.

**2. Vahvistus ja luonti (`confirmTrainingTicketCreation` kontrollerifunktio):**
   - Vastaanottaa frontendilta aiemmin generoidun `ticketData`-objektin, `solution`-tekstin ja alkuperäisen `complexity`-parametrin.
   - Validoi vastaanotetut tiedot.
   - **Tallentaa tiketin** tietokantaan käyttäen `ticketService.createTicket`.
   - Merkitsee tiketin `isAiGenerated`-lipulla.
   - **Tallentaa esikatseluvaiheessa generoidun ratkaisun** `KnowledgeArticle`-tietueena tietokantaan.
   - Mahdollisesti osoittaa tiketin tukihenkilölle, jos `assignedToId` oli määritelty.
   - Palauttaa lopullisen, tallennetun tikettiobjektin (ja ratkaisun) frontendille.

## Ominaisuudet

- **Esikatselu ja vahvistus**: Käyttäjä näkee generoidun tiketin ja ratkaisun ennen sen lopullista luomista.
- **Kontekstualisoitu generointi**: Käyttää suomenkielistä `userProfile`-tietoa tiketöintipromptissa tarkemman lopputuloksen saavuttamiseksi.
- **Parametrisoitavuus**: Monipuoliset parametrit tiketin luonnin ohjaamiseen.
- **Virheidensietokyky**: Automaattinen virheellisten tai puuttuvien tietojen korjaus (prioriteetti, vastausmuoto).
- **Kategorianhaku**: Tukee sekä UUID-ID:tä että kategorianimeä.
- **Priorisointi**: Automaattinen priorisointi vaikeustason perusteella.
- **Vastausmuodon ylitys**: Mahdollisuus ohittaa AI:n ehdottama vastausmuoto käyttäjän valinnalla.
- **Ratkaisuntuottaja**: Luo tikettiin strukturoidun ratkaisun jo esikatseluvaiheessa.
- **Kattava lokitus**: Sisältää `console.debug`-lokeja toiminnan seuraamiseksi.

## Tekninen sijainti

Agentin toteutus sijaitsee tiedostossa:
```
backend/src/ai/agents/ticketGeneratorAgent.ts
```

Promptit sijaitsevat hakemistossa:
```
backend/src/ai/prompts/
```

## Käyttöoikeudet

Agentin käyttö on rajattu vain `ADMIN` ja `SUPPORT` -käyttäjäroolien käyttöön.

## Tuetut parametrit (Esikatselun luonti)

Esikatselun luonti (`/api/ai/generate-ticket-preview`) tukee seuraavia parametreja request bodyssä:

| Parametri | Tyyppi | Pakollisuus | Kuvaus |
|-----------|--------|-------------|--------|
| complexity | string | Pakollinen | Tiketin vaikeustaso (simple, moderate, complex) |
| category | string | Pakollinen | Kategoria-ID tai kategorian nimi |
| userProfile | string | Pakollinen | Käyttäjäprofiili (student, teacher, staff, administrator) |
| assignToId | string | Valinnainen | Tukihenkilön ID, jolle tiketti osoitetaan (vaikuttaa esikatseluun ja lopulliseen tikettiin) |
| responseFormat | string | Valinnainen | Haluttu vastausmuoto (TEKSTI, KUVA, VIDEO) |

## Tuetut parametrit (Vahvistus)

Tiketin vahvistus (`/api/ai/confirm-ticket-creation`) odottaa seuraavia parametreja request bodyssä:

| Parametri | Tyyppi | Pakollisuus | Kuvaus |
|-----------|--------|-------------|--------|
| ticketData | object | Pakollinen | `/generate-ticket-preview`-päätepisteen palauttama tikettidataobjekti |
| solution | string | Pakollinen | `/generate-ticket-preview`-päätepisteen palauttama ratkaisuteksti |
| complexity | string | Pakollinen | Alkuperäinen vaikeustaso (tarvitaan KnowledgeArtikkelin tallennukseen) |


## Vastausmuodot

Tikettigeneraattori tukee kolmea eri vastausmuotoa:
- **TEKSTI**: Tekstimuotoinen vastaus tikettiin
- **KUVA**: Tikettiin odotetaan kuvavastausta
- **VIDEO**: Tikettiin odotetaan videovastaus

Vastausmuoto määritellään joko tekoälyn toimesta tai käyttäjä voi ohittaa sen valitsemalla halutun muodon käyttöliittymästä.

## Ratkaisun generoiminen

Ratkaisu generoidaan nykyään **esikatseluvaiheessa** käyttäen `TicketGeneratorAgent`-luokan `generateSolutionForPreview`-metodia. Tämä metodi vastaanottaa generoidut tikettitiedot (mutta ei ID:tä) ja luo ratkaisun niiden pohjalta.

Ratkaisu näytetään käyttäjälle esikatselun yhteydessä ja tallennetaan `KnowledgeArticle`-tietueena tietokantaan vasta, kun käyttäjä **vahvistaa** tiketin luonnin.

Ratkaisu sisältää edelleen:
1. **Ongelman analyysi ja juurisyy**
2. **Vaiheittaiset toimenpiteet**
3. **Vaihtoehtoiset ratkaisut**
4. **Lopullinen ratkaisu**

Ratkaisu tallennetaan KnowledgeArticle-tietueena tietokantaan, ja siihen voidaan viitata tiketin 
käsittelyn yhteydessä.
Erillinen API-päätepiste `/api/ai/tickets/:ticketId/solution` ja agentin `generateSolution(ticketId: string)`-metodi ovat edelleen olemassa, jotta ratkaisu voidaan hakea tai tarvittaessa generoida uudelleen *olemassa olevalle* tiketille sen ID:n perusteella.

## Integraatio järjestelmään

Tikettigeneraattori on integroitu järjestelmään seuraavien komponenttien kautta:

1. **Backend**:
   - API-päätepisteet: 
     - `/api/ai/generate-ticket-preview` (Esikatselun luonti)
     - `/api/ai/confirm-ticket-creation` (Vahvistus ja tallennus)
     - `/api/ai/tickets/:ticketId/solution` (Olemassa olevan ratkaisun haku/luonti)
   - Kontrolleri: `backend/src/controllers/aiController.ts`
   - Autentikaatio: Rajoitettu ADMIN ja SUPPORT -käyttäjille

2. **Frontend**:
   - Käyttöliittymä: `frontend/src/components/Admin/AITicketGenerator.jsx`
   - Sivu: `frontend/src/pages/AITools.jsx`
   - Navigaatio: Saatavilla headerissa ja mobiilinavigaatiossa

## Virheidenkäsittely

Agentin virheenkäsittely kattaa edelleen vastaavat tilanteet, mutta virheet voivat ilmetä sekä esikatselu- että vahvistusvaiheessa.

## Kehityskohteet

Tulevissa versioissa on suunnitteilla seuraavia parannuksia:

1. Lisätä tuki useammille vastausmuodoille
2. Kehittää kategoria-kohtaisia prompteja realistisempien tikettien luomiseksi
3. Integroida olemassa olevien tikettien historiatietoja oppimateriaaliksi agentille
4. Implementoida automaattinen tikettien generointi harjoitustietokantaan 
5. Lisätä hakutoiminto tikettiratkaisujen tietämyskannasta vanhojen tapausten perusteella 