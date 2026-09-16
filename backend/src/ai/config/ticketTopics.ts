/**
 * Aihekatalogi AI-generoiduille harjoitustiketeille.
 *
 * TAUSTA: Aiemmin aiheen valinta jätettiin kielimallille, joka päätyi aina
 * samaan "tyypillisimpään" IT-ongelmaan - ensin tulostimiin, sitten wifiin.
 * Jokainen generointi on erillinen kutsu, joten malli ei voi itse muistaa,
 * mitä se generoi edellisellä kerralla. Siksi aihe arvotaan koodissa ja
 * annetaan promptille valmiina.
 */

export type Complexity = 'simple' | 'moderate' | 'complex';

export interface TicketTopic {
  /** Vakaa tunniste. Tallennetaan tiketin generatorMetadata-kenttään. */
  id: string;
  /** Aihe suomeksi, menee promptiin sellaisenaan. */
  name: string;
  /** Tarkennus, joka estää mallia ajautumasta aiheen kliseisimpään versioon. */
  hint: string;
  /** Kategoriat, joihin aihe sopii. Tyhjä = sopii mihin tahansa. */
  categories: string[];
  /** Vaikeustasot, joille aihe on uskottava. */
  complexity: Complexity[];
  /** Ehdotuksia laitteesta. Arvotaan yksi, jos annettu. */
  devices?: string[];
}

const YLEINEN = 'Yleinen';
const TEKNINEN = 'Tekniset ongelmat';

export const TICKET_TOPICS: TicketTopic[] = [
  // --- Kirjautuminen ja tunnukset ---
  {
    id: 'salasana-vanhentunut',
    name: 'Salasana on vanhentunut eikä uusi salasana kelpaa',
    hint: 'Järjestelmä hylkää uuden salasanan, mutta käyttäjä ei ymmärrä miksi.',
    categories: [YLEINEN, TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'mfa-uusi-puhelin',
    name: 'Monivaiheinen tunnistautuminen ei toimi uudessa puhelimessa',
    hint: 'Authenticator-sovellus on uudessa puhelimessa, mutta vanha laite on jo nollattu.',
    categories: [YLEINEN, TEKNINEN],
    complexity: ['moderate', 'complex'],
    devices: ['oma puhelin', 'koulun kannettava'],
  },
  {
    id: 'tili-lukittu',
    name: 'Käyttäjätili lukkiutui liian monen kirjautumisyrityksen jälkeen',
    hint: 'Käyttäjä ei ole varma, montako kertaa yritti.',
    categories: [YLEINEN],
    complexity: ['simple'],
  },
  {
    id: 'wilma-kirjautuminen',
    name: 'Wilmaan ei pääse kirjautumaan',
    hint: 'Kirjautuminen toimii muualla, mutta Wilma antaa virheen.',
    categories: [YLEINEN, TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'moodle-kurssi-puuttuu',
    name: 'Moodle-kurssi ei näy omalla kurssilistalla',
    hint: 'Muut ryhmäläiset näkevät kurssin normaalisti.',
    categories: [YLEINEN],
    complexity: ['simple', 'moderate'],
  },

  // --- Microsoft 365 ja pilvipalvelut ---
  {
    id: 'teams-mikrofoni',
    name: 'Mikrofoni ei toimi Teams-kokouksessa',
    hint: 'Muut eivät kuule, mutta käyttäjä kuulee muut.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
    devices: ['koulun kannettava', 'oma läppäri', 'luokan pöytäkone'],
  },
  {
    id: 'teams-naytonjako',
    name: 'Näytön jakaminen ei onnistu Teamsissa',
    hint: 'Jakonappi näkyy, mutta muut näkevät mustan ruudun.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },
  {
    id: 'onedrive-synkronointi',
    name: 'OneDrive-synkronointi on jumissa',
    hint: 'Kuvake näyttää ikuisesti synkronointia, tiedostot eivät päivity toiselle koneelle.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'outlook-kalenterikutsut',
    name: 'Kalenterikutsut eivät näy Outlookissa',
    hint: 'Kutsut menevät suoraan roskapostiin tai katoavat kokonaan.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'postilaatikko-tayttynyt',
    name: 'Sähköpostilaatikko on täynnä eikä viestejä tule perille',
    hint: 'Käyttäjä ei tiedä, mitä voi poistaa.',
    categories: [YLEINEN, TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'office-lisenssi',
    name: 'Word ilmoittaa, ettei tuotetta ole aktivoitu',
    hint: 'Tiedostot avautuvat vain lukutilassa.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },
  {
    id: 'excel-kaatuu',
    name: 'Excel kaatuu isoa tiedostoa avatessa',
    hint: 'Sama tiedosto aukeaa toisella koneella normaalisti.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'sposti-jumissa-lahtevissa',
    name: 'Sähköposti jää Lähtevät-kansioon eikä lähde',
    hint: 'Viestissä on iso liitetiedosto.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },
  {
    id: 'jaettu-kansio-oikeudet',
    name: 'Jaettuun kansioon ei ole käyttöoikeuksia',
    hint: 'Opettaja jakoi kansion, mutta avaaminen antaa oikeusvirheen.',
    categories: [TEKNINEN, YLEINEN],
    complexity: ['moderate', 'complex'],
  },

  // --- Tulostus ---
  {
    id: 'tulostus-jono',
    name: 'Tulostustyö jää jonoon eikä tulostu',
    hint: 'Jonossa on useita omia töitä päällekkäin.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'tulostus-laatu',
    name: 'Tulosteet tulevat raidallisina tai väärän värisinä',
    hint: 'Ongelma toistuu vain yhdellä tulostimella.',
    categories: [TEKNINEN],
    complexity: ['simple'],
  },
  {
    id: 'turvatulostus-kortti',
    name: 'Turvatulostus ei tunnista kulkukorttia',
    hint: 'Kortti toimii ovissa mutta ei tulostimella.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },

  // --- Verkko ---
  {
    id: 'wifi-ei-yhdista',
    name: 'Oppilaitoksen wifi ei yhdistä',
    hint: 'Yhteys katkeaa heti kirjautumisen jälkeen.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'wifi-katkeilee-luokassa',
    name: 'Wifi katkeilee toistuvasti tietyssä luokassa',
    hint: 'Muualla rakennuksessa yhteys toimii normaalisti.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'vpn-etayhteys',
    name: 'VPN-yhteys katkeilee etäpäivänä',
    hint: 'Yhteys putoaa muutaman minuutin välein kotiverkosta.',
    categories: [TEKNINEN],
    complexity: ['complex'],
  },
  {
    id: 'verkkolevy-puuttuu',
    name: 'Verkkolevy ei näy resurssienhallinnassa',
    hint: 'Levy näkyi vielä eilen, nyt se on kadonnut.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },

  // --- Laitteet ---
  {
    id: 'projektori-ei-kuvaa',
    name: 'Luokan projektori ei näytä kuvaa',
    hint: 'Kannettava tunnistaa lisänäytön, mutta valkokangas pysyy mustana.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
    devices: ['koulun kannettava', 'luokan pöytäkone'],
  },
  {
    id: 'telakka-toinen-naytto',
    name: 'Telakan kautta toinen näyttö ei toimi',
    hint: 'Toinen näyttö toimii, toinen jää pimeäksi.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'akku-tyhjenee',
    name: 'Kannettavan akku tyhjenee tunnissa',
    hint: 'Kone on noin kaksi vuotta vanha.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
    devices: ['koulun kannettava', 'oma läppäri'],
  },
  {
    id: 'laturi-ei-lataa',
    name: 'Laturi ei lataa konetta',
    hint: 'Latausvalo ei syty lainkaan.',
    categories: [TEKNINEN],
    complexity: ['simple'],
  },
  {
    id: 'nappaimisto-vaarat-merkit',
    name: 'Näppäimistö kirjoittaa vääriä merkkejä',
    hint: 'Erikoismerkit ja ä/ö menevät sekaisin.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'kuulokkeet-bluetooth',
    name: 'Bluetooth-kuulokkeet eivät yhdistä koneeseen',
    hint: 'Puhelimeen samat kuulokkeet yhdistyvät normaalisti.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'webkamera-ei-toimi',
    name: 'Web-kamera ei toimi etätunnilla',
    hint: 'Kameran valo ei syty missään sovelluksessa.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },
  {
    id: 'kosketuslevy-ei-toimi',
    name: 'Kannettavan kosketuslevy ei reagoi',
    hint: 'Ulkoinen hiiri toimii normaalisti.',
    categories: [TEKNINEN],
    complexity: ['simple'],
  },
  {
    id: 'luokan-kaiuttimet',
    name: 'Luokan kaiuttimista ei kuulu ääntä',
    hint: 'Video pyörii, mutta ääni tulee vain kannettavan omista kaiuttimista.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
  },

  // --- Käyttöjärjestelmä ja ohjelmistot ---
  {
    id: 'windows-paivitys-jumissa',
    name: 'Windows-päivitys on jumissa eikä kone käynnisty loppuun',
    hint: 'Päivitys on ollut samassa prosenttiluvussa pitkään.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'levytila-loppu',
    name: 'Levytila on lopussa eikä mitään voi tallentaa',
    hint: 'Käyttäjä ei tiedä, mikä vie tilan.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'kone-hidas',
    name: 'Kone on hidastunut huomattavasti',
    hint: 'Käynnistyminen kestää useita minuutteja.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },
  {
    id: 'sininen-ruutu',
    name: 'Kone kaatuu siniseen ruutuun satunnaisesti',
    hint: 'Kaatuminen tapahtuu yleensä videoneuvottelun aikana.',
    categories: [TEKNINEN],
    complexity: ['complex'],
  },
  {
    id: 'ohjelma-ei-asennu',
    name: 'Opinnoissa tarvittava ohjelma ei asennu',
    hint: 'Asennus pyytää järjestelmänvalvojan tunnuksia.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },
  {
    id: 'selain-sertifikaattivirhe',
    name: 'Selain antaa sertifikaattivirheen oppilaitoksen sivustolla',
    hint: 'Sama sivu aukeaa puhelimella ongelmitta.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'virtuaalikone-ei-kaynnisty',
    name: 'Virtuaalikone ei käynnisty harjoitustyössä',
    hint: 'Virtualisointi vaikuttaa olevan pois päältä.',
    categories: [TEKNINEN],
    complexity: ['complex'],
  },
  {
    id: 'ohjelman-versio-eri',
    name: 'Ohjelman versio on eri kuin opettajan ohjeessa',
    hint: 'Ohjeen valikkoja ei löydy omasta versiosta.',
    categories: [TEKNINEN, YLEINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'adobe-lisenssi',
    name: 'Adobe-ohjelma ilmoittaa lisenssin päättyneen',
    hint: 'Ohjelma sulkeutuu muutaman minuutin kuluttua avaamisesta.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },

  // --- Tiedostot ---
  {
    id: 'tiedosto-kadonnut',
    name: 'Tallennettu tiedosto on kadonnut',
    hint: 'Käyttäjä ei muista, tallensiko työpöydälle vai pilveen.',
    categories: [TEKNINEN, YLEINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'usb-tikku-ei-nay',
    name: 'USB-tikku ei näy koneella',
    hint: 'Tikku toimi viimeksi toisella koneella.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
  },
  {
    id: 'tiedosto-vioittunut',
    name: 'Palautettava tiedosto ei aukea ja ilmoittaa olevansa vioittunut',
    hint: 'Palautuksen määräaika on lähellä.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'vanha-versio-tallentui',
    name: 'Tiedostosta tallentui vanha versio ja muutokset katosivat',
    hint: 'Tiedostoa muokattiin kahdella laitteella.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },

  // --- Tietoturva ---
  {
    id: 'huijausviesti',
    name: 'Epäilyttävä sähköposti pyytää kirjautumaan tunnuksilla',
    hint: 'Käyttäjä ehti jo klikata linkkiä ja on huolissaan.',
    categories: [YLEINEN, TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'haittaohjelmavaroitus',
    name: 'Virustorjunta antaa toistuvan varoituksen',
    hint: 'Varoitus tulee aina koneen käynnistyessä.',
    categories: [TEKNINEN],
    complexity: ['moderate', 'complex'],
  },
  {
    id: 'selaimen-mainokset',
    name: 'Selaimeen ilmestyi mainoksia ja outo aloitussivu',
    hint: 'Alkoi ilmaisen ohjelman asentamisen jälkeen.',
    categories: [TEKNINEN],
    complexity: ['moderate'],
  },

  // --- Luokkatilat ---
  {
    id: 'luokan-kone-ei-kaynnisty',
    name: 'Luokan pöytäkone ei käynnisty lainkaan',
    hint: 'Merkkivalot eivät syty, tunti on juuri alkamassa.',
    categories: [TEKNINEN],
    complexity: ['simple', 'moderate'],
    devices: ['luokan pöytäkone'],
  },
  {
    id: 'tulostuskiintio-loppu',
    name: 'Tulostuskiintiö on loppunut kesken kurssin',
    hint: 'Käyttäjä tarvitsee tulosteet näyttöä varten.',
    categories: [YLEINEN],
    complexity: ['simple'],
  },
];

/** Yleiset laitevaihtoehdot, kun aiheella ei ole omaa ehdotusta. */
export const DEVICE_POOL = [
  'koulun kannettava',
  'oma läppäri',
  'luokan pöytäkone',
  'oma puhelin',
  'koulun tabletti',
  '', // osa tiketeistä ei mainitse laitetta lainkaan
];

/** Tilannekonteksti tuo vaihtelua myös saman aiheen sisälle. */
export const SITUATION_POOL = [
  'kesken oppitunnin',
  'juuri ennen palautuksen määräaikaa',
  'etäpäivänä kotoa käsin',
  'opintojen ensimmäisellä viikolla',
  'ryhmätyön aikana',
  'näytön tai kokeen valmistelussa',
  'aamulla heti koulun alkaessa',
  'työssäoppimisjakson aikana',
];

const randomFrom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const matchesCategory = (topic: TicketTopic, categoryName: string): boolean => {
  if (topic.categories.length === 0) return true;
  const target = categoryName.toLowerCase();
  return topic.categories.some((c) => {
    const name = c.toLowerCase();
    return target.includes(name) || name.includes(target);
  });
};

/**
 * Arpoo aiheen annetuille parametreille.
 *
 * Suodattimet purkautuvat yksi kerrallaan, jos ne tyhjentäisivät valikoiman:
 * kategoria -> vaikeustaso -> äskettäin käytetyt. Näin funktio palauttaa aina
 * jonkin aiheen, vaikka katalogi ei kattaisi kaikkia kategorioita.
 */
export function pickTicketTopic(params: {
  categoryName: string;
  complexity: string;
  excludeIds?: string[];
}): TicketTopic {
  const { categoryName, complexity, excludeIds = [] } = params;

  const byCategory = TICKET_TOPICS.filter((t) => matchesCategory(t, categoryName));
  const pool = byCategory.length > 0 ? byCategory : TICKET_TOPICS;

  const byComplexity = pool.filter((t) => t.complexity.includes(complexity as Complexity));
  const complexityPool = byComplexity.length > 0 ? byComplexity : pool;

  const fresh = complexityPool.filter((t) => !excludeIds.includes(t.id));
  const finalPool = fresh.length > 0 ? fresh : complexityPool;

  return randomFrom(finalPool);
}

/** Arpoo laitteen: ensisijaisesti aiheen omista ehdotuksista. */
export function pickDevice(topic: TicketTopic): string {
  return topic.devices && topic.devices.length > 0
    ? randomFrom(topic.devices)
    : randomFrom(DEVICE_POOL);
}

export function pickSituation(): string {
  return randomFrom(SITUATION_POOL);
}

export const getTopicById = (id: string): TicketTopic | undefined =>
  TICKET_TOPICS.find((t) => t.id === id);
