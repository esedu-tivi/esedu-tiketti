import { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import axios from 'axios';
import { 
  Save, 
  RefreshCw, 
  Radio,
  Activity,
  Timer,
  BarChart,
  Info,
  Loader2,
  Settings,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DiscordBotConfig() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/discord/settings`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = response.data.data.settings;
      setSettings(data);
      setOriginalSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Virhe haettaessa asetuksia');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await authService.acquireToken();
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/discord/settings`,
        settings,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setOriginalSettings(response.data.data.settings);
      toast.success('Asetukset tallennettu');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Asetusten tallennus epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/discord/settings/reset`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = response.data.data.settings;
      setSettings(data);
      setOriginalSettings(data);
      toast.success('Asetukset palautettu oletuksiin');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Asetusten palautus epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="text-purple-500" size={24} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Discord-botin asetukset</h2>
            <p className="text-sm text-gray-600">Määritä botin toiminta ja tilan näyttö</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className="mr-2" />
            Palauta oletukset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Tallenna
          </button>
        </div>
      </div>

      {/* Integration Enable/Disable */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Discord-integraatio käytössä
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Ota käyttöön tai poista käytöstä koko Discord-integraatio
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableIntegration}
              onChange={(e) => handleSettingChange('enableIntegration', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Bot Status Display Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Activity className="text-blue-500" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Botin tilan näyttö</h3>
        </div>

        {/* Show Ticket Stats */}
        <div className="p-3 border border-gray-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart size={16} className="text-gray-500" />
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Näytä tikettitilastot
                </label>
                <p className="text-xs text-gray-500">
                  Avoimet, käsittelyssä, yhteensä
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showTicketStats}
                onChange={(e) => handleSettingChange('showTicketStats', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Show Cleanup Timer */}
        <div className="p-3 border border-gray-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-gray-500" />
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Näytä siivousajastin
                </label>
                <p className="text-xs text-gray-500">
                  Seuraavan siivouksen aika
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.showCleanupTimer}
                onChange={(e) => handleSettingChange('showCleanupTimer', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Status Rotation Speed */}
        <div className="p-3 border border-gray-100 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-gray-500" />
            <label className="text-sm font-medium text-gray-700">
              Tilan vaihtonopeus
            </label>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5000"
              max="60000"
              step="1000"
              value={settings.statusRotationMs}
              onChange={(e) => handleSettingChange('statusRotationMs', parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="w-20 text-sm font-medium text-gray-700">
              {(settings.statusRotationMs / 1000).toFixed(0)}s
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Kuinka usein botin tila vaihtuu (5-60 sekuntia)
          </p>
        </div>
      </div>

      {/* User Permissions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Settings className="text-gray-500" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Käyttäjäoikeudet</h3>
        </div>

        <div className="p-3 border border-gray-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Salli käyttäjien sulkea tikettejä
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Näytä "Sulje tiketti" -nappi Discord-kanavassa
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allowUserClose}
                onChange={(e) => handleSettingChange('allowUserClose', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
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
          <div className="p-4 border-t space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Oletuskategoria Discord-tiketeille
              </label>
              <input
                type="text"
                value={settings.defaultCategoryName}
                onChange={(e) => handleSettingChange('defaultCategoryName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Discord"
              />
              <p className="text-xs text-gray-500 mt-1">
                Kategoria, johon Discord-tiketit luodaan automaattisesti
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">Huomaa:</p>
            <p>
              Muutokset tulevat voimaan heti tallennuksen jälkeen. 
              Discord-botti päivittää tilansa automaattisesti seuraavan päivityssyklin yhteydessä.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}