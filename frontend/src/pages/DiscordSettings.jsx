import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { authService } from '../services/authService';
import axios from 'axios';
import { 
  Users, 
  Settings, 
  Radio, 
  BarChart3,
  MessageSquare,
  Archive,
  Activity,
  Clock,
  Ticket,
  Megaphone
} from 'lucide-react';
import DiscordUsersList from '../components/Discord/DiscordUsersList';
import DiscordBotConfig from '../components/Discord/DiscordBotConfig';
import DiscordChannelSettings from '../components/Discord/DiscordChannelSettings';
import DiscordStatistics from '../components/Discord/DiscordStatistics';
import DiscordBroadcastSettings from '../components/Discord/DiscordBroadcastSettings';

export default function DiscordSettings() {
  const { userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isConfigured, setIsConfigured] = useState(null);
  const [configDetails, setConfigDetails] = useState(null);

  useEffect(() => {
    checkConfiguration();
    fetchStatistics();
  }, []);

  const checkConfiguration = async () => {
    try {
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/discord/config-status`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setIsConfigured(response.data.data.isConfigured);
      setConfigDetails(response.data.data.details);
    } catch (error) {
      console.error('Error checking Discord configuration:', error);
      setIsConfigured(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = await authService.acquireToken();
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/discord/statistics`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setStatistics(response.data.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Only admins can access this page
  if (userRole !== 'ADMIN') {
    return (
      <div className="container mx-auto p-4">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-red-800">Vain järjestelmänvalvojat voivat käyttää tätä sivua.</p>
        </div>
      </div>
    );
  }

  // Check if Discord bot is configured
  if (isConfigured === false) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <MessageSquare className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Discord-botti ei ole konfiguroitu</h2>
            <p className="text-gray-600 mb-6">
              Discord-integraation käyttäminen vaatii botin konfiguroinnin. Lisää seuraavat ympäristömuuttujat:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${configDetails?.hasToken ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <code className="text-sm">DISCORD_BOT_TOKEN</code>
                </div>
                <div className="flex items-center">
                  <span className={`inline-block w-3 h-3 rounded-full mr-2 ${configDetails?.hasClientId ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <code className="text-sm">DISCORD_CLIENT_ID</code>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => window.history.back()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Takaisin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while checking configuration
  if (isConfigured === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Tarkistetaan Discord-konfiguraatiota...</p>
        </div>
      </div>
    );
  }

  // Tabs configuration
  const tabs = [
    { 
      id: 'users', 
      label: 'Discord-käyttäjät', 
      icon: <Users size={16} className="text-blue-500" />,
      description: 'Hallitse Discordista tulleita käyttäjiä ja heidän tikettejään'
    },
    { 
      id: 'bot', 
      label: 'Botin asetukset', 
      icon: <Radio size={16} className="text-purple-500" />,
      description: 'Määritä Discord-botin toiminta ja tilan näyttö'
    },
    { 
      id: 'channels', 
      label: 'Kanavien hallinta', 
      icon: <Archive size={16} className="text-orange-500" />,
      description: 'Määritä Discord-kanavien automaattinen siivous ja elinkaari'
    },
    { 
      id: 'broadcast', 
      label: 'Broadcast', 
      icon: <Megaphone size={16} className="text-purple-500" />,
      description: 'Määritä uusien tikettien ilmoituskanava tukihenkilöille'
    },
    { 
      id: 'statistics', 
      label: 'Tilastot', 
      icon: <BarChart3 size={16} className="text-green-500" />,
      description: 'Tarkastele Discord-integraation käyttötilastoja'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative">
      {/* Hero section with gradient background */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center">
                <MessageSquare className="mr-3" size={28} />
                <h1 className="text-3xl font-bold">Discord-integraatio</h1>
              </div>
              <p className="mt-2 text-indigo-100 max-w-2xl">
                Hallitse Discord-botin asetuksia ja seuraa tikettien käsittelyä Discord-kanavissa
              </p>
            </div>
          </div>
          
          {/* Metrics display */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-5 py-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users size={16} className="text-blue-300" />
                <p className="text-xs font-medium text-indigo-100">Discord-käyttäjät</p>
              </div>
              <p className="text-2xl font-bold">{statistics?.totalUsers || 0}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-5 py-4">
              <div className="flex items-center space-x-2 mb-2">
                <Ticket size={16} className="text-purple-300" />
                <p className="text-xs font-medium text-indigo-100">Discord-tiketit</p>
              </div>
              <p className="text-2xl font-bold">{statistics?.totalTickets || 0}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-5 py-4">
              <div className="flex items-center space-x-2 mb-2">
                <Radio size={16} className="text-green-300" />
                <p className="text-xs font-medium text-indigo-100">Aktiiviset kanavat</p>
              </div>
              <p className="text-2xl font-bold">{statistics?.activeChannels || 0}</p>
            </div>
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-5 py-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock size={16} className="text-orange-300" />
                <p className="text-xs font-medium text-indigo-100">Keskim. vasteaika</p>
              </div>
              <p className="text-2xl font-bold">{statistics?.avgResponseTimeHours || 0}h</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab navigation */}
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-4 text-sm font-medium border-b-2 flex items-center
                  ${activeTab === tab.id 
                    ? 'border-indigo-500 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  cursor-pointer
                `}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* Tab description bar */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {tabs.find(tab => tab.id === activeTab)?.description}
            </p>
          </div>
          
          {/* Tab content */}
          <div className="p-6">
            {activeTab === 'users' && <DiscordUsersList />}
            {activeTab === 'bot' && <DiscordBotConfig />}
            {activeTab === 'channels' && <DiscordChannelSettings />}
            {activeTab === 'broadcast' && <DiscordBroadcastSettings />}
            {activeTab === 'statistics' && <DiscordStatistics />}
          </div>
        </div>
        
        {/* Info section */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 bg-indigo-50 p-3 rounded-lg">
              <MessageSquare className="text-indigo-500" size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Tietoa Discord-integraatiosta</h3>
              <div className="mt-2 text-sm text-gray-600 space-y-3">
                <p>
                  Discord-integraatio mahdollistaa tikettien luomisen ja hallinnan suoraan Discord-palvelimelta. 
                  Käyttäjät voivat luoda tikettejä ilman erillistä kirjautumista, ja tukihenkilöt voivat 
                  vastata tiketteihin web-sovelluksesta.
                </p>
                <p>
                  <strong>Automaattinen siivous:</strong> Discord-kanavat poistetaan automaattisesti määritetyn 
                  ajan kuluttua tiketin sulkemisesta tai passiivisuuden jälkeen. Tämä pitää Discord-palvelimen 
                  siistinä ja helpottaa aktiivisten tikettien seurantaa.
                </p>
                <p className="italic">
                  Huomaa: Discord-bot vaatii asianmukaiset oikeudet palvelimella toimiakseen. 
                  Varmista, että botilla on oikeus luoda ja hallita kanavia sekä lähettää viestejä.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}