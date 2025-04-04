# Harjoitustikettien generointisovellusagentti

`TicketGeneratorAgent` on tekoälyagentti, joka on suunniteltu luomaan realistisia harjoitustikettejä koulutuskäyttöön.

## Agentin toimintaperiaate

Agentti toimii seuraavasti:
1. Vastaanottaa käyttäjän määrittämät parametrit (vaikeustaso, kategoria, käyttäjäprofiili, jne.)
2. Validoi parametrit ja varmistaa niiden kelvollisuuden
3. Muodostaa strukturoidun promptin parametrien pohjalta
4. Lähettää promptin OpenAI:n kielimallille
5. Parsii ja validoi vastaukseksi saadun JSON-datan
6. Täyttää puuttuvat tai virheelliset kentät oletusarvoilla
7. Palauttaa valmiin tiketin datan tietokantaan tallennettavaksi

## Ominaisuudet

- **Parametrisoitavuus**: Monipuoliset parametrit tiketin luonnin ohjaamiseen
- **Virheidensietokyky**: Automaattinen virheellisten tai puuttuvien tietojen korjaus
- **Kategorianhaku**: Tukee sekä UUID-ID:tä että kategorianimeä
- **Priorisointi**: Automaattinen priorisointi vaikeustason perusteella
- **Vastausmuodon ylitys**: Mahdollisuus ohittaa AI:n ehdottama vastausmuoto käyttäjän valinnalla

## Tekninen sijainti

Agentin toteutus sijaitsee tiedostossa:
```
backend/src/ai/agents/ticketGeneratorAgent.ts
```

## Käyttöoikeudet

Agentin käyttö on rajattu vain `ADMIN` ja `SUPPORT` -käyttäjäroolien käyttöön.

## Tuetut parametrit

Tikettigeneraattori tukee seuraavia parametreja:

| Parametri | Tyyppi | Pakollisuus | Kuvaus |
|-----------|--------|-------------|--------|
| complexity | string | Pakollinen | Tiketin vaikeustaso (simple, moderate, complex) |
| category | string | Pakollinen | Kategoria-ID tai kategorian nimi |
| userProfile | string | Pakollinen | Käyttäjäprofiili (student, teacher, staff, administrator) |
| assignToId | string | Valinnainen | Tukihenkilön ID, jolle tiketti osoitetaan |
| responseFormat | string | Valinnainen | Haluttu vastausmuoto (TEKSTI, KUVA, VIDEO) |

## Vastausmuodot

Tikettigeneraattori tukee kolmea eri vastausmuotoa:
- **TEKSTI**: Tekstimuotoinen vastaus tikettiin
- **KUVA**: Tikettiin odotetaan kuvavastausta
- **VIDEO**: Tikettiin odotetaan videovastaus

Vastausmuoto määritellään joko tekoälyn toimesta tai käyttäjä voi ohittaa sen valitsemalla halutun muodon käyttöliittymästä.

## Integraatio järjestelmään

Tikettigeneraattori on integroitu järjestelmään seuraavien komponenttien kautta:

1. **Backend**:
   - API-päätepiste: `/api/ai/generate-ticket`
   - Kontrolleri: `backend/src/controllers/aiController.ts`
   - Autentikaatio: Rajoitettu ADMIN ja SUPPORT -käyttäjille

2. **Frontend**:
   - Käyttöliittymä: `frontend/src/components/Admin/AITicketGenerator.jsx`
   - Sivu: `frontend/src/pages/AITools.jsx`
   - Navigaatio: Saatavilla headerissa ja mobiilinavigaatiossa

## Virheidenkäsittely

Agentin virheenkäsittely kattaa seuraavat tilanteet:

1. **Puuttuvat parametrit**: Palauttaa selkeän virheilmoituksen puuttuvista pakollisista parametreista
2. **Virheellinen vaikeustaso**: Tarkistaa, että vaikeustaso on sallittujen arvojen joukossa
3. **Kategoriavirheet**: Hakee kategorian joko ID:n tai nimen perusteella, palauttaa virheen jos ei löydy
4. **Parsing-virheet**: Yrittää parsia JSON-vastauksen, ja etsii JSON-muotoista dataa tekstistä jos suora parsinta epäonnistuu
5. **Prioriteettivirheet**: Käyttää automaattisesti vaikeustasoon perustuvaa prioriteettia, jos tekoäly ei ole asettanut sitä
6. **Vastausmuotovirheet**: Varmistaa validin vastausmuodon joko käyttäjän valinnan tai oletusarvon perusteella

## Kehityskohteet

Tulevissa versioissa on suunnitteilla seuraavia parannuksia:

1. Lisätä tuki useammille vastausmuodoille
2. Kehittää kategoria-kohtaisia prompteja realistisempien tikettien luomiseksi
3. Integroida olemassa olevien tikettien historiatietoja oppimateriaaliksi agentille
4. Implementoida automaattinen tikettien generointi harjoitustietokantaan 