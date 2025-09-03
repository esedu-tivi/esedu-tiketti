import { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import axios from 'axios';
import { 
  Save, 
  Clock,
  Trash2,
  Archive,
  Info,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DiscordChannelSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);

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
        {
          cleanupTTLHours: settings.cleanupTTLHours,
          inactiveTTLHours: settings.inactiveTTLHours
        },
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
          <Archive className="text-orange-500" size={24} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Kanavien hallinta</h2>
            <p className="text-sm text-gray-600">Määritä Discord-kanavien automaattinen siivous</p>
          </div>
        </div>
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

      {/* Cleanup After Close */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Trash2 className="text-red-500" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Suljettujen tikettien siivous</h3>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Poista kanava sulkemisen jälkeen
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="168"
              step="1"
              value={settings.cleanupTTLHours}
              onChange={(e) => handleSettingChange('cleanupTTLHours', parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="w-24 text-right">
              <span className="text-lg font-medium text-gray-900">
                {settings.cleanupTTLHours}
              </span>
              <span className="ml-1 text-sm text-gray-500">
                {settings.cleanupTTLHours === 1 ? 'tunti' : 'tuntia'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Discord-kanava poistetaan automaattisesti kun tiketti on ollut suljettuna tämän ajan (1-168 tuntia)
          </p>

          {/* Visual representation */}
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  {settings.cleanupTTLHours < 24 
                    ? `${settings.cleanupTTLHours} ${settings.cleanupTTLHours === 1 ? 'tunti' : 'tuntia'}`
                    : `${Math.floor(settings.cleanupTTLHours / 24)} ${Math.floor(settings.cleanupTTLHours / 24) === 1 ? 'päivä' : 'päivää'}`
                  }
                </p>
                <p className="text-xs text-red-700">
                  Kanava poistetaan tiketin sulkemisen jälkeen
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cleanup Inactive */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <Archive className="text-yellow-500" size={20} />
          <h3 className="text-lg font-semibold text-gray-800">Passiivisten tikettien siivous</h3>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Poista passiiviset kanavat
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="336"
              step="1"
              value={settings.inactiveTTLHours}
              onChange={(e) => handleSettingChange('inactiveTTLHours', parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="w-24 text-right">
              <span className="text-lg font-medium text-gray-900">
                {settings.inactiveTTLHours}
              </span>
              <span className="ml-1 text-sm text-gray-500">
                {settings.inactiveTTLHours === 1 ? 'tunti' : 'tuntia'}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Discord-kanava poistetaan jos tiketti on ollut avoimena ilman aktiviteettia tämän ajan (1-336 tuntia)
          </p>

          {/* Visual representation */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  {settings.inactiveTTLHours < 24 
                    ? `${settings.inactiveTTLHours} ${settings.inactiveTTLHours === 1 ? 'tunti' : 'tuntia'}`
                    : `${Math.floor(settings.inactiveTTLHours / 24)} ${Math.floor(settings.inactiveTTLHours / 24) === 1 ? 'päivä' : 'päivää'}`
                  }
                </p>
                <p className="text-xs text-yellow-700">
                  Passiivinen kanava poistetaan ilman toimintaa
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="space-y-2 text-sm text-blue-800">
            <p className="font-medium">Automaattinen siivous:</p>
            <ul className="ml-4 list-disc space-y-1 text-xs">
              <li>Siivous tapahtuu kerran tunnissa</li>
              <li>Käyttäjät saavat ilmoituksen ennen kanavan poistoa</li>
              <li>Tiketti ja sen historia säilyvät web-sovelluksessa</li>
              <li>Botin tila näyttää seuraavan siivouksen ajankohdan</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}