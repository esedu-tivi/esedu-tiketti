# SummarizerAgent-agentti

`SummarizerAgent` on tekoälyagentti, joka luo ytimekkäitä yhteenvetoja IT-tukipyyntöjen keskusteluhistorioista. Sen tarkoitus on auttaa tukihenkilöitä ja esimiehiä nopeasti ymmärtämään pitkienkin keskustelujen pääkohdat ilman koko historian läpikäyntiä.

## Agentin toimintaperiaate

Agentti toimii seuraavasti:
1.  Vastaanottaa tiketti-ID:n API-kutsun kautta.
2.  Hakee tiketin perustiedot (otsikko, kuvaus, kategoria, tila) ja siihen liittyvät kommentit (sis. kommentoijan nimen).
3.  **Suodattaa** kommenttihistoriasta automaattiset järjestelmäviestit pois (esim. tilanmuutokset, jotka on merkitty "Järjestelmä"-käyttäjän tekemiksi).
4.  Muodostaa promptin `CONVERSATION_SUMMARY_PROMPT`-pohjasta, syöttäen siihen tiketin tiedot, suodatetun keskusteluhistorian ja tiketin **nykyisen tilan**.
5.  Lähettää promptin OpenAI:n kielimallille (määritelty `AI_CONFIG`:ssa).
6.  Vastaanottaa kielimallin generoiman yhteenvedon.
7.  **Tallentaa** yhteenvedon onnistuessaan tiketin `aiSummary`-kenttään tietokantaan.
8.  Palauttaa generoimansa (tai virhetilanteessa virheviestin) yhteenvedon API-vastauksena.

## Ominaisuudet

- **Kontekstitietoinen yhteenveto**: Hyödyntää tiketin perustietoja ja nykyistä tilaa relevantimman yhteenvedon luomiseksi.
- **Järjestelmäviestien suodatus**: Parantaa yhteenvedon laatua keskittymällä olennaiseen ihmisten väliseen keskusteluun.
- **Suomenkielisyys**: Generoi yhteenvedot oletusarvoisesti suomeksi promptin ohjeistuksen mukaisesti.
- **Tallennus**: Säilöö luodun yhteenvedon tiketin yhteyteen myöhempää käyttöä varten.
- **Uudelleengenerointi**: API-päätepiste mahdollistaa yhteenvedon päivittämisen (esim. keskustelun edetessä), jolloin vanha yhteenveto korvataan uudella.

## Tekninen sijainti

Agentin toteutus sijaitsee tiedostossa:
```
backend/src/ai/agents/summarizerAgent.ts
```

Agentin käyttämä prompti sijaitsee tiedostossa:
```
backend/src/ai/prompts/conversationSummaryPrompt.ts
```

## Käyttöoikeudet

Agentin käyttö on rajattu `ADMIN` ja `SUPPORT` -käyttäjärooleihin API-reitin kautta.

## Integraatio järjestelmään

Agentti on integroitu järjestelmään seuraavasti:

1.  **Backend**:
    -   API-päätepiste: `POST /api/ai/tickets/:id/summarize` (`aiRoutes.ts`)
    -   Kontrollerimetodi: `aiController.summarizeConversation` (`aiController.ts`)
        -   Hakee datan Prismalla.
        -   Kutsuu `summarizerAgent.summarizeConversation()`.
        -   Päivittää `aiSummary`-kentän `prisma.ticket.update()` avulla onnistuneen generoinnin jälkeen.
    -   Konfiguraatio: Käyttää `AI_CONFIG`-objektia mallin ja API-avaimen määrittelyyn.
2.  **Frontend**:
    -   Käyttöliittymä: `ConversationModal.jsx` sisältää laajennettavan osion yhteenvedolle.
    -   API-kutsu: Yhteenveto generoidaan/päivitetään `axios.post`-kutsulla yllä mainittuun API-päätepisteeseen.
    -   Näyttö: Komponentti hakee ensin tallennetun yhteenvedon (`aiController.getAiTicketConversation` kautta) ja näyttää sen. Generointipainike on tarjolla.

## Rajoitukset

-   Yhteenvedon laatu riippuu käytetyn kielimallin kyvyistä ja promptin selkeydestä.
-   Agentti ei kykene analysoimaan keskustelussa olevia kuvia, videoita tai liitetiedostoja.
-   Hyvin pitkien tai monimutkaisten keskustelujen ydin voi jäädä tavoittamatta lyhyessä yhteenvedossa.
-   Agentti luottaa siihen, että "Järjestelmä"-nimistä käyttäjää ei käytetä muuhun kuin automaattiviesteihin.

## Kehityskohteet

-   Mahdollisuus pyytää eripituisia tai eri näkökulmista tehtyjä yhteenvetoja (esim. vain tekninen yhteenveto).
-   Yhteenvedon automaattinen generointi/päivitys esimerkiksi tiketin tilan muuttuessa `RESOLVED`-tilaan.
-   Kyky tunnistaa ja mahdollisesti sisällyttää viittauksia liitettyihin tietämyskanta-artikkeleihin. 