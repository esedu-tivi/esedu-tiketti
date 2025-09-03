# ModernChatAgent - Moderni Chat-agentti

ModernChatAgent on uuden sukupolven tekoälyagentti, joka simuloi käyttäjää harjoitustikettien keskusteluissa. Se käyttää yhtä LLM-kutsua kahden sijaan, parantaen suorituskykyä ja johdonmukaisuutta.

## Päätavoitteet

1. **Yksittäinen LLM-kutsu**: Yhdistää arvioinnin ja vastauksen generoinnin samaan kutsuun
2. **Strukturoitu output**: Käyttää Zod-skeemoja ja OpenAI:n JSON-moodia tyyppiturvallisuuteen
3. **Tunnelmatilan seuranta**: Realistisempi käyttäjäsimulaatio emotionaalisilla tiloilla
4. **Älykäs vihjesysteemi**: ConversationStateMachine hallitsee vihjeiden ajoitusta

## Arkkitehtuuri

### ModernChatAgent (Tuotantokäyttöön)
- Yksittäinen LLM-kutsu strukturoidulla outputilla
- Zod-validointi kaikille vastauksille
- Sisäänrakennettu reasoning ja emotional state
- Kaikki kentät tallennetaan tietokantaan 

## Tekninen Toteutus

### Strukturoitu Output Schema

```typescript
const ChatResponseSchema = z.object({
  evaluation: z.enum(["EARLY", "PROGRESSING", "CLOSE", "SOLVED"]),
  reasoning: z.string(), // Sisäinen päättely (ei näytetä käyttäjälle)
  response: z.string(),  // Käyttäjän vastaus
  emotionalState: z.enum(["frustrated", "hopeful", "excited", "satisfied", "confused"]),
  hintGiven: z.boolean() // Annettiinko vihje vastauksessa (asetetaan true kun ohjeistettu)
});
```

### Käyttöliittymät

```typescript
interface TicketContext {
  title: string;
  description: string;
  device?: string;
  category: string;
  additionalInfo?: string;
  solution: string;
  userProfile: {
    name: string;
    role: "student" | "teacher" | "staff";
    technicalLevel: "beginner" | "intermediate" | "advanced";
  };
}

interface ConversationTurn {
  role: "support" | "user";
  content: string;
  timestamp: Date;
}
```

### Päämenetelmä

```typescript
async respond(
  ticketContext: TicketContext,
  conversationHistory: ConversationTurn[],
  latestSupportMessage: string,
  forceHint: boolean = false  // Uusi parametri vihjesysteemin hallintaan
): Promise<ChatResponse>
```

## Integraatio Järjestelmään

### AISettings-pohjainen konfiguraatio

ModernChatAgent käytetään tietokanta-asetusten kautta:

```typescript
// AISettings-taulun asetukset:
chatAgentVersion: "modern" | "legacy"  // Valitse käytettävä agentti
hintSystemEnabled: boolean              // Vihjesysteemin tila
hintOnEarlyThreshold: number           // Vihjeiden kynnysarvo (oletus 3)
hintCooldownTurns: number              // Vihjeiden väli (oletus 0)
hintMaxPerConversation: number         // Maksimi vihjeet (oletus 999)
```

### API-integraatio (aiController.ts)

```typescript
// Hae AI-asetukset tietokannasta
const aiSettings = await aiSettingsService.getSettings();
const useModernAgent = aiSettings.chatAgentVersion === 'modern';

// ConversationStateMachine hallinta
const conversationStates = new Map<string, ConversationStateMachine>();

const getOrCreateStateMachine = (ticketId: string): ConversationStateMachine => {
  let stateMachine = conversationStates.get(ticketId);
  if (!stateMachine) {
    stateMachine = new ConversationStateMachine();
    conversationStates.set(ticketId, stateMachine);
  }
  return stateMachine;
};

// ModernChatAgent kutsu
if (useModernAgent) {
  const stateMachine = getOrCreateStateMachine(ticket.id);
  
  // Tarkista vihjesysteemi AI-asetuksista
  const shouldForceHint = stateMachine.shouldProvideHint({
    enabled: aiSettings.hintSystemEnabled,
    earlyThreshold: aiSettings.hintOnEarlyThreshold,
    progressThreshold: aiSettings.hintOnProgressThreshold,
    closeThreshold: aiSettings.hintOnCloseThreshold,
    cooldownTurns: aiSettings.hintCooldownTurns,
    maxHints: aiSettings.hintMaxPerConversation
  });
  
  const response = await modernChatAgent.respond(
    {
      // Tiketin konteksti
      title, description, device, category, additionalInfo, solution,
      userProfile: {
        name: ticketCreator?.name,
        role: userProfile, // student/teacher/staff
        technicalLevel: mappedFromPriority // beginner/intermediate/advanced
      }
    },
    // Keskusteluhistoria muunnettuna
    conversationHistory,
    // Viimeisin tukihenkilön viesti
    latestSupportMessage,
    // Vihjeohje StateMachinelta
    hintInstruction // { giveHint: true, hintType: 'EARLY', hintNumber: 1 }
  );
  
  // Päivitä tilakoneen tila
  stateMachine.transition(response.evaluation);
  
  // HUOM: Tietokantaan (Comment-taulu) tallennetaan NYT KAIKKI kentät:
  // - content: response.response (vastauksen teksti)
  // - evaluationResult: response.evaluation
  // - emotionalState: response.emotionalState
  // - reasoning: response.reasoning
  // - shouldRevealHint: response.hintGiven // Tallennetaan tietokantaan
  // - isAiGenerated: true
  // - ticketId, authorId
}
```

## Ominaisuudet

### 1. Emotionaalinen Älykkyys

Agentti seuraa ja ilmaisee viittä tunnettilaa:
- **frustrated**: Ongelma jatkuu, ei edistystä
- **confused**: Epäselvät ohjeet
- **hopeful**: Jonkin verran edistystä
- **excited**: Lähellä ratkaisua
- **satisfied**: Ongelma ratkaistu

### 2. Kontekstitietoinen Vastaus

Vastauksen pituus ja tyyli mukautuvat:
- **EARLY**: 2-4 lausetta, hämmentynyt ja turhautunut
- **PROGRESSING**: 2-4 lausetta, varovaisen optimistinen
- **CLOSE**: 3-5 lausetta, innokas ja kiinnostunut
- **SOLVED**: 4-6 lausetta, helpottunut ja kiitollinen

### 3. Vihjetoiminnallisuus

#### Toimintaperiaate (Refaktoroitu 2025-01-02)
- **ConversationStateMachine päättää MILLOIN** vihje annetaan
- **AI-agentti vain noudattaa ohjeita** - ei tee omaa päätöstä vihjeistä
- Vihjeiden asetukset haetaan AISettings-taulusta tietokannasta
- StateMachine seuraa jumiutumista ja päättää vihjeiden tarpeesta
- Kun vihje päätetään antaa, AI saa suoran ohjeen: "Anna vihje"
- AI asettaa `hintGiven: true` kun on sisällyttänyt vihjeen vastaukseen

#### Toteutus
```typescript
class ConversationStateMachine {
  private stuckCounter: number = 0;
  private hintCount: number = 0;
  private turnsSinceLastHint: number = 0;
  
  transition(evaluation: string): void {
    if (evaluation === 'EARLY') {
      this.stuckCounter++;
    } else {
      this.stuckCounter = 0; // Nollaa kun edistyy
    }
    this.turnsSinceLastHint++;
  }
  
  shouldProvideHint(settings?: {
    enabled: boolean;
    earlyThreshold: number;
    progressThreshold: number | null;
    closeThreshold: number | null;
    cooldownTurns: number;
    maxHints: number;
  }): { shouldHint: boolean; triggerType?: 'EARLY' | 'PROGRESSING' | 'CLOSE' } {
    if (!settings?.enabled) return { shouldHint: false };
    if (this.hintCount >= settings.maxHints) return { shouldHint: false };
    if (this.turnsSinceLastHint < settings.cooldownTurns) return { shouldHint: false };
    
    // Tarkista kynnysarvot ja palauta vihjetyyppi
    if (this.stuckCounter >= settings.earlyThreshold) {
      return { shouldHint: true, triggerType: 'EARLY' };
    }
    if (settings.progressThreshold && this.progressCounter >= settings.progressThreshold) {
      return { shouldHint: true, triggerType: 'PROGRESSING' };
    }
    if (settings.closeThreshold && this.closeCounter >= settings.closeThreshold) {
      return { shouldHint: true, triggerType: 'CLOSE' };
    }
    
    return { shouldHint: false };
  }
}
```

#### Uusi yksinkertaistettu arkkitehtuuri (2025-01-02)

**Ennen:** AI sai säännöt ja päätti itse milloin antaa vihjeitä
```typescript
// Vanha: AI sai koko konfiguraation ja säännöt
const hintConfig = {
  enabled: true,
  earlyThreshold: 3,
  progressThreshold: 2,
  // ... AI päätti itse shouldRevealHint-arvon
};
```

**Nyt:** StateMachine päättää, AI vain noudattaa ohjeita
```typescript
// Uusi: Selkeä ohje StateMachinelta
const hintInstruction = {
  giveHint: true,         // Selkeä käsky: anna vihje
  hintType: 'EARLY',      // Konteksti: mikä laukaisi vihjeen
  hintNumber: 1,          // Monesko vihje tämä on
  stuckDuration: 3        // Kuinka kauan ollut jumissa
};
```

#### Vihjeiden Granulariteetti (Päivitetty 2025-01-02)

**EARLY-vaiheen vihjeet (Tuki on eksyksissä):**
- **Vihje #1 - ULTRA EPÄMÄÄRÄINEN**: 
  - Vain ilmaisee hämmennystä, ei teknisiä yksityiskohtia
  - Esim: "En ymmärrä mikä tässä on vialla..." tai "Jotain on pielessä..."
- **Vihje #2 - HIEMAN TARKEMPI**:
  - Voi mainita hyvin laajan kategorian
  - Esim: "Tuntuu että jotain verkossa on pielessä..." tai "Ongelma liittyy jotenkin nettiin..."
- **Vihje #3 - KATEGORIA MAININTA**:
  - Voi mainita yleisen ongelma-alueen
  - Esim: "Luulen että ongelma on jossain asetuksissa..." tai "Verkkoasetukset tuntuvat oudoilta..."

**PROGRESSING-vaiheen vihjeet (Oikea alue tunnistettu):**
- **Ensimmäinen vihje**:
  - Voi mainita havaittuja oireita
  - Esim: "Huomasin että sivut eivät lataudu vaikka WiFi on päällä..."
- **Myöhemmät vihjeet**:
  - Tarkempia oireita ja havaintoja
  - Esim: "DNS-asetukset näyttävät oudoilta..." tai konkreettisia arvoja

**CLOSE-vaiheen vihjeet (Melkein perillä):**
- Hyvin spesifisiä yksityiskohtia
- Esim: "DNS on 0.0.0.0, pitäisikö sen olla jotain muuta?"
- Voi mainita tarkkoja arvoja tai asetuksia ratkaisusta

#### Promptissa
- AI saa selkeän ohjeen StateMachinelta:
  - "🎯 MANDATORY INSTRUCTION: You MUST include a hint"
  - Progressiiviset ohjeet vihjeen numeron mukaan
  - Ei päätöksentekoa, vain ohjeiden noudattamista
- `hintGiven` asetetaan true:ksi kun vihje on annettu

### 4. Reasoning-kenttä

Sisäinen päättelylogiikka dokumentoidaan mutta ei näytetä käyttäjälle:
- Miksi tietty evaluation valittiin
- Mitä kohtia ratkaisusta huomioitiin
- Miten emotionaalinen tila määräytyi

## Streaming-toteutus - POISTETTU

### StreamingChatAgent

**HUOM**: Tämä toteutus on poistettu koodikannasta koska sitä ei käytetty.

Erikoistunut versio reaaliaikaiseen vastaukseen:

```typescript
async *respondStream(
  ticketContext: TicketContext,
  conversationHistory: ConversationTurn[],
  latestSupportMessage: string
): AsyncGenerator<Partial<ChatResponse>>
```

**Toimintaperiaate:**
1. Nopea evaluation erillisellä kutsulla (100-200ms)
2. Yield metadata heti (evaluation, emotionalState)
3. Stream varsinainen vastaus chunk kerrallaan
4. Yield lopullinen täydellinen vastaus

## ConversationStateMachine

Tilakone keskustelun kulun hallintaan ja vihjeiden ajoitukseen:

```typescript
class ConversationStateMachine {
  private state: "initial" | "diagnosing" | "attempting" | "verifying" | "resolved";
  private turnCount: number;
  private stuckCounter: number;
  
  transition(evaluation: ChatResponse["evaluation"]): void;
  shouldProvideHint(): boolean;
  getResponseGuidance(): ResponseGuidance;
}
```

**Tilasiirtymät:**
- `initial` → `diagnosing` (kun PROGRESSING)
- `diagnosing` → `attempting` (kun CLOSE)
- `attempting` → `verifying` (kun SOLVED)
- `verifying` → `resolved` (keskustelu päättyy)

**Vihjelogiikka:**
- Seuraa peräkkäisiä EARLY-evaluointeja
- Nollaa laskurin kun tapahtuu edistystä
- Aktivoi vihjeen kun `stuckCounter >= 3`
- Toimii kaikissa tiloissa, ei pelkästään initial-tilassa

## Suorituskykyedut

### Verrattuna vanhaan ChatAgentiin:

| Ominaisuus | Vanha ChatAgent | ModernChatAgent |
|------------|-----------------|-----------------|
| LLM-kutsuja | 2 per vastaus | 1 per vastaus |
| Vasteaika | ~2-3 sekuntia | ~1-2 sekuntia |
| Tyyppiturvallisuus | Ei | Kyllä (Zod) |
| Emotionaalinen tila | Ei | Kyllä |
| Streaming | Ei | Kyllä |
| Strukturoitu output | Ei | Kyllä |

## UI-näkymät ja Tietojen Näyttäminen

### Tukihenkilön näkymä (CommentSection.jsx)
**Näytetään vain:**
- AI:n vastauksen teksti
- "Vihje annettu" -badge kun `shouldRevealHint: true` (tietokannasta)
- AI Agent -merkintä

**EI näytetä:**
- Evaluation state (EARLY/PROGRESSING/CLOSE/SOLVED)
- Emotional state (frustrated/hopeful/excited/satisfied/confused)
- Reasoning (sisäinen päättely)

**Syy:** Tukihenkilöt ovat opiskelijoita, jotka harjoittelevat. Sisäiset AI-tiedot voisivat häiritä oppimisprosessia.

### Admin-analytiikkanäkymä (ConversationModal.jsx)
**Näytetään kaikki:**
- AI:n vastauksen teksti
- Evaluation state badge värikoodattuna + selitys tooltip
- Emotional state badge emojilla
- "Vihje annettu" -badge
- Reasoning-osio (avattava dropdown)
- Kaikki metadata analyysiä varten

**Syy:** Adminit ja kouluttajat tarvitsevat täyden näkyvyyden analysoidakseen oppimisprosessia ja AI:n toimintaa.

### Tietokantatallennukset
Kaikki ModernChatAgent-kentät tallennetaan Comment-tauluun:
- `content`: Vastauksen teksti
- `evaluationResult`: EARLY/PROGRESSING/CLOSE/SOLVED
- `emotionalState`: frustrated/hopeful/excited/satisfied/confused
- `reasoning`: Sisäinen päättely
- `shouldRevealHint`: Boolean-arvo vihjeestä (response.hintGiven)
- `isAiGenerated`: true

## Lokitus

ModernChatAgent käyttää emojipohjaista lokitusta selkeyden vuoksi:

- 🚀 Initialisointi ja käynnistys
- 🤖 Prosessin aloitus
- 📋 Kontekstitiedot
- 💬 Viestit
- ⏱️ Suoritusajat
- ✅ Onnistuneet operaatiot
- ❌ Virheet
- 🔄 Fallback-tilanteet
- 📊 Tilastot ja tulokset
- 🌊 Streaming-operaatiot

## Käyttöönotto

### Kehitysympäristö

1. Käytä AI-asetukset sivua (Admin-oikeudet vaaditaan):
   - Navigoi: AI-työkalut → AI-asetukset
   - Valitse Chat Agent -välilehti
   - Valitse ModernChatAgent tai ChatAgent
   - Määritä vihjesysteemin asetukset

2. Käynnistä backend uudelleen jos tarvitaan

3. Tarkkaile lokeja modern agent -merkinnöistä

### Tuotantoympäristö

1. Aloita legacy-agentilla (oletusasetus):
   - AISettings.chatAgentVersion = "legacy"

2. Testaa pienellä käyttäjäryhmällä:
   - Vaihda AISettings.chatAgentVersion = "modern"
   - Konfiguroi vihjesysteemin asetukset

3. Seuraa suorituskykyä ja virheitä

4. Asteittainen käyttöönotto kaikille

## Rajoitukset

- OpenAI ei tue vielä suoraan strukturoitua streaming-outputtia
- Streaming-versio käyttää hybridi-lähestymistapaa (2 kutsua)
- JSON-moodi vaatii GPT-4 tai uudemman mallin
- Emotionaalinen tila on rajattu viiteen vaihtoehtoon

## Jatkokehitys

- Monimutkaisemmat emotionaaliset tilat
- Persoonallisuusprofiilien tuki
- Muistimekanismi pitkille keskusteluille
- Multimodaalinen tuki (kuvat, ääni)
- Fine-tuning mahdollisuus
- Keskustelun kontekstin kompressio