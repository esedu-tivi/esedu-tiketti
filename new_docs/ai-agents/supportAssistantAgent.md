# Tukihenkilöassistentti (Support Assistant Agent)

## Yleiskatsaus

Tukihenkilöassistentti on tekoälypohjainen **opetus- ja mentorointityökalu**, joka on suunniteltu auttamaan **IT-alan opiskelijoita (tulevia tukihenkilöitä)** oppimaan ja kehittämään ongelmanratkaisutaitojaan tehokkaasti. Sen sijaan, että assistentti antaisi suoria ratkaisuja, se **toimii yhteistyökumppanina, ohjaten opiskelijaa kysymyksillä, vihjeillä, ja aktiivisesti ehdottaen seuraavia loogisia vianetsintäaskeleita**. Tavoitteena on auttaa opiskelijaa löytämään ratkaisu itse, mutta samalla varmistaen, että he etenevät prosessissa eivätkä jää jumiin. Assistentti perustaa ohjeensa tiketin kontekstiin, keskusteluhistoriaan ja olemassa olevaan tietämyskantatietoon.

## Ominaisuudet

- Tarjoaa reaaliaikaista, **yhteistyöhön perustuvaa ja ohjaavaa tukea** opiskelijoille suoraan tikettien sisällä.
- Tuottaa kontekstitietoisia, **johdattelevia vastauksia ja konkreettisia ehdotuksia seuraavista vaiheista**, huomioiden tiketin tiedot ja keskusteluhistorian.
- Hyödyntää tietoa olemassa olevista ratkaisuista ja tietämyskannan artikkeleista **taustatietona ohjaukselle ja askel-ehdotuksille, paljastamatta kuitenkaan lopullista ratkaisua suoraan.**
- Auttaa opiskelijaa **diagnostiikassa, ongelmanratkaisussa ja teknisen ymmärryksen kehittämisessä** ohjaavien kysymysten, vihjeiden ja **aktiivisesti tarjottujen seuraavien toimenpide-ehdotusten** kautta.

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

1.  Opiskelija (tukihenkilöharjoittelija) lähettää kysymyksen tai avunpyynnön koskien tikettiä, jota hän on käsittelemässä.
2.  Tekoäly analysoi:
    *   Tiketin tiedot (otsikko, kuvaus, laitetiedot, kategoria)
    *   Opiskelijan ja loppukäyttäjän välisen keskusteluhistorian (`conversationHistory`)
    *   **Opiskelijan ja itsensä (Tukiassistentin) välisen aiemman keskusteluhistorian tässä istunnossa (`studentAssistantConversationHistory`)**
    *   Suoraan tikettiin liittyvät tietämysartikkelit (relatedTicketIds) – **käyttäen näitä hienovaraisesti ohjauksen ja askel-ehdotusten pohjana.**
    *   Jos tiketti on tekoälyn luoma, järjestelmässä voi olla tarkka ratkaisu, mutta assistentti **ei paljasta tätä suoraan, vaan ohjaa opiskelijaa sen löytämiseen ehdottamalla testattavia toimenpiteitä ja esittämällä kysymyksiä.**
3.  Tekoäly generoi **opastavan, pedagogisen ja yhteistyöhenkisen vastauksen**, joka ottaa huomioon kaiken aiemman kontekstin (ml. oman aiemman keskustelunsa opiskelijan kanssa), sisältää johdattelevia kysymyksiä, vianmääritysvihjeitä, tai **ehdotuksia seuraaviksi loogisiksi askeliksi**, jotta opiskelija itse oivaltaa ratkaisun edeten prosessissa.

## Tietämysartikkelien käyttö

Tukihenkilöassistentti hakee tietämysartikkeleita seuraavasti:
- Etsii tietokannasta artikkelit, joiden `relatedTicketIds`-kentässä on nykyisen tiketin id.
- Ei enää etsi artikkeleita kategorian perusteella, vaan ainoastaan suoraan tikettiin liittyviä artikkeleita.
- Järjestää artikkelit päivitysajan mukaan (uusimmat ensin).
- Liittää löydetyt artikkelit osaksi AI-assistentin kontekstia **taustatiedoksi, jota se käyttää opiskelijan ohjaamiseen ilman suorien ratkaisujen paljastamista.**

Tämä varmistaa, että assistentti voi ohjata opiskelijaa tehokkaasti käyttäen relevanttia tietoa, mutta samalla edistäen opiskelijan omaa ongelmanratkaisuprosessia.

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
    "response": "Tässä vaiheita verkko-ongelman vianmääritykseen: 1. ...",
    "interactionId": "interaction-id",
    "responseTime": 2.4,
    "hasConversationHistory": true
  }
  ```

### Keskusteluhistorian API-päätepisteet

- **Hae keskusteluhistoria**: `GET /api/ai/tickets/:ticketId/support-assistant/history/:supportUserId`
  - **Vastaustiedoston muoto**:
    ```json
    {
      "success": true,
      "history": "[timestamp] Student: Kysymys\n\n[timestamp] Assistant: Vastaus\n\n...",
      "hasHistory": true
    }
    ```

- **Tyhjennä keskusteluhistoria**: `DELETE /api/ai/tickets/:ticketId/support-assistant/history/:supportUserId`
  - **Vastaustiedoston muoto**:
    ```json
    {
      "success": true,
      "message": "Keskusteluhistoria tyhjennetty onnistuneesti"
    }
    ```

## Keskusteluhistorian tallennus

Tukihenkilöassistentti tallentaa nyt keskusteluhistorian automaattisesti tietokantaan. Keskusteluhistoria:

- Tallennetaan `SupportAssistantConversation`-tauluun tietokannassa
- On yksilöllinen jokaiselle tiketti-tukihenkilö-parille
- Ladataan automaattisesti kun tukihenkilö avaa chat-ikkunan
- Voidaan tyhjentää käyttöliittymän tyhjennys-toiminnolla, joka poistaa keskusteluhistorian myös tietokannasta

Tämä mahdollistaa:
- Keskustelujen jatkamisen siitä mihin jäätiin, vaikka tukihenkilö sulkisi chat-ikkunan välillä
- Pidempien, monivaiheisten opastustilanteiden toteuttamisen
- Tekoälyn pääsyn aiempiin neuvoihinsa, jotta se voi viitata aiemmin keskusteltuihin asioihin ja kehittää oppimissuhdetta

## Tekninen toteutus

Tukihenkilöassistentti käyttää seuraavia komponentteja:

- `backend/src/ai/prompts/supportAssistantPrompt.ts`: Määrittelee promptin pohjan
- `backend/src/ai/agents/supportAssistantAgent.ts`: Toteuttaa agentin logiikan
- `backend/src/controllers/aiController.ts`: Sisältää API-päätepisteen käsittelijän
- `backend/src/routes/aiRoutes.ts`: Määrittelee API-reitin
- `frontend/src/components/AI/SupportAssistantChat.jsx`: Toteuttaa chat-käyttöliittymän
- `backend/prisma/schema.prisma`: Sisältää `SupportAssistantConversation`-mallin keskusteluhistorian tallennukseen

## Käyttäjäoikeudet

- Vain käyttäjät, joilla on SUPPORT tai ADMIN -roolit voivat käyttää tätä ominaisuutta
- Tukiassistentti vastaa vain kyselyihin tiketeistä, joihin pyynnön lähettävällä käyttäjällä on pääsy

## Hyödyt

- **Syvempi Oppiminen**: Opiskelijat kehittävät ongelmanratkaisutaitojaan aktiivisesti ohjatun prosessin kautta.
- **Kriittisen Ajattelun Kehittyminen**: Assistentti kannustaa kysymyksillään opiskelijoita analysoimaan tilannetta ja pohtimaan ratkaisuvaihtoehtoja.
- **Tiedon Soveltaminen**: Opiskelijat oppivat hyödyntämään tietämysartikkeleita ja teknistä tietoa käytännön tilanteissa.
- **Varmuuden Lisääntyminen**: Onnistumisen kokemukset ohjatussa ympäristössä kasvattavat opiskelijoiden itseluottamusta.
- **Johdonmukaisuus Koulutuksessa**: Varmistaa, että kaikki opiskelijat saavat samantasoista, pedagogisesti perusteltua ohjausta.

## Tulevat parannukset

- Integraatio ulkoisten tietämyskantojen ja dokumentaation kanssa
- Personoidut vastaukset tukihenkilöiden kokemustason perusteella
- Mahdollisuus ehdottaa samankaltaisia tikettejä samantyyppisillä ratkaisuilla
- Tuki erikoistuneille aloille tai teknisille alueille
- Mahdollisuus tallentaa hyödyllisiä vastauksia myöhempää käyttöä varten
- ✅ **Keskusteluhistorian tallennus ja lataus tietokannasta, mukaan lukien tyhjennys-toiminto, on nyt toteutettu.**

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