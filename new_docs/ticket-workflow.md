# Tiketin Työnkulku ja Käsittely

Tämä dokumentti kuvaa tikettien elinkaaren, käsittelyprosessin, järjestelmän automaattiset viestit, kommentointisäännöt ja tukihenkilöiden työnäkymän.

## Tiketin Elinkaari ja Käsittelyvaiheet

1.  **Luonti (OPEN):**
    *   Käyttäjä (USER) tai AI-agentti luo tiketin.
    *   Tila on `OPEN`.
    *   Tiketti odottaa tukihenkilön (SUPPORT/ADMIN) ottamista käsittelyyn.

2.  **Käsittelyyn Otto (IN_PROGRESS):**
    *   SUPPORT/ADMIN-käyttäjä ottaa tiketin käsittelyyn "Ota käsittelyyn" -toiminnolla (esim. `/my-work`-näkymässä tai tiketinäkymässä).
    *   Tiketin tila muuttuu `IN_PROGRESS`.
    *   Tiketti osoitetaan (`assignedToId`) käsittelyyn ottaneelle käyttäjälle.
    *   Käsittelyn aloitusaika (`processingStartedAt`) tallennetaan.
    *   Arvioitu valmistumisaika (`estimatedCompletionTime`) lasketaan ja tallennetaan prioriteetin perusteella:
        *   CRITICAL: +2 tuntia
        *   HIGH: +4 tuntia
        *   MEDIUM: +8 tuntia
        *   LOW: +24 tuntia
    *   Järjestelmä luo automaattisen kommentin "Tiketti otettu käsittelyyn".

3.  **Käsittely (IN_PROGRESS):**
    *   Määrätty tukihenkilö voi kommentoida tikettiä.
    *   Tiketin luoja voi kommentoida tikettiä.
    *   Tukihenkilö voi:
        *   **Vapauttaa (`/api/tickets/:id/release`):** Palauttaa tiketin `OPEN`-tilaan, nollaa `assignedToId`, `processingStartedAt`, `estimatedCompletionTime`. Järjestelmä luo kommentin "Tiketti vapautettu".
        *   **Merkitä Ratkaistuksi (`/api/tickets/:id/status`, status: RESOLVED):** Tiketin tila muuttuu `RESOLVED`. Käsittelyn päättymisaika (`processingEndedAt`) tallennetaan. Järjestelmä luo kommentin "Tiketin tila muutettu: RESOLVED".
        *   **Sulkea (`/api/tickets/:id/status`, status: CLOSED):** Tiketin tila muuttuu `CLOSED`. Käsittelyn päättymisaika (`processingEndedAt`) tallennetaan. Järjestelmä luo kommentin "Tiketin tila muutettu: CLOSED".
        *   **Siirtää (`/api/tickets/:id/transfer`):** Vaihtaa `assignedToId`:n toiselle SUPPORT/ADMIN-käyttäjälle. Järjestelmä luo kommentin "Tiketin käsittelijä vaihdettu käyttäjälle [Nimi]".
    *   Tiketin luoja voi **Sulkea** tiketin (`/api/tickets/:id/status`, status: CLOSED) missä tahansa vaiheessa (paitsi jos jo RESOLVED/CLOSED). Järjestelmä luo kommentin.

4.  **Ratkaistu (RESOLVED):**
    *   Tiketti on merkitty ratkaistuksi tukihenkilön toimesta.
    *   Kommentointi on estetty sekä luojalta että tukihenkilöltä.
    *   Tiketti voidaan avata uudelleen (esim. jos luoja kokee, että ongelma ei ratkennut), jolloin tila palaa `IN_PROGRESS`, `processingEndedAt` nollataan ja uusi `estimatedCompletionTime` asetetaan.

5.  **Suljettu (CLOSED):**
    *   Tiketti on lopullisesti suljettu joko tukihenkilön tai luojan toimesta.
    *   Kommentointi on estetty.
    *   Tiketti voidaan mahdollisesti avata uudelleen (Admin-toiminto?), palauttaen sen `IN_PROGRESS`-tilaan.

## Järjestelmäviestit (Automaattiset Kommentit)

Järjestelmä lisää automaattisesti kommentteja tiettyjen tapahtumien yhteydessä. Nämä viestit erottuvat visuaalisesti (esim. värikoodauksella) käyttäjien lisäämistä kommenteista:

*   **Keltainen (Käsittelyyn otto):** "Tiketti otettu käsittelyyn" (kun tila muuttuu -> IN_PROGRESS)
*   **Vihreä (Ratkaisu):** "Tiketin tila muutettu: RESOLVED" (kun tila muuttuu -> RESOLVED)
*   **Harmaa (Sulkeminen):** "Tiketin tila muutettu: CLOSED" (kun tila muuttuu -> CLOSED)
*   **Sininen (Vapautus):** "Tiketti vapautettu" (kun tiketti vapautetaan `OPEN`-tilaan)
*   **Violetti (Siirto):** "Tiketin käsittelijä vaihdettu käyttäjälle [Kohdekäyttäjän Nimi]" (kun tiketti siirretään)

## Kommentoinnin Rajoitukset

Kuka voi kommentoida ja milloin:

*   **Tiketin Luoja (USER):**
    *   Voi kommentoida aina, kun tiketin tila on `OPEN` tai `IN_PROGRESS`.
    *   Ei voi kommentoida, kun tila on `RESOLVED` tai `CLOSED`.
*   **Määrätty Tukihenkilö (SUPPORT/ADMIN):**
    *   Voi kommentoida vain, kun tiketin tila on `IN_PROGRESS` **JA** tiketti on osoitettu hänelle (`assignedToId` vastaa omaa ID:tä).
    *   Ei voi kommentoida `OPEN`-tilassa olevia tikettejä (ne on ensin otettava käsittelyyn).
    *   Ei voi kommentoida toisen tukihenkilön käsittelyssä olevia tikettejä.
*   **Admin-käyttäjä:**
    *   Voi kommentoida kaikkia tikettejä, joiden tila on `OPEN` tai `IN_PROGRESS`, riippumatta siitä, kenelle ne on osoitettu.
    *   Ei voi kommentoida, kun tila on `RESOLVED` tai `CLOSED`.

## Media Vastaukset

Tiketin `responseFormat`-kenttä (`TEKSTI`, `KUVA`, `VIDEO`) määrittää, odotetaanko tukihenkilöltä mediavastausta.

*   **Vaadittu Mediavastaus (`KUVA` / `VIDEO`):**
    *   Kun tukihenkilö ottaa tällaisen tiketin käsittelyyn (`IN_PROGRESS`), hänen on **ensin lähetettävä vaaditun tyyppinen medialiite** kommentin yhteydessä (`/api/tickets/:id/comments/media`).
    *   Tekstikommenttien (`/api/tickets/:id/comments`) lähettäminen on estetty, kunnes mediavastaus on annettu.
    *   Järjestelmä antaa virheilmoituksen, jos tekstikommenttia yritetään lähettää ennen mediavastausta.
    *   Kun mediavastaus on lähetetty, tekstikommenttien lisääminen on mahdollista normaalisti.
*   **Tekstivastaus (`TEKSTI`):** Ei erityisiä rajoituksia mediakommenttien lähettämiselle. Tukihenkilö voi lähettää tekstikommentteja heti.
*   **Tiketin Luoja:** Voi aina lisätä medialiitteitä kommentteihin riippumatta `responseFormat`-asetuksesta.
*   **Validointi:** Järjestelmä validoi ladattujen tiedostojen tyypin (jpg, png, gif, mp4, webm, mov) ja koon (max 10 MB).

## Tukihenkilöiden Työnäkymä (`/my-work`)

Erillinen näkymä SUPPORT- ja ADMIN-rooleille tehokkaaseen tikettien hallintaan.

*   **Käsittelyssä-välilehti:**
    *   Näyttää listan tiketeistä, jotka ovat `IN_PROGRESS`-tilassa **JA** osoitettu (`assignedToId`) sisäänkirjautuneelle käyttäjälle.
    *   Päivittyy automaattisesti (esim. 30 sekunnin välein) hakemaan uudet tiedot.
    *   Näyttää käsittelyssä olevien tikettien lukumäärän välilehden otsikossa.
*   **Avoimet Tiketit -välilehti:**
    *   Näyttää listan tiketeistä, jotka ovat `OPEN`-tilassa **JA** joita ei ole osoitettu kenellekään (`assignedToId` on `null`).
    *   Päivittyy automaattisesti.
    *   Näyttää avointen tikettien lukumäärän välilehden otsikossa.
    *   Tarjoaa todennäköisesti "Ota käsittelyyn" -toiminnon suoraan listasta. 