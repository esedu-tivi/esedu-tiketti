# Tehtävälista (TODO)

Tähän tiedostoon listataan projektin tulevat tehtävät ja niiden tila.

## Merkinnät

*   `✅` - Tehty
*   `⏳` - Työn alla
*   `❌` - Ei aloitettu

## Tehtävät

### Ydinominaisuudet

*   `[Merkki]` Kuvaus tehtävästä...

### Käyttöliittymä (UI/UX)

*   `✅` Paranna tukihenkilöassistentin chat-käyttöliittymää:
    * Moniriviinen tekstialue yhden rivin tekstikentän sijaan
    * Aikaleimoja näytetään suomalaisessa formaatissa (24h)
*   `✅` Tallenna käyttäjän näkymäasetukset (kortti/lista) selaimen paikallismuistiin (localStorage):
    * Tikettilistat (Kaikki tiketit, Omat tikettini, Oma työnäkymä)
    * Muista valittu välilehti Oma työnäkymä -sivulla
*   `[Merkki]` Kuvaus tehtävästä...

### Backend & API

*   `✅` Azure AD -autentikoinnin korjaus tuotannossa (JWKS v1/v2 fallback)
    *   Lisätty dynaaminen JWKS-valinta issuerin perusteella (v1 vs v2)
    *   Fallback vaihtoehtoiseen JWKS-joukkoon invalid signature -tilanteissa
    *   Dokumentoitu audience-vaatimus (aud = `AZURE_CLIENT_ID`)

### Tekoäly (AI)

*   `✅` Toteuta AI-avustaja tukihenkilöille tikettien ratkaisemiseen (SupportAssistantAgent)
*   `✅` Muokkaa SupportAssistantAgent toimimaan pedagogisena oppaana IT-opiskelijoille, ohjaten ratkaisuun antamatta suoria vastauksia.
    *   `✅` Hienosäädä promptia varmistamaan, että agentti ehdottaa aktiivisesti seuraavia askelia ja toimii yhteistyökumppanina (ei vain kysele).
    *   `✅` Lisää agentille kyky huomioida opiskelijan ja ChatAgentin välinen keskusteluhistoria.
    *   `✅` Lisää SupportAssistantAgentille muisti oman keskustelunsa osalta opiskelijan kanssa:
        *   `✅` Agentti ja prompti päivitetty vastaanottamaan `studentAssistantConversationHistory`.
        *   `✅` Toteuta backend-logiikka keskusteluhistorian tallentamiseen, hakemiseen ja tyhjentämiseen. Toteutettu uudella `SupportAssistantConversation`-mallilla tietokannassa.
        *   `✅` Paranna AI-avustajan palautteenkäsittelyä latauksen jälkeen (interactionId:n ja annettujen palautteiden tallennus/haku).
        *   `✅` Korjattu virhe (P2003) tiketöinnin poistossa varmistamalla, että `SupportAssistantConversation`-tietueet poistetaan transaktiossa.
*   `✅` Paranna tukihenkilöassistentin tietämysartikkelien hakua käyttämään vain tikettiin liittyviä artikkeleita
*   `✅` Toteuta AI-avustajan analytiikkanäkymä ja backend-palvelut tilastointia varten
*   `❌` Toteuta lisää tilastoja AI-analytiikkaan:
    * Heatmap-visualisoinnit käytön ajoista
    * Hakutermien trendien analyysi
    * Laajempi kategoria-analyysi 
    * Automatisoidut raportit ja yhteenvedot
*   `[Merkki]` Kuvaus tehtävästä...

### Testaus & Laadunvarmistus

*   `[Merkki]` Kuvaus tehtävästä...

### Dokumentaatio

*   `✅` Käännä kaikki `new_docs` -kansion dokumentit suomeksi.
*   `[Merkki]` Kuvaus tehtävästä...

### Muut / Yleiset

*   `[Merkki]` Kuvaus tehtävästä...

---

## Ohjeet Listan Ylläpitoon

1.  **Lisää Tehtävä:** Lisää uusi tehtävä sopivan kategorian alle käyttäen bullet-pistettä (`*`).
2.  **Tila:** Merkitse tehtävän tila käyttämällä yhtä ylläolevista merkeistä (`✅`, `⏳`, `❌`) heti bullet-pisteen jälkeen hakasulkeissa, esim. `*   `❌` Lisää uusi ominaisuus X.`.
3.  **Päivitä Tila:** Pidä tehtävien tilat ajan tasalla.
4.  **Priorisointi:** Voit järjestää tehtäviä kategorian sisällä tärkeysjärjestykseen (tärkein ylimpänä) tai lisätä erillisen "Seuraavaksi Työn Alle" -osion. 

## Muutosloki
