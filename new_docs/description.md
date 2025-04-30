# Järjestelmän Kuvaus

Tämä dokumentti kuvaa Esedu Tikettijärjestelmän perusidean ja keskeiset ominaisuudet.

## Yleiskatsaus ja Tarkoitus

Esedu Tikettijärjestelmä on IT-tukipyyntöjen hallintajärjestelmä, joka on suunniteltu erityisesti **opetuskäyttöön**. Sen ensisijainen tavoite on tarjota realistinen ja käytännönläheinen ympäristö IT-tukihenkilöiden (esim. datanomiopiskelijoiden) kouluttamiseen.

Järjestelmä simuloi todellista helpdesk-ympäristöä, jossa käyttäjät (kuten opiskelijat, opettajat tai muu henkilökunta) voivat lähettää IT-ongelmiin liittyviä tukipyyntöjä (tikettejä). Tukihenkilöt voivat ottaa tikettejä käsittelyyn, kommunikoida käyttäjien kanssa kommenttien välityksellä ja ratkaista ongelmia.

Erityisenä piirteenä järjestelmä hyödyntää **tekoälyä (AI)** rikastuttamaan koulutuskokemusta. Tekoäly voi generoida harjoitustikettejä ja simuloida käyttäjien vastauksia keskusteluissa, tarjoten näin monipuolisia ja interaktiivisia harjoitustilanteita.

## Keskeiset Ominaisuudet

*   **Tikettien Hallinta:**
    *   Tukipyyntöjen luonti, lukeminen, päivitys ja poisto (CRUD).
    *   Tikettien tilan seuranta (Avoin, Käsittelyssä, Ratkaistu, Suljettu).
    *   Prioriteettitasot (Matala, Normaali, Korkea, Kriittinen).
    *   Tikettien luokittelu kategorioihin.
    *   Tiketin vastuuhenkilön määrittäminen.
    *   Arvioidun valmistumisajan asetus prioriteetin mukaan.
*   **Käyttäjäroolit ja Oikeudet:**
    *   Kolme roolia: USER (peruskäyttäjä), SUPPORT (tukihenkilö), ADMIN (järjestelmänvalvoja).
    *   Roolipohjainen pääsynhallinta eri toimintoihin ja näkymiin.
*   **Kommentointi:**
    *   Käyttäjät ja tukihenkilöt voivat keskustella tiketin sisällä.
    *   Tuki @-maininnoille kommenteissa.
*   **Liitetiedostot:**
    *   Mahdollisuus liittää tiedostoja tiketteihin.
*   **Ilmoitukset:**
    *   Reaaliaikaiset ilmoitukset (WebSocket) uusista kommenteista, maininnoista, tilamuutoksista ja tikettien osoituksista.
    *   Käyttäjäkohtaiset ilmoitusasetukset.
*   **Tekoälyavusteiset Harjoitustiketit:**
    *   **Generointi:** Tekoäly voi luoda realistisia harjoitustikettejä ja niihin liittyviä ratkaisuja (`TicketGeneratorAgent`).
    *   **Parametrisointi:** Tiketin luontia voi ohjata mm. vaikeustasolla, kategorialla ja käyttäjäprofiililla.
    *   **Esikatselu:** Mahdollisuus esikatsella generoitu tiketti ja ratkaisu ennen tallennusta.
*   **Tekoälypohjainen Keskustelusimulaatio:**
    *   **Simulointi:** Tekoäly simuloi käyttäjää AI-generoitujen tikettien keskusteluissa (`ChatAgent`).
    *   **Reagointi:** AI-agentti reagoi tukihenkilön kommentteihin realistisesti, ottaen huomioon käyttäjäprofiilin ja edistymisen kohti ratkaisua.
*   **Tekoälypohjainen Analysointi ja Yhteenvedot:**
    *   **Analyysi:** Admin-näkymä AI-generoitujen tikettien ja keskustelujen tarkasteluun ja suodatukseen.
    *   **Yhteenveto:** Mahdollisuus generoida AI-pohjainen yhteenveto tiketin keskustelusta (`SummarizerAgent`).
*   **Autentikointi:**
    *   Integraatio Microsoft-tileihin (MSAL) Azure AD:n kautta.
    *   JWT (JSON Web Tokens) käytössä sessioiden hallintaan.
*   **Käyttöliittymä:**
    *   Moderni ja responsiivinen käyttöliittymä (React, Shadcn/UI, Tailwind CSS).
    *   Selkeät näkymät omien tikettien, tukihenkilön työn ja hallinnan tarpeisiin. 