# ModernTicketGeneratorAgent - Realistinen Tikettien Generaattori

ModernTicketGeneratorAgent on uuden sukupolven tikettien generaattori, joka luo realistisia IT-tukipyyntöjä harjoituskäyttöön. Se simuloi eri teknisten taitotasojen käyttäjiä ja tuottaa tikettejä, jotka vastaavat todellisia käyttäjien kirjoittamia pyyntöjä.

## Päätavoitteet

1. **Realistinen käyttäjäsimulaatio**: Aloittelijat kirjoittavat epämääräisesti, asiantuntijat teknisesti
2. **Teknisen tason skaalaus**: Automaattinen mukautus käyttäjäprofiilin mukaan
3. **Vaihteleva kirjoitustyyli**: 5 erilaista tyyliä lisäämään vaihtelua
4. **Strukturoitu output**: Käyttää Zod-skeemoja ja OpenAI:n JSON-moodia

## Ongelmat, jotka ratkaistiin

### Vanhan generaattorin ongelmat:
- Opiskelijat kirjoittivat liian teknisesti: "DHCP-asiakasosoite 169.254.x.x"
- Liikaa vianetsintäkokeiluja: "ping 8.8.8.8, DNS-haku, IPv4-asetukset"
- Liian muodollinen rakenne: järjestelmälliset listat ja osiot
- Samankaltaiset tiketit toistuvasti

### Uuden generaattorin ratkaisut:
- Aloittelijat: "netti ei toimi", "en pääse mihinkään"
- Realistiset kokeilut: max 1-2 yksinkertaista asiaa
- Kaoottinen rakenne aloittelijoilla
- 5 eri kirjoitustyyliä vaihtelua varten

## Tekninen Toteutus

### Strukturoitu Output Schema

```typescript
const ModernTicketSchema = z.object({
  title: z.string().max(50),
  description: z.string(),
  device: z.string(), // Tyhjä merkkijono jos ei mainita
  additionalInfo: z.string(), // Tyhjä merkkijono jos ei lisätietoja
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  style: z.enum(["panic", "confused", "frustrated", "polite", "brief"]),
  technicalAccuracy: z.number().min(0).max(1) // 0-1 skaalalla
});
```

### Teknisen tason määritykset

```typescript
const TECHNICAL_CONFIGS = {
  beginner: {
    maxTerms: 1,        // Max 1 tekninen termi
    maxLength: 150,     // Lyhyet kuvaukset
    triedSteps: [0, 1], // 0-1 yritystä
    vagueness: 'high',  // Erittäin epämääräinen
    structure: 'chaotic'
  },
  intermediate: {
    maxTerms: 3,
    maxLength: 250,
    triedSteps: [1, 3],
    vagueness: 'medium',
    structure: 'semi-organized'
  },
  advanced: {
    maxTerms: 10,
    maxLength: 400,
    triedSteps: [3, 5],
    vagueness: 'low',
    structure: 'organized'
  }
};
```

## Kirjoitustyylit

### 1. Panic (Paniikki)
```
"APUA!! Kaikki on rikki enkä pääse tekemään mitään!!! 
Pitää saada toimimaan HETI!"
```
- Hätäinen sävy
- Huutomerkkejä
- Kiireellisyys korostuu

### 2. Confused (Hämmentynyt)
```
"En ymmärrä mikä tässä on vialla? Yritin jotain mutta 
en tiedä auttoiko se? Mitä pitäisi tehdä?"
```
- Epävarma sävy
- Kysymyksiä
- Ei ymmärrä tilannetta

### 3. Frustrated (Turhautunut)
```
"Tämä ei taaskaan toimi. Sama ongelma ollut jo viikon. 
Olen kokeillut kaikkea mutta mikään ei auta."
```
- Ärtynyt sävy
- Mainitsee toistuvan ongelman
- Ilmaisee turhautumista

### 4. Polite (Kohtelias)
```
"Hei! Voisitteko ystävällisesti auttaa minua tämän ongelman 
kanssa? Kiitos jo etukäteen avustanne."
```
- Muodollinen sävy
- Tervehdys ja kiitos
- Kohtelias kielenkäyttö

### 5. Brief (Lyhyt)
```
"Netti ei toimi. Mitä teen?"
```
- 1-2 lausetta max
- Vain oleellinen
- Ei selityksiä

## Teknisen tason määritys käyttäjäprofiilista

```typescript
private getTechnicalLevel(userProfile: string): TechnicalLevel {
  switch (userProfile) {
    case 'student':
      // 70% aloittelijoita, 30% keskitasoisia
      return Math.random() > 0.7 ? 'intermediate' : 'beginner';
    case 'teacher':
      // 80% keskitasoisia, 20% edistyneitä
      return Math.random() > 0.8 ? 'advanced' : 'intermediate';
    case 'staff':
      // Tasaisesti jakautunut
      const rand = Math.random();
      return rand > 0.6 ? 'intermediate' : rand > 0.3 ? 'beginner' : 'advanced';
    case 'administrator':
      // Aina edistyneitä
      return 'advanced';
  }
}
```

## Dynaaminen Promptin Rakentaminen

### Aloittelijan ohjeistus
```
CRITICAL RULES FOR BEGINNER:
- DO NOT use technical terms like: IP, DNS, DHCP, ping, port
- DO NOT mention specific error codes
- DO NOT list multiple troubleshooting steps
- Be VERY vague: "netti ei toimi", "kone on rikki"
- Focus on what they CAN'T DO, not technical symptoms
- Maximum 150 characters
```

### Keskitason ohjeistus
```
RULES FOR INTERMEDIATE USER:
- Can use SOME basic technical terms but often incorrectly
- Might mention "WiFi", "salasana", "verkko"
- Can try 1-3 basic troubleshooting steps
- Still somewhat vague but tries to be helpful
- Maximum 250 characters
```

### Edistyneen ohjeistus
```
RULES FOR ADVANCED USER:
- Can use technical terms appropriately
- Can describe symptoms accurately
- Lists relevant troubleshooting steps taken
- Provides useful technical context
- Maximum 400 characters
```

## Käyttöesimerkkejä

### Aloittelija + Panic
```json
{
  "title": "KAIKKI ON RIKKI",
  "description": "APUA! En pääse minnekään ja pitää palauttaa tehtävät!! Kokeilin sammuttaa koneen mut ei auta! AUTTAKAA!",
  "device": "läppäri",
  "additionalInfo": "",
  "priority": "HIGH",
  "technicalAccuracy": 0.1
}
```

### Aloittelija + Confused
```json
{
  "title": "netti ei toimi",
  "description": "hei, mulla ei toimi netti? en tiedä mikä on vialla. wifi näkyy mut sivut ei lataa? mitä teen?",
  "device": "",
  "additionalInfo": "",
  "priority": "MEDIUM",
  "technicalAccuracy": 0.2
}
```

### Keskitaso + Polite
```json
{
  "title": "WiFi-yhteysongelma",
  "description": "Hei! Minulla on ongelmia WiFi-yhteyden kanssa. Yhteys näyttää olevan päällä, mutta Chrome sanoo 'ei internetyhteyttä'. Olen kokeillut käynnistää koneen uudelleen ja unohtaa verkon, mutta ongelma jatkuu. Voisitteko auttaa?",
  "device": "Dell Latitude",
  "additionalInfo": "Ongelma alkanut tänään",
  "priority": "MEDIUM",
  "technicalAccuracy": 0.5
}
```

### Edistynyt + Frustrated
```json
{
  "title": "DNS-resoluutio epäonnistuu verkossa",
  "description": "DNS-palvelin ei vastaa kyselyihin. DHCP jakaa osoitteet normaalisti (192.168.1.x), mutta DNS-palvelin 8.8.8.8 ei ole tavoitettavissa. Ping toimii IP-osoitteisiin mutta ei domaineihin. Olen tarkistanut palomuuriasetukset ja DNS-välimuistin tyhjennys ei auttanut. Sama ongelma kaikilla työasemilla.",
  "device": "Kaikki verkkolaitteet",
  "additionalInfo": "Ongelma alkanut verkkokatkoksen jälkeen",
  "priority": "CRITICAL",
  "technicalAccuracy": 0.9
}
```

## Integraatio järjestelmään

### Version valinta
```typescript
// aiController.ts
const useModernGenerator = await aiSettingsService.useModernTicketGenerator();
const generator = useModernGenerator ? modernTicketGenerator : ticketGenerator;
```

### Tietokanta-asetukset
```typescript
// AISettings-taulu
ticketGeneratorVersion: 'modern' | 'legacy'
```

### Frontend-integraatio
- AI Settings -sivulla valittavissa
- Oletuksena 'legacy' taaksepäin yhteensopivuuden vuoksi
- Vaihdettavissa lennossa ilman uudelleenkäynnistystä

## Hyödyt verrattuna vanhaan

| Ominaisuus | Vanha generaattori | Moderni generaattori |
|------------|-------------------|---------------------|
| Aloittelijat | "DHCP 169.254.x.x" | "netti ei toimi" |
| Vianetsintä | 5-10 teknistä koetta | 0-1 yksinkertaista |
| Rakenne | Aina muodollinen | Vaihtelee tason mukaan |
| Vaihtelu | Samankaltaisia | 5 eri tyyliä |
| Realistisuus | Liian tekninen | Todellisen kaltainen |
| Merkkimäärä | Aina pitkä | 150-400 merkkiä |

## Lokitus

ModernTicketGeneratorAgent käyttää emojipohjaista lokitusta:

- 🎫 Tikettien generointi
- 🔄 Mallin alustus
- 🎨 Konfiguraation valinta
- ✅ Onnistunut generointi
- ❌ Virhetilanteet

## Tulevaisuuden kehitys

1. **Kontekstuaalinen vaihtelu**: Eri tyylit eri aikoina (kiire aamulla, rauhallinen iltapäivällä)
2. **Organisaatiokohtaiset profiilit**: Eri organisaatioiden kirjoitustyylien simulointi
3. **Kielioppivirheet**: Realistisempia kirjoitusvirheitä aloittelijoille
4. **Emotionaalinen progressio**: Turhautumisen kasvu ajan myötä