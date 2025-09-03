import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  RotateCcw,
  AlertCircle,
  Info,
  Brain,
  Lightbulb,
  Hash,
  Loader2,
  Timer,
  ChevronDown,
  MessageSquare,
  Users,
  FileText,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useAISettings } from '../../hooks/useAISettings';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

const AISettings = () => {
  const { 
    settings: fetchedSettings, 
    isLoading, 
    updateSettings, 
    isUpdating, 
    resetSettings, 
    isResetting,
    refetch 
  } = useAISettings();
  
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState('chat-agent');
  
  // Available models (updated with latest OpenAI pricing)
  const availableModels = [
    // GPT-5 models
    { value: 'gpt-5', label: 'GPT-5', description: 'Paras koodaukseen ($1.25/$10 per 1M)' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Nopeampi GPT-5 ($0.25/$2 per 1M)' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano', description: 'Edullisin GPT-5 ($0.05/$0.40 per 1M)' },
    
    // GPT-4.1 models (current default)
    { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Edistynyt ($3/$12 per 1M)' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Tasapainoinen ($0.80/$3.20 per 1M)' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Kevyt ($0.20/$0.80 per 1M)' },
    
    // O4 models
    { value: 'o4-mini', label: 'O4 Mini', description: 'Vahvistettu ($4/$16 per 1M)' },
    
    // Legacy models
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Vanha edullinen malli' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Vanhin edullinen malli' },
  ];

  // Calculate if there are changes by comparing with original
  const hasChanges = originalSettings && settings && 
    JSON.stringify(originalSettings) !== JSON.stringify(settings);

  // Define tabs matching AITools style
  const tabs = [
    { 
      id: 'chat-agent', 
      label: 'Chat Agent', 
      icon: <MessageSquare size={16} className="text-green-500" />,
      description: 'Käyttäjäsimulaation asetukset harjoitustiketeissä',
      disabled: false
    },
    { 
      id: 'support-assistant', 
      label: 'Support Assistant', 
      icon: <Users size={16} className="text-blue-500" />,
      description: 'Tukihenkilöiden avustajan asetukset',
      disabled: false
    },
    { 
      id: 'ticket-generator', 
      label: 'Ticket Generator', 
      icon: <Sparkles size={16} className="text-purple-500" />,
      description: 'Tikettien generoinnin asetukset',
      disabled: false
    },
    { 
      id: 'summarizer', 
      label: 'Summarizer', 
      icon: <FileText size={16} className="text-orange-500" />,
      description: 'Yhteenvetojen luonnin asetukset',
      disabled: false
    }
  ];

  // Update local state when fetched settings change
  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);
      setOriginalSettings(fetchedSettings);
    }
  }, [fetchedSettings]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    const updateData = {
      chatAgentVersion: settings.chatAgentVersion,
      chatAgentSyncWithGenerator: settings.chatAgentSyncWithGenerator || false,
      ticketGeneratorVersion: settings.ticketGeneratorVersion,
      hintSystemEnabled: settings.hintSystemEnabled,
      hintOnEarlyThreshold: settings.hintOnEarlyThreshold,
      hintOnProgressThreshold: settings.hintOnProgressThreshold,
      hintOnCloseThreshold: settings.hintOnCloseThreshold,
      hintCooldownTurns: settings.hintCooldownTurns,
      hintMaxPerConversation: settings.hintMaxPerConversation,
      // Model settings
      chatAgentModel: settings.chatAgentModel,
      supportAssistantModel: settings.supportAssistantModel,
      ticketGeneratorModel: settings.ticketGeneratorModel,
      summarizerModel: settings.summarizerModel
    };

    updateSettings(updateData, {
      onSuccess: (data) => {
        setSettings(data);
        setOriginalSettings(data);
      }
    });
  };

  const handleReset = () => {
    if (!window.confirm('Haluatko varmasti palauttaa oletusasetukset?')) {
      return;
    }

    resetSettings(undefined, {
      onSuccess: (data) => {
        setSettings(data);
        setOriginalSettings(data);
      }
    });
  };

  // Toggle component matching NotificationSettings style
  const renderToggle = (field, label, description) => {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {description}
          </p>
        </div>
        <div className="relative inline-block w-12 align-middle select-none flex-shrink-0">
          <input
            type="checkbox"
            checked={settings[field]}
            onChange={() => handleSettingChange(field, !settings[field])}
            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out"
            style={{
              transform: settings[field] ? 'translateX(100%)' : 'translateX(0)',
              borderColor: settings[field] ? '#4F46E5' : '#D1D5DB'
            }}
          />
          <div className={`toggle-label block h-6 rounded-full transition-colors duration-200 ease-in-out ${
            settings[field] ? 'bg-indigo-600' : 'bg-gray-300'
          }`}></div>
        </div>
      </div>
    );
  };

  // Render Chat Agent settings
  const renderChatAgentSettings = () => (
    <div className="space-y-6">
      {/* Chat Agent Version Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Brain className="text-indigo-600" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Chat-agentin versio</h3>
        </div>
        
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="chatAgentVersion"
              value="modern"
              checked={settings.chatAgentVersion === 'modern'}
              onChange={(e) => handleSettingChange('chatAgentVersion', e.target.value)}
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">ModernChatAgent</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Suositeltu</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Uusin versio: Yksi LLM-kutsu, strukturoitu output, emotionaaliset tilat ja vihjesysteemi
              </p>
            </div>
          </label>
          
          <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="chatAgentVersion"
              value="legacy"
              checked={settings.chatAgentVersion === 'legacy'}
              onChange={(e) => handleSettingChange('chatAgentVersion', e.target.value)}
              className="mt-1 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">ChatAgent</span>
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">Perinteinen</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Vanha versio: Kaksi LLM-kutsua, erillinen arviointi ja vastaus
              </p>
            </div>
          </label>
        </div>
      </div>
      
      {/* Chat Agent Style Sync Toggle */}
      {settings.chatAgentVersion === 'modern' && (
        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="chatAgentSyncWithGenerator"
              checked={settings.chatAgentSyncWithGenerator || false}
              onChange={(e) => handleSettingChange('chatAgentSyncWithGenerator', e.target.checked)}
              disabled={settings.ticketGeneratorVersion !== 'modern'}
              className="mt-1 text-indigo-600 focus:ring-indigo-500 rounded disabled:opacity-50"
            />
            <div className="flex-1">
              <label 
                htmlFor="chatAgentSyncWithGenerator" 
                className={`block font-medium ${settings.ticketGeneratorVersion !== 'modern' ? 'text-gray-400' : 'text-gray-900'} cursor-pointer`}
              >
                Synkronoi kirjoitustyyli ModernTicketGeneratorin kanssa
              </label>
              <p className={`text-sm mt-1 ${settings.ticketGeneratorVersion !== 'modern' ? 'text-gray-400' : 'text-gray-600'}`}>
                Käyttäjä säilyttää saman kirjoitustyylin (panic, confused, frustrated, polite, brief) ja teknisen tason koko keskustelun ajan.
              </p>
              {settings.ticketGeneratorVersion !== 'modern' && (
                <p className="text-sm text-orange-600 mt-2 flex items-center gap-1">
                  <AlertCircle size={14} />
                  Vaatii ModernTicketGenerator-version käyttöönottoa
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Chat Agent Model Selection */}
      <div className="border-t pt-6 mt-6">
        {renderModelSettings(
          'chatAgentModel',
          'Chat Agent',
          'Valitse malli, jota käytetään käyttäjäsimulaatiossa harjoitustiketeissä. Tämä malli vastaa käyttäjän roolissa tukihenkilön viesteihin.',
          <MessageSquare className="text-green-500" size={20} />
        )}
      </div>

      {/* Hint System Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Lightbulb className="text-yellow-500" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Vihjesysteemi</h3>
        </div>

        {/* Enable/Disable Toggle */}
        {renderToggle(
          'hintSystemEnabled',
          'Vihjesysteemi käytössä',
          'Ota käyttöön tai poista käytöstä automaattiset vihjeet'
        )}

        {/* Hint Thresholds */}
        {settings.hintSystemEnabled && (
          <div className="space-y-4 mt-4">
            {/* EARLY threshold */}
            <div className="p-3 border border-gray-100 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Vihjeet EARLY-tilassa
              </label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.hintOnEarlyThreshold}
                  onChange={(e) => handleSettingChange('hintOnEarlyThreshold', parseInt(e.target.value))}
                  className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
                <span className="text-sm text-gray-600">
                  peräkkäistä EARLY-arviointia ennen vihjettä
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Kun tukihenkilö on aivan alussa ja ei löydä oikeaa suuntaa
              </p>
            </div>

            {/* PROGRESSING threshold */}
            <div className="p-3 border border-gray-100 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Vihjeet PROGRESSING-tilassa
              </label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="checkbox"
                  checked={settings.hintOnProgressThreshold !== null}
                  onChange={(e) => handleSettingChange('hintOnProgressThreshold', e.target.checked ? 5 : null)}
                  className="text-indigo-600 focus:ring-indigo-500 rounded"
                />
                <span className="text-sm text-gray-600">Käytössä</span>
                {settings.hintOnProgressThreshold !== null && (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.hintOnProgressThreshold}
                      onChange={(e) => handleSettingChange('hintOnProgressThreshold', parseInt(e.target.value))}
                      className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-sm text-gray-600">
                      peräkkäistä arviointia
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Kun tukihenkilö on oikeilla jäljillä mutta ei etene
              </p>
            </div>

            {/* CLOSE threshold */}
            <div className="p-3 border border-gray-100 rounded-lg">
              <label className="text-sm font-medium text-gray-700">
                Vihjeet CLOSE-tilassa
              </label>
              <div className="flex items-center gap-4 mt-2">
                <input
                  type="checkbox"
                  checked={settings.hintOnCloseThreshold !== null}
                  onChange={(e) => handleSettingChange('hintOnCloseThreshold', e.target.checked ? 4 : null)}
                  className="text-indigo-600 focus:ring-indigo-500 rounded"
                />
                <span className="text-sm text-gray-600">Käytössä</span>
                {settings.hintOnCloseThreshold !== null && (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.hintOnCloseThreshold}
                      onChange={(e) => handleSettingChange('hintOnCloseThreshold', parseInt(e.target.value))}
                      className="w-20 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <span className="text-sm text-gray-600">
                      peräkkäistä arviointia
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Kun tukihenkilö on lähellä ratkaisua mutta tarvitsee pientä työntöä
              </p>
            </div>

            {/* Advanced Settings - Collapsible */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Lisäasetukset</span>
                </div>
                <ChevronDown 
                  size={16} 
                  className={`text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                />
              </button>
              
              {showAdvanced && (
                <div className="p-3 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer size={14} className="text-gray-500" />
                      <label className="text-sm text-gray-700">Vihjeiden väli:</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={settings.hintCooldownTurns}
                        onChange={(e) => handleSettingChange('hintCooldownTurns', parseInt(e.target.value))}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="text-sm text-gray-600">vuoroa</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-gray-500" />
                      <label className="text-sm text-gray-700">Maksimi vihjeet:</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={settings.hintMaxPerConversation}
                        onChange={(e) => handleSettingChange('hintMaxPerConversation', parseInt(e.target.value))}
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <span className="text-sm text-gray-600">/ keskustelu</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    0 vuoroa = ei cooldownia, 999 = käytännössä rajaton
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render model selection for agents
  const renderModelSettings = (modelField, agentName, description, icon) => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          {icon}
          <h3 className="text-lg font-semibold text-gray-800">{agentName} malliasetukset</h3>
        </div>
        
        <p className="text-sm text-gray-600">{description}</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valitse tekoälymalli
            </label>
            <select
              value={settings[modelField]}
              onChange={(e) => handleSettingChange(modelField, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              {availableModels.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label} - {model.description}
                </option>
              ))}
            </select>
          </div>
          
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Nykyinen malli: </span>
              <span className="text-gray-900">
                {availableModels.find(m => m.value === settings[modelField])?.label || settings[modelField]}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {availableModels.find(m => m.value === settings[modelField])?.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-20 text-gray-500">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <p>Asetusten lataaminen epäonnistui</p>
        <Button onClick={refetch} variant="outline" className="mt-4">
          Yritä uudelleen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab navigation matching AITools style */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`
                px-4 py-2 text-sm font-medium border-b-2 flex items-center mr-4
                ${activeTab === tab.id 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {tab.icon}
              <span className="ml-2">{tab.label}</span>
              {tab.disabled && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full">
                  Tulossa
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab description bar */}
      <div className="bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
        <p className="text-sm text-gray-600">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </p>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'chat-agent' && (
          <div className="space-y-6">
            {renderChatAgentSettings()}
          </div>
        )}
        {activeTab === 'support-assistant' && renderModelSettings(
          'supportAssistantModel',
          'Support Assistant',
          'Valitse malli, jota käytetään tukihenkilöiden avustamisessa. Tämä malli antaa ehdotuksia ja ohjeita tikettien ratkaisemiseen.',
          <Users className="text-blue-500" size={20} />
        )}
        {activeTab === 'ticket-generator' && (
          <>
            {/* Ticket Generator Version */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="text-purple-500" size={16} />
                Tikettien generaattorin versio
              </h3>
              
              <div className="grid grid-cols-1 gap-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="ticketGeneratorVersion"
                    value="modern"
                    checked={settings.ticketGeneratorVersion === 'modern'}
                    onChange={(e) => handleSettingChange('ticketGeneratorVersion', e.target.value)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">ModernTicketGenerator</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">Uusi</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Realistisempi käyttäjäsimulaatio: Aloittelijat kirjoittavat epämääräisesti ("netti ei toimi"), 
                      ei teknisiä termejä, vaihteleva kirjoitustyyli
                    </p>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="ticketGeneratorVersion"
                    value="legacy"
                    checked={settings.ticketGeneratorVersion === 'legacy'}
                    onChange={(e) => handleSettingChange('ticketGeneratorVersion', e.target.value)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">TicketGenerator</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">Perinteinen</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Vanha versio: Teknisesti tarkkoja tikettejä, sisältää DHCP/DNS-termejä myös aloittelijoilta
                    </p>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Model Selection */}
            <div className="border-t pt-6">
              {renderModelSettings(
                'ticketGeneratorModel',
                'Ticket Generator Model',
                'Valitse malli, jota käytetään harjoitustikettien generoinnissa.',
                <Sparkles className="text-purple-500" size={20} />
              )}
            </div>
          </>
        )}
        {activeTab === 'summarizer' && renderModelSettings(
          'summarizerModel',
          'Summarizer',
          'Valitse malli, jota käytetään keskustelujen yhteenvetojen luomisessa. Tämä malli tiivistää tikettien keskustelut ja ratkaisut.',
          <FileText className="text-orange-500" size={20} />
        )}
        
        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Huomioitavaa:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>Asetukset vaikuttavat kaikkiin uusiin AI-toimintoihin</li>
                <li>Käynnissä olevat prosessit jatkuvat vanhoilla asetuksilla</li>
                {activeTab === 'chat-agent' && <li>Vihjesysteemi toimii vain ModernChatAgent-versiossa</li>}
                <li>Mallien vaihtaminen voi vaikuttaa suorituskykyyn ja kustannuksiin</li>
                <li>GPT-4 mallit ovat kalliimpia mutta tarkempia</li>
                <li>GPT-3.5 ja GPT-4o-mini ovat nopeampia ja edullisempia</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Actions */}
      <div className="mt-8 px-6 py-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isResetting || isUpdating}
          className="flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Palauta oletukset
        </Button>
        
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle size={14} />
              Tallentamattomia muutoksia
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isUpdating || isResetting || !hasChanges}
            className="flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Tallennetaan...
              </>
            ) : (
              <>
                <Save size={16} />
                Tallenna
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AISettings;