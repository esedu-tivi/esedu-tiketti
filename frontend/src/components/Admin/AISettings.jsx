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
      disabled: true
    },
    { 
      id: 'ticket-generator', 
      label: 'Ticket Generator', 
      icon: <Sparkles size={16} className="text-purple-500" />,
      description: 'Tikettien generoinnin asetukset',
      disabled: true
    },
    { 
      id: 'summarizer', 
      label: 'Summarizer', 
      icon: <FileText size={16} className="text-orange-500" />,
      description: 'Yhteenvetojen luonnin asetukset',
      disabled: true
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
      hintSystemEnabled: settings.hintSystemEnabled,
      hintOnEarlyThreshold: settings.hintOnEarlyThreshold,
      hintOnProgressThreshold: settings.hintOnProgressThreshold,
      hintOnCloseThreshold: settings.hintOnCloseThreshold,
      hintCooldownTurns: settings.hintCooldownTurns,
      hintMaxPerConversation: settings.hintMaxPerConversation
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

  // Render placeholder for other agents
  const renderComingSoon = (agentName, description) => (
    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
      <Settings size={48} className="mb-4 opacity-30" />
      <h3 className="text-lg font-medium mb-2">{agentName} -asetukset</h3>
      <p className="text-sm text-center max-w-md">
        {description}
      </p>
      <p className="text-xs mt-4 text-gray-400">
        Tulossa pian
      </p>
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
        {activeTab === 'chat-agent' && renderChatAgentSettings()}
        {activeTab === 'support-assistant' && renderComingSoon(
          'Support Assistant',
          'Tässä voit määrittää, miten Support Assistant auttaa tukihenkilöitä tikettien ratkaisemisessa. Asetukset sisältävät mm. vastausten pituuden, käytettävän mallin ja tietolähteen valinnat.'
        )}
        {activeTab === 'ticket-generator' && renderComingSoon(
          'Ticket Generator',
          'Tässä voit säätää, miten harjoitustiketit generoidaan. Voit määrittää tikettien monimutkaisuuden, kategorioiden painotuksen ja automaattisen jakelun asetukset.'
        )}
        {activeTab === 'summarizer' && renderComingSoon(
          'Summarizer',
          'Tässä voit määrittää, miten keskustelujen yhteenvedot luodaan. Asetukset sisältävät yhteenvedon pituuden, kielen ja automaattisen generoinnin säännöt.'
        )}
        
        {/* Info Box - Only show for chat-agent */}
        {activeTab === 'chat-agent' && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Huomioitavaa:</p>
                <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                  <li>Asetukset vaikuttavat kaikkiin uusiin AI-keskusteluihin</li>
                  <li>Käynnissä olevat keskustelut jatkuvat vanhoilla asetuksilla</li>
                  <li>Vihjesysteemi toimii vain ModernChatAgent-versiossa</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Actions */}
      <div className="mt-8 px-6 py-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isResetting || isUpdating || activeTab !== 'chat-agent'}
          className="flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Palauta oletukset
        </Button>
        
        <div className="flex items-center gap-3">
          {hasChanges && activeTab === 'chat-agent' && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <AlertCircle size={14} />
              Tallentamattomia muutoksia
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isUpdating || isResetting || !hasChanges || activeTab !== 'chat-agent'}
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