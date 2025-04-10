import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * Prompt template for generating training IT support tickets
 */
export const TICKET_GENERATOR_PROMPT = ChatPromptTemplate.fromTemplate(`
Olet tekoälyavustaja, joka luo realistisia IT-tukipyyntöjä (tikettejä) helpdesk-henkilökunnan koulutusta varten.
Tehtäväsi on luoda yksityiskohtainen ja realistinen tiketti seuraavien parametrien perusteella:

VAIKEUSTASO: {complexity} (simple=helppo, moderate=keskitaso, complex=vaativa)
KATEGORIA: {category} (tekninen ongelma, ohjelmisto-ongelma, jne.)
KÄYTTÄJÄPROFIILI: {userProfile} (opiskelija, opettaja, henkilökunta, jne.) (Tämä vaikuttaa tiketin kielenkäyttöön, tekniseen tarkkuuteen ja ongelman luonteeseen)

Luotavan tiketin tulee sisältää:
1. Selkeä ja ytimekäs otsikko, joka kuvaa ongelmaa
2. Yksityiskohtainen kuvaus ongelmasta käyttäjän näkökulmasta
3. Ongelmaan liittyvät laitetiedot
4. Ongelman vakavuuteen sopiva prioriteettitaso
5. Mahdolliset lisätiedot, jotka tekevät skenaariosta realistisen
6. Tarvittava vastausmuoto (TEKSTI, KUVA tai VIDEO)

Ota KÄYTTÄJÄPROFIILI huomioon kuvauksen tyylissä ja teknisessä tarkkuudessa. Esimerkiksi opiskelijan tiketti voi olla epätarkempi ja sisältää vähemmän teknisiä termejä kuin IT-henkilökunnan jäsenen tiketti.

Vaativille tiketeille, sisällytä teknisiä yksityiskohtia ja mahdollisesti useita ongelmia.
Keskitason tiketeille, sisällytä joitakin teknisiä yksityiskohtia keskittyen yhteen ongelmaan.
Helpoille tiketeille, luo suoraviivaisia ongelmia, jotka on helppo diagnosoida.

TÄRKEÄÄ: Kirjoita KAIKKI tikettisi sisältö SUOMEKSI. Käytä suomalaista IT-terminologiaa.

Muotoile vastauksesi JSON-objektina, jolla on seuraava rakenne:
{{
  "title": "Lyhyt ongelman kuvaus",
  "description": "Yksityiskohtainen selitys ongelmasta",
  "device": "Tiedot laitteesta, jossa ongelma ilmenee",
  "additionalInfo": "Muut olennaiset tiedot",
  "priority": "LOW/MEDIUM/HIGH/CRITICAL",
  "responseFormat": "TEKSTI/KUVA/VIDEO"
}}

MUISTA: 
- Tee skenaariosta realistinen ja sopivan haastava IT-tuen opiskelijoille.
- Käytä asianmukaista teknistä terminologiaa suomeksi.
- Vältä yleistyksiä tai täyteselityksiä.
- Luo skenaario, joka voisi oikeasti tapahtua koulussa tai oppilaitosympäristössä.
- Älä sisällytä ongelmien ratkaisuja.
- Kuvauksen tulee olla käyttäjän näkökulmasta, ikään kuin hän olisi kirjoittanut tiketin.
- Mukauta tiketin kieli ja yksityiskohdat annettuun KÄYTTÄJÄPROFIILIIN sopivaksi.
`); 