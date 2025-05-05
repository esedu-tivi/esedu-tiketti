import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, MessageSquare, ArrowRight, Check, Copy, RefreshCw,
  SlidersHorizontal, FileBox, BarChart3, ChevronDown, ChevronUp, 
  Plus, X, PanelLeft, PanelRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Define sample ticket scenarios
const SAMPLE_SCENARIOS = [
  {
    id: 1,
    title: "Outlook ei käynnisty Windows 10:ssä",
    description: "Outlook-sovellus kaatuu heti käynnistyksen yhteydessä. Virheilmoitus näyttää 'Outlook ei voi käynnistyä'. Käyttäjä on jo kokeillut tietokoneen uudelleenkäynnistystä.",
    category: "Ohjelmisto-ongelmat",
    device: "Lenovo ThinkPad X1 Carbon",
    priority: "MEDIUM",
    conversations: [],
    knowledgeArticles: [
      "Office-sovellusten korjaustyökalu", 
      "Outlook-profiilin uudelleenluonti", 
      "Office-sovellusten välimuistin tyhjennys"
    ]
  },
  {
    id: 2,
    title: "Wi-Fi-yhteysongelma Android-puhelimessa",
    description: "Käyttäjän Samsung Galaxy S21 -puhelin ei muodosta yhteyttä toimiston Wi-Fi-verkkoon. Muut laitteet toimivat normaalisti. Puhelin on päivitetty viimeisimpään Android-versioon.",
    category: "Verkko-ongelmat",
    device: "Samsung Galaxy S21",
    priority: "HIGH",
    conversations: [],
    knowledgeArticles: [
      "Android Wi-Fi-asetusten nollaus", 
      "Organisaation Wi-Fi-verkkojen sallitut laitteet", 
      "Mobiililaitteiden verkkoyhteysongelmat"
    ]
  },
  {
    id: 3,
    title: "Tulostinvirhe HP LaserJet",
    description: "Työaseman HP LaserJet -tulostin näyttää 'Paperitukos'-virhettä, vaikka paperia ei ole juuttunut. Tulostin on toimiston yhteiskäytössä osastolla.",
    category: "Laitteisto-ongelmat",
    device: "HP LaserJet Pro MFP M428fdw",
    priority: "MEDIUM",
    conversations: [],
    knowledgeArticles: [
      "HP-tulostinten virhekoodit", 
      "Tulostimen huolto-ohjelma", 
      "Paperitukoksen ratkaiseminen HP-laitteissa"
    ]
  },
];

// Sample assistant responses for the demo
const ASSISTANT_RESPONSES = {
  1: [
    "Outlook-käynnistysongelmien yleisimmät aiheuttajat ovat korruptoitunut Outlook-profiili, Office-päivitysten ongelmat tai vioittunut PST-tiedosto. Tukiartikkelien perusteella seuraavat toimenpiteet kannattaa kokeilla järjestyksessä:\n\n1. **Korjaa Office asennukset** käyttämällä korjaustyökalua Ohjauspaneelin kautta (Ohjelmat > Office > Muuta > Korjaa)\n\n2. **Luo uusi Outlook-profiili** käyttämällä Ohjauspaneelin Sähköpostitilejä. Tämä on tehokas ratkaisu, kun Outlook-profiili on vioittunut.\n\n3. **Poista välimuisti** menemällä kansioon C:\\Users\\[käyttäjätunnus]\\AppData\\Local\\Microsoft\\Outlook ja poistamalla .ost tai .pst -tiedostot (varmuuskopioi ensin).\n\nKannattaa aloittaa näistä toimenpiteistä järjestyksessä, kunnes Outlook käynnistyy normaalisti.",
    "Koska olet jo kokeillut tietokoneen uudelleenkäynnistystä, seuraava askel olisi kokeilla Office-sovellusten korjaustyökalua. Tämä voidaan tehdä seuraavasti:\n\n1. Avaa Ohjauspaneeli\n2. Valitse \"Ohjelmat ja toiminnot\"\n3. Etsi Microsoft Office tuotelistasta\n4. Valitse \"Muuta\"\n5. Valitse \"Pikakorjaus\" ja seuraa ohjeita\n\nJos tämä ei ratkaise ongelmaa, seuraava askel olisi Outlook-profiilin uudelleenluonti. Haluatko tarkat ohjeet siihen seuraavaksi?",
    "Tässä on vielä yksi vaihtoehtoinen tapa, jolla voit yrittää ratkaista ongelman: suorita Outlook turvallisessa tilassa komennolla \"outlook.exe /safe\" ja kokeile, käynnistyykö se. Jos se käynnistyy, ongelma saattaa liittyä lisäosiin. Voit poistaa lisäosat käytöstä Outlookin asetuksista kohdasta \"Lisäosat\"."
  ],
  2: [
    "Wi-Fi-yhteysongelmissa Android-laitteilla kannattaa ensin tarkistaa perusasiat ja edetä sitten monimutkaisempiin ratkaisuihin. Organisaatiomme Wi-Fi-verkkoon liittymisessä voi olla laitteisiin liittyviä rajoituksia.\n\n**Ehdotetut toimenpiteet:**\n\n1. **Nollaa verkkoasetukset** Android-puhelimessa: Asetukset > Järjestelmä > Nollaa > Nollaa Wi-Fi, mobiilidata ja Bluetooth\n\n2. **Varmista, että laite on sallittujen laitteiden listalla**. Yrityksemme voi rajoittaa tiettyjä laitteita MAC-osoitteiden perusteella. IT-tukihenkilö voi tarkistaa verkkoylläpitäjältä.\n\n3. **Unohda verkko ja yhdistä uudelleen**: Asetukset > Wi-Fi > Paina pitkään verkon nimeä > Unohda verkko > Yhdistä uudelleen ja syötä salasana\n\n4. Tarkista, että puhelimen Wi-Fi MAC-osoite on oikein ja vastaa järjestelmässä olevaa tietoa.\n\nOrganisaation verkkoartikkelien perusteella tarkistaisin ensin, onko puhelin sallittujen laitteiden listalla.",
    "Koska mainitsit, että muut laitteet toimivat normaalisti verkon kanssa, ongelma liittyy todennäköisesti tähän tiettyyn Android-laitteeseen. Suosittelen seuraavia toimenpiteitä:\n\n1. Tarkista, että lentotila ei ole päällä, ja että Wi-Fi on kytketty päälle\n2. Nollaa verkkoasetukset laitteessa: Asetukset > Järjestelmä > Nollaa > Nollaa verkkoasetukset\n3. Unohda nykyinen Wi-Fi-verkko ja yritä yhdistää uudelleen\n4. Tarkista onko saatavilla järjestelmäpäivityksiä laitteelle\n\nKannattaa myös tarkistaa IT-osastolta, onko kyseisen laitteen MAC-osoite lisätty sallittujen laitteiden listalle verkossa.",
    "Jos aiemmat ehdotukset eivät ratkaisseet ongelmaa, ongelman syy saattaa olla verkkoasetusten yhteensopivuudessa. Android-puhelimen 5 GHz:n verkkoyhteensopivuus saattaa olla ongelma, jos yrityksen verkko käyttää tätä taajuutta. Kokeile vaihtaa Wi-Fi-verkkoasetukset 2.4 GHz:n taajuudelle (Asetukset > Yhteydet > Wi-Fi > ⋮ > Lisäasetukset > Wi-Fi-taajuuskaista)."
  ],
  3: [
    "HP LaserJet -tulostimien valheelliset paperitukosvirheilmoitukset voivat johtua useista syistä. Tukiartikkelien ja tulostimen mallin perusteella suosittelen seuraavia toimenpiteitä:\n\n1. **Tarkista tulostimen sisäosat** huolellisesti mahdollisten paperinpalasten tai vierasesineiden varalta. Avaa kaikki tulostimen luukut ja tarkista paperin kulkureitti.\n\n2. **Puhdista paperintunnistusanturit** - nämä sijaitsevat paperin syöttöalueella ja voivat likaantuessaan aiheuttaa vääriä tukoshälytyksiä. Käytä kuivaa, nukkaamatonta liinaa.\n\n3. **Päivitä tulostimen firmware** - valmistajan sivuilta löytyy uusin firmware tälle mallille, joka voi korjata tunnettuja ohjelmistovirheitä.\n\n4. **Suorita tulostimen diagnostiikkatesti** - tämä tehdään pitämällä OK-näppäintä pohjassa virran kytkemisen yhteydessä ja valitsemalla diagnostiikkavalikosta \"Paper Path Test\".\n\nJos nämä eivät auta, tulostimen paperintunnistusanturi saattaa olla viallinen ja vaatia huoltoa.",
    "HP LaserJet Pro MFP M428fdw -mallin kohdalla paperitukosvirheen ilmaantuminen ilman todellista tukosta viittaa yleensä anturiongelmaan. Tarkista ensin nämä asiat:\n\n1. Avaa etuluukku ja tarkista huolellisesti kaikki kulkureitit paperin palasten varalta\n2. Poista ja aseta värikasetti takaisin varmistaaksesi, että se on oikein paikallaan\n3. Tarkista, että takaluukun tukostenpoistoluukku on kunnolla kiinni\n4. Puhdista paperinsyöttötelat nukkaamattomalla, hieman kostealla liinalla\n\nLisäksi voit suorittaa tulostimen huoltodiagnostiikan pitämällä tulostimen käynnistyksen yhteydessä painikkeita pohjassa ja valitsemalla valikosta huoltotestin. Tämä prosessi on kuvattu tarkemmin HP:n teknisessä dokumentaatiossa.",
    "Olen tarkistanut tulostimen huolto-oppaan ja HP LaserJet Pro MFP M428fdw -mallissa on tunnettu ongelma, jossa paperin kulkureitin anturi saattaa raportoida virheellisiä paperitukoksia. Jos aiemmat toimenpiteet eivät ole auttaneet, kokeile seuraavaa huoltotoimenpidettä:\n\n1. Sammuta tulostin ja irrota virtajohto\n2. Odota 30 sekuntia\n3. Pidä 'Cancel'-painiketta pohjassa kytkiessäsi virran takaisin\n4. Kun 'Ready'-valo alkaa vilkkua, vapauta painike\n5. Tulostin käynnistyy huoltotilassa, jossa voit valita 'Sensor Test' -vaihtoehdon\n\nTämä diagnosointiprosessi auttaa tunnistamaan, onko anturi itsessään viallinen. Jos anturi osoittautuu vialliseksi, suosittelen ottamaan yhteyttä HP:n valtuutettuun huoltoon."
  ],
};

// Main demo component
const AIAssistantDemo = () => {
  const [selectedScenario, setSelectedScenario] = useState(SAMPLE_SCENARIOS[0]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [infoView, setInfoView] = useState('ticket'); // 'ticket' or 'knowledge'
  
  const conversationContainerRef = useRef(null);
  const conversationEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Improved scroll to bottom of conversation that prevents page scrolling
  useEffect(() => {
    if (conversation.length > 0 && conversationContainerRef.current && conversationEndRef.current) {
      // Use scrollIntoView on the conversation container element directly
      const container = conversationContainerRef.current;
      const scrollElement = conversationEndRef.current;
      
      // Manually scroll the container instead of using scrollIntoView
      container.scrollTop = scrollElement.offsetTop - container.offsetTop;
    }
  }, [conversation]);
  
  // Handle scenario change
  const handleScenarioChange = (scenarioId) => {
    const newScenario = SAMPLE_SCENARIOS.find(s => s.id === scenarioId);
    setSelectedScenario(newScenario);
    setConversation([]);
    setResponseIndex(0);
    setInputValue('');
  };
  
  // Reset the conversation
  const handleReset = () => {
    setRefreshing(true);
    setTimeout(() => {
      setConversation([]);
      setResponseIndex(0);
      setRefreshing(false);
    }, 1000);
  };
  
  // Copy ticket details to clipboard
  const handleCopyTicketDetails = () => {
    const details = `
Otsikko: ${selectedScenario.title}
Kuvaus: ${selectedScenario.description}
Kategoria: ${selectedScenario.category}
Laite: ${selectedScenario.device}
Prioriteetti: ${selectedScenario.priority}
    `.trim();
    
    navigator.clipboard.writeText(details);
    // Would show toast notification in real implementation
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    if (!inputValue.trim() || isTyping) return;
    
    // Add user message
    const userMessage = {
      id: conversation.length + 1,
      sender: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute: '2-digit'})
    };
    
    setConversation(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Keep focus on input but prevent auto-scroll of page
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 0);
    }
    
    // Simulate AI typing and response delay
    setTimeout(() => {
      const assistantResponse = {
        id: conversation.length + 2,
        sender: 'assistant',
        content: ASSISTANT_RESPONSES[selectedScenario.id][
          Math.min(responseIndex, ASSISTANT_RESPONSES[selectedScenario.id].length - 1)
        ],
        timestamp: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute: '2-digit'})
      };
      
      setConversation(prev => [...prev, assistantResponse]);
      setIsTyping(false);
      setResponseIndex(prev => prev + 1);
      
      // Scroll the chat container only, not the page
      if (conversationContainerRef.current && conversationEndRef.current) {
        setTimeout(() => {
          const container = conversationContainerRef.current;
          const scrollElement = conversationEndRef.current;
          container.scrollTop = scrollElement.offsetTop - container.offsetTop;
        }, 100);
      }
    }, 2000 + Math.random() * 1000); // Random delay between 2-3 seconds
  };
  
  // Handle input keypress
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default newline behavior
      e.stopPropagation(); // Prevent event bubbling
      handleSendMessage();
    }
  };
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6 relative">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-500" />
          AI-avustaja Interaktiivinen Demo
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleReset();
            }}
            disabled={conversation.length === 0 || isTyping}
            className={`
              p-1.5 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 
              ${(conversation.length === 0 || isTyping) ? 'opacity-50 cursor-not-allowed' : ''}
              transition-colors duration-200
            `}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsConfigOpen(!isConfigOpen);
            }}
            className="p-1.5 rounded-full text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors duration-200"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Configuration panel */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-gray-200 bg-gray-50 overflow-hidden"
          >
            <div className="px-6 py-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Valitse skenaario</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {SAMPLE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleScenarioChange(scenario.id);
                    }}
                    className={`
                      p-3 rounded-lg border text-left 
                      transition-all duration-200 flex flex-col
                      ${selectedScenario.id === scenario.id 
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-200' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium truncate max-w-[80%]">{scenario.title}</span>
                      {selectedScenario.id === scenario.id && (
                        <Check className="h-4 w-4 text-indigo-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{scenario.category}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 h-[650px]">
        {/* Left panel: Ticket info and knowledge base */}
        <div className="border-r border-gray-200 overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 px-4 py-2 bg-gray-50 flex">
            <button 
              onClick={() => setInfoView('ticket')}
              className={`
                flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-1.5
                ${infoView === 'ticket' 
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200' 
                  : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              <FileBox className="h-4 w-4" />
              <span>Tiketin tiedot</span>
            </button>
            <button 
              onClick={() => setInfoView('knowledge')}
              className={`
                flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-1.5
                ${infoView === 'knowledge' 
                  ? 'bg-white text-indigo-700 shadow-sm border border-gray-200' 
                  : 'text-gray-600 hover:bg-gray-100'}
              `}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Tietopankki</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5">
            {infoView === 'ticket' ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-sm font-medium text-gray-700">Otsikko</h3>
                    <button 
                      onClick={handleCopyTicketDetails}
                      className="text-gray-400 hover:text-indigo-600 p-1 rounded-full hover:bg-gray-50"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-800">{selectedScenario.title}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Kuvaus</h3>
                  <p className="text-sm text-gray-800">{selectedScenario.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Kategoria</h3>
                    <p className="text-sm text-gray-800">{selectedScenario.category}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Prioriteetti</h3>
                    <span className={`
                      inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${selectedScenario.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}
                    `}>
                      {selectedScenario.priority === 'HIGH' ? 'Korkea' : 'Normaali'}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Laite</h3>
                  <p className="text-sm text-gray-800">{selectedScenario.device}</p>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                    <span>Aiempi keskustelu</span>
                    <span className="text-gray-400 text-xs">0 viestiä</span>
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 flex items-center justify-center h-20">
                    <p className="text-sm text-gray-500 text-center">Ei aiempaa keskustelua</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 flex items-center justify-between">
                  <span>Aiheeseen liittyvät artikkelit</span>
                  <span className="text-gray-400 text-xs">{selectedScenario.knowledgeArticles.length} artikkelia</span>
                </h3>
                
                <div className="space-y-2">
                  {selectedScenario.knowledgeArticles.map((article, index) => (
                    <div 
                      key={index}
                      className="bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-md p-3 cursor-pointer transition-colors duration-150"
                    >
                      <h4 className="text-sm font-medium text-gray-800 hover:text-indigo-700 mb-1">{article}</h4>
                      <p className="text-xs text-gray-500">Artikkeli #{1000 + index}</p>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">AI-avustajan tietopohja</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Avustaja hyödyntää tietopankin artikkeleita ja ohjeita vastauksissaan. Se analysoi tiketin kontekstin 
                      ja poimii relevanteimmat tiedot antaakseen asianmukaisia vastauksia. Tämä simulaatio näyttää, miten
                      avustaja yhdistää kontekstuaalista tietoa vastauksiin.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right panel: Chat interface */}
        <div className="col-span-1 lg:col-span-2 flex flex-col bg-gray-50">
          {/* Chat header */}
          <div className="border-b border-gray-200 px-6 py-3 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-800">AI-avustaja</h3>
                <p className="text-xs text-gray-500">Simuloi keskustelua ja testaa ominaisuuksia</p>
              </div>
            </div>
          </div>
          
          {/* Chat messages */}
          <div 
            ref={conversationContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(220, 220, 220, 0.3) 1px, transparent 0)', backgroundSize: '20px 20px' }}
          >
            {/* Welcome message */}
            {conversation.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center shadow-md mb-4">
                  <Bot className="h-8 w-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Hei, olen tukiavustaja</h3>
                <p className="text-sm text-gray-600 mb-4 max-w-md">
                  Kysy minulta tietoja tästä tiketistä tai pyydä apua ratkaisuun.
                  Tämä on interaktiivinen demo, joka simuloi avustajan toimintaa.
                </p>
                <div className="w-full max-w-sm grid grid-cols-1 gap-2 mt-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setInputValue("Mitä ongelman aiheuttajia kannattaisi tutkia ensimmäisenä?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-left px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-sm transition-colors duration-150 flex items-center"
                  >
                    <ArrowRight className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
                    <span>Mitä ongelman aiheuttajia kannattaisi tutkia ensimmäisenä?</span>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setInputValue("Miten tämä ongelma tyypillisesti ratkaistaan?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-left px-4 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-sm transition-colors duration-150 flex items-center"
                  >
                    <ArrowRight className="h-4 w-4 text-indigo-500 mr-2 flex-shrink-0" />
                    <span>Miten tämä ongelma tyypillisesti ratkaistaan?</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Conversation */}
            {conversation.map((message) => (
              <div 
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`
                    rounded-2xl p-4 max-w-[85%] shadow-sm flex flex-col 
                    ${message.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none'}
                  `}
                >
                  <div 
                    className={`text-sm ${message.sender === 'user' ? 'text-white/90' : 'text-gray-800'}`}
                    dangerouslySetInnerHTML={{ 
                      __html: message.content
                        .replace(/\n/g, '<br />')
                        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                    }}
                  ></div>
                  <div className={`
                    text-[10px] mt-1 self-end 
                    ${message.sender === 'user' ? 'text-white/60' : 'text-gray-400'}
                  `}>
                    {message.timestamp}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl p-4 rounded-tl-none shadow-sm inline-flex items-center">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* This div is used as a marker for scrolling */}
            <div ref={conversationEndRef} />
          </div>
          
          {/* Chat input */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onClick={(e) => e.stopPropagation()} // Prevent click propagation
                  placeholder="Kirjoita kysymys tai pyyntö avustajalle..."
                  className="w-full rounded-xl border border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-3 px-4 pr-10 text-sm resize-none shadow-sm"
                  rows={1}
                  style={{ minHeight: '46px', maxHeight: '120px' }}
                  disabled={isTyping}
                />
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSendMessage();
                }}
                disabled={!inputValue.trim() || isTyping}
                className={`
                  rounded-xl p-3 text-white shadow-sm flex items-center justify-center
                  ${!inputValue.trim() || isTyping 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700'}
                  transition-colors duration-200
                `}
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 px-2">
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <span>AI-avustaja demo •</span>
                <span>Vastaukset perustuvat tämän tiketin simuloituun kontekstiin</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantDemo; 