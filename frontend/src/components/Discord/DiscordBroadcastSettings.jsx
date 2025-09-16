import { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import axios from 'axios';
import { 
  Save, 
  Megaphone,
  Info,
  Loader2,
  Search,
  CheckCircle,
  XCircle,
  RefreshCw,
  Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DiscordBroadcastSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [availableChannels, setAvailableChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validatingChannel, setValidatingChannel] = useState(false);
  const [channelValid, setChannelValid] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);

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
      
      // If there's a broadcast channel configured, validate it
      if (data.broadcastChannelId) {
        validateChannel(data.broadcastChannelId);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Virhe haettaessa asetuksia');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableChannels = async () => {
    try {
      setLoadingChannels(true);
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/discord/available-channels`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAvailableChannels(response.data.data.channels || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      if (error.response?.status === 503) {
        toast.error('Discord-botti ei ole käynnissä');
      } else {
        toast.error('Virhe haettaessa kanavia');
      }
      setAvailableChannels([]);
    } finally {
      setLoadingChannels(false);
    }
  };

  const validateChannel = async (channelId) => {
    if (!channelId) {
      setChannelValid(null);
      setSelectedChannel(null);
      return;
    }

    try {
      setValidatingChannel(true);
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/discord/validate-channel`,
        { channelId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.data.valid) {
        setChannelValid(true);
        setSelectedChannel(response.data.data.channel);
      } else {
        setChannelValid(false);
        setSelectedChannel(null);
      }
    } catch (error) {
      console.error('Error validating channel:', error);
      setChannelValid(false);
      setSelectedChannel(null);
      if (error.response?.status === 503) {
        toast.error('Discord-botti ei ole käynnissä');
      }
    } finally {
      setValidatingChannel(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await authService.acquireToken();
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/discord/settings`,
        {
          broadcastChannelId: settings.broadcastChannelId || null,
          enableBroadcast: settings.enableBroadcast
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setOriginalSettings(response.data.data.settings);
      toast.success('Broadcast-asetukset tallennettu');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Asetusten tallennus epäonnistui');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // If channel ID changed, validate it
    if (key === 'broadcastChannelId') {
      validateChannel(value);
    }
  };

  const handleChannelSelect = (channel) => {
    handleSettingChange('broadcastChannelId', channel.id);
    setSearchTerm('');
    setAvailableChannels([]);
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const filteredChannels = availableChannels.filter(channel => 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.guild.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.id.includes(searchTerm)
  );

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
          <Megaphone className="text-purple-500" size={24} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Broadcast-asetukset</h2>
            <p className="text-sm text-gray-600">Määritä kanava uusien tikettien ilmoituksille</p>
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

      {/* Enable Broadcast Toggle */}
      <div className="p-4 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Ota broadcast käyttöön
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Lähetä ilmoitus Discord-kanavalle kun uusi tiketti luodaan
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableBroadcast || false}
              onChange={(e) => handleSettingChange('enableBroadcast', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Channel Selection */}
      {settings.enableBroadcast && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Hash className="text-purple-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">Broadcast-kanava</h3>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg space-y-4">
            {/* Current Channel Status */}
            {settings.broadcastChannelId && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {validatingChannel ? (
                    <Loader2 className="animate-spin h-5 w-5 text-gray-400" />
                  ) : channelValid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedChannel ? (
                        <>#{selectedChannel.name} ({selectedChannel.guild})</>
                      ) : (
                        settings.broadcastChannelId
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {validatingChannel ? 'Tarkistetaan...' :
                       channelValid ? 'Kanava on käytettävissä' : 
                       'Kanava ei ole käytettävissä'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => validateChannel(settings.broadcastChannelId)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Tarkista uudelleen"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            )}

            {/* Channel ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kanavan ID
              </label>
              <input
                type="text"
                value={settings.broadcastChannelId || ''}
                onChange={(e) => handleSettingChange('broadcastChannelId', e.target.value)}
                placeholder="Esim. 1234567890123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Syötä Discord-kanavan ID tai valitse kanava alla olevasta listasta
              </p>
            </div>

            {/* Channel Browser */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Tai valitse kanava listasta
                </label>
                <button
                  onClick={fetchAvailableChannels}
                  disabled={loadingChannels}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  {loadingChannels ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Hae kanavat
                </button>
              </div>

              {availableChannels.length > 0 && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Etsi kanavia..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredChannels.length > 0 ? (
                      filteredChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => handleChannelSelect(channel)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                #{channel.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {channel.guild} • {channel.category}
                              </p>
                            </div>
                            {channel.id === settings.broadcastChannelId && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Ei kanavia hakusanalla "{searchTerm}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex gap-3">
          <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div className="space-y-2 text-sm text-blue-800">
            <p className="font-medium">Broadcast-toiminto:</p>
            <ul className="ml-4 list-disc space-y-1 text-xs">
              <li>Lähettää ilmoituksen valitulle Discord-kanavalle kun uusi tiketti luodaan</li>
              <li>Näyttää tiketin perustiedot: otsikko, kuvaus, luoja, kategoria ja prioriteetti</li>
              <li>Tukihenkilöt voivat seurata uusia tikettejä reaaliajassa</li>
              <li>Toimii sekä web- että Discord-kautta luoduille tiketeille</li>
              <li>Varmista että botilla on oikeudet lähettää viestejä valitulle kanavalle</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
