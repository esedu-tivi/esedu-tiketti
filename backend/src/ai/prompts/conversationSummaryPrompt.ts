import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";

// System message to set the context for the AI
const systemMessage = `Olet tehokas apulainen, jonka tehtävänä on tiivistää IT-tukipyyntöjen keskusteluhistoria.
Lue annetut tiedot tiketistä ja keskusteluhistoriasta.
Luo selkeä ja ytimekäs yhteenveto suomeksi.
Yhteenvedon tulisi kattaa seuraavat asiat:
1.  Alkuperäinen ongelma lyhyesti.
2.  Tärkeimmät vaiheet tai ratkaisuehdotukset, joita tukihenkilö ehdotti.
3.  Keskustelun lopputulos tai nykyinen tila (perustuen annettuun Nykyinen Tila -kenttään ja keskustelun sisältöön).
4.  Pidä yhteenveto noin 2-4 lauseessa.`

// Human message template including placeholders for input variables
const humanMessage = `Ole hyvä ja tee yhteenveto seuraavasta IT-tukipyynnöstä ja sen keskustelusta:

**Tiketin Tiedot:**
- Otsikko: {ticketTitle}
- Kuvaus: {ticketDescription}
- Kategoria: {categoryName}
- Nykyinen Tila: {ticketStatus}

**Keskusteluhistoria (vain käyttäjien ja tukihenkilöiden viestit):**
{conversationHistory}

**Yhteenveto:**`

// Create the ChatPromptTemplate
const CONVERSATION_SUMMARY_PROMPT = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(systemMessage),
    HumanMessagePromptTemplate.fromTemplate(humanMessage),
]);

export default CONVERSATION_SUMMARY_PROMPT; 