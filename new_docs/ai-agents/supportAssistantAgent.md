# Tukihenkilöassistentti (Support Assistant Agent)

## Yleiskatsaus

Tukihenkilöassistentti on tekoälypohjainen apuväline, joka on suunniteltu auttamaan tukihenkilöitä ratkaisemaan tikettejä tehokkaammin. Se tarjoaa neuvoja, vianmääritysohjeita ja ratkaisuehdotuksia perustuen tiketin kontekstiin ja keskusteluhistoriaan.

## Ominaisuudet

- Tarjoaa reaaliaikaista tukea tukihenkilöstölle suoraan tikettien sisällä
- Tuottaa kontekstitietoisia vastauksia huomioiden tiketin tiedot ja keskusteluhistorian
- Hyödyntää tietoa olemassa olevista ratkaisuista ja tietämyskannan artikkeleista
- Auttaa diagnostiikassa, ratkaisuehdotuksissa ja teknisen tiedon antamisessa

## Käyttöliittymä (UI)

### Enterprise-tasoinen keskustelukäyttöliittymä

Tukihenkilöassistentti hyödyntää modernia, ammattimaista chat-käyttöliittymää, joka sisältää:

- **Kelluvat keskustelupaneeli**:
  - Avautuu tikettisivulla erilliseen kelluvan ikkunaan
  - Voidaan pienentää/suurentaa tarvittaessa
  - Optimoitu näkymään mobiililaitteilla ja työpöydällä

- **Edistyneitä chat-ominaisuuksia**:
  - Käyttäjän ja tekoälyn viestit erottuvat selkeästi toisistaan 
  - Animoidut siirtymät ja latausanimaatiot
  - Viesteissä aikaleimamerkinnät
  - Käyttäjän profiilikuva näkyy viesteissä

- **Viestien hallinta ja interaktiivisuus**:
  - Mahdollisuus kopioida tekoälyn vastauksia leikepöydälle
  - Palautteen antaminen tekoälyn vastausten laadusta (peukku ylös/alas)
  - Keskustelun tyhjentäminen ja hallinta
  - Ehdotetut kysymykset keskustelun aloittamiseksi

- **Tietosuoja ja tietoturva**:
  - Vastaukset ovat käytettävissä vain tikettiin pääsyoikeuden omaaville tukihenkilöille
  - Viestejä ei tallenneta erikseen, vain tukisession ajan

## Toimintaperiaate

1. Tukihenkilö lähettää kysymyksen tai avunpyynnön koskien tikettia, jota he ovat käsittelemässä
2. Tekoäly analysoi:
   - Tiketin tiedot (otsikko, kuvaus, laitetiedot, kategoria)
   - Tukihenkilön ja loppukäyttäjän välisen keskusteluhistorian
   - Suoraan tikettiin liittyvät tietämysartikkelit (relatedTicketIds)
   - Jos tiketti on tekoälyn luoma, käytettävissä on usein valmiiksi tarkka ratkaisu
3. Tekoäly generoi hyödyllisen vastauksen sisältäen ohjeita, vianmääritysaskeleita tai tietoa

## Tietämysartikkelien käyttö

Tukihenkilöassistentti hakee tietämysartikkeleita seuraavasti:
- Etsii tietokannasta artikkelit, joiden `relatedTicketIds`-kentässä on nykyisen tiketin id
- Ei enää etsi artikkeleita kategorian perusteella, vaan ainoastaan suoraan tikettiin liittyviä artikkeleita
- Järjestää artikkelit päivitysajan mukaan (uusimmat ensin)
- Liittää löydetyt artikkelit osaksi AI-assistentin kontekstia

Tämä varmistaa, että assistentti tarjoaa tukihenkilölle nimenomaan kyseiseen tikettiin liittyvää tietoa, parantaen vastausten tarkkuutta ja relevanssia.

## Integraatiopisteet

- **API-päätepiste**: `POST /api/ai/tickets/:ticketId/support-assistant`
- **Vaadittu hyötykuorma**:
  ```json
  {
    "supportQuestion": "Miten minun tulisi tutkia tätä verkko-ongelmaa?",
    "supportUserId": "tukihenkilön-käyttäjä-id"
  }
  ```
- **Vastaustiedoston muoto**:
  ```json
  {
    "success": true,
    "response": "Tässä vaiheita verkko-ongelman vianmääritykseen: 1. ..."
  }
  ```

## Tekninen toteutus

Tukihenkilöassistentti käyttää seuraavia komponentteja:

- `backend/src/ai/prompts/supportAssistantPrompt.ts`: Määrittelee promptin pohjan
- `backend/src/ai/agents/supportAssistantAgent.ts`: Toteuttaa agentin logiikan
- `backend/src/controllers/aiController.ts`: Sisältää API-päätepisteen käsittelijän
- `backend/src/routes/aiRoutes.ts`: Määrittelee API-reitin
- `frontend/src/components/AI/SupportAssistantChat.jsx`: Toteuttaa chat-käyttöliittymän

## Käyttäjäoikeudet

- Vain käyttäjät, joilla on SUPPORT tai ADMIN -roolit voivat käyttää tätä ominaisuutta
- Tukiassistentti vastaa vain kyselyihin tiketeistä, joihin pyynnön lähettävällä käyttäjällä on pääsy

## Hyödyt

- **Nopeampi ratkaisu**: Tukihenkilöstö saa nopeasti ohjeita poistumatta tiketin käyttöliittymästä
- **Tiedon jakaminen**: Hyödyntää olemassa olevia tietämysartikkeleita ja tunnettuja ratkaisuja
- **Johdonmukaisuus**: Varmistaa johdonmukaiset lähestymistavat samankaltaisiin ongelmiin
- **Koulutus**: Auttaa uudempia tukihenkilöitä oppimaan optimaalisia vianmääritysprosesseja

## Tulevat parannukset

- Integraatio ulkoisten tietämyskantojen ja dokumentaation kanssa
- Personoidut vastaukset tukihenkilöiden kokemustason perusteella
- Mahdollisuus ehdottaa samankaltaisia tikettejä samantyyppisillä ratkaisuilla
- Tuki erikoistuneille aloille tai teknisille alueille
- Mahdollisuus tallentaa hyödyllisiä vastauksia myöhempää käyttöä varten

## Käyttövinkit

1. **Käytä tarkkoja kysymyksiä**: Mitä tarkempi kysymys, sitä hyödyllisempi vastaus
2. **Hyödynnä kontekstia**: Assistentti ymmärtää tiketin kontekstin, joten voit viitata yksityiskohtiin suoraan
3. **Kokeile aloituskysymyksiä**: Järjestelmän ehdottamat kysymykset ovat hyvä tapa aloittaa
4. **Anna palautetta**: Peukalopalaute auttaa meitä parantamaan assistentin vastauksia

## Vianmääritys

Jos kohtaat ongelmia tukiassistentin kanssa:

1. **Profiilikuva ei näy**: Varmista että järjestelmän käyttäjäprofiilisi on täydennetty oikein
2. **Viestit latautuvat hitaasti**: Varmista hyvä verkkoyhteys, assistentti käyttää tekoäly-rajapintaa
3. **Vastaukset eivät ole relevantteja**: Tarkenna kysymystäsi ja tarjoa lisäkontekstia
4. **UI-ongelmat**: Päivitä selain tai tyhjennä selaimen välimuisti 