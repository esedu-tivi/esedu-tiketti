import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import { 
  Sparkles, 
  Cpu, 
  Users, 
  HardDrive, 
  Loader2, 
  AlertCircle, 
  Info, 
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  Image,
  Video,
  CpuIcon,
  Code,
  Clock,
  Bot,
  FileText,
  ChevronRight,
  Terminal
} from 'lucide-react';

/**
 * AITicketGenerator - Component for admins and support staff to generate
 * realistic training tickets using AI.
 */
const AITicketGenerator = () => {
  // State for form inputs
  const [complexity, setComplexity] = useState('moderate');
  const [category, setCategory] = useState('');
  const [userProfile, setUserProfile] = useState('student');
  const [assignToId, setAssignToId] = useState('');
  const [responseFormat, setResponseFormat] = useState('auto');
  
  // State for dropdown options 
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [complexityOptions, setComplexityOptions] = useState([]);
  const [userProfileOptions, setUserProfileOptions] = useState([]);
  const [supportUsers, setSupportUsers] = useState([]);
  const [responseFormatOptions, setResponseFormatOptions] = useState(['TEKSTI', 'KUVA', 'VIDEO']);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState(null);
  const [selectedTab, setSelectedTab] = useState('generator');
  
  // Refs
  const logContainerRef = useRef(null);
  
  // Log entries
  const [logs, setLogs] = useState([]);
  const addLog = (type, message, details = null) => {
    const timestamp = new Date().toISOString();
    const newLog = { type, message, timestamp, details };
    setLogs(prevLogs => [...prevLogs, newLog]);
    
    // Auto-scroll to bottom of logs
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 50);
  };

  // Fetch configuration and options from the backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsFetching(true);
        addLog('info', 'Alustetaan generaattoria');
        
        // Get auth token
        const token = await authService.acquireToken();
        addLog('debug', 'Hankittu autentikaatio');
        
        // Make authenticated requests
        addLog('info', 'Haetaan asetuksia palvelimelta');
        const configResponse = await axios.get(`${import.meta.env.VITE_API_URL}/ai/config`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Set options from the API response
        setComplexityOptions(configResponse.data.complexityOptions || []);
        setCategoryOptions(configResponse.data.categoryOptions || []);
        setUserProfileOptions(configResponse.data.userProfileOptions || []);
        addLog('success', 'Asetukset haettu onnistuneesti', {
          categories: configResponse.data.categoryOptions?.length || 0,
          complexityLevels: configResponse.data.complexityOptions?.length || 0
        });
        
        // Set default values if available
        if (configResponse.data.categoryOptions?.length > 0) {
          setCategory(configResponse.data.categoryOptions[0].id);
        }
        
        // Fetch support users for assignment
        addLog('info', 'Haetaan tukihenkilöiden tietoja');
        const usersResponse = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Handle the data structure - the users array might be directly in data instead of data.users
        const usersArray = Array.isArray(usersResponse.data) 
          ? usersResponse.data
          : (usersResponse.data.users || []);
          
        const supportUsersList = usersArray.filter(
          user => user.role === 'SUPPORT' || user.role === 'ADMIN'
        );
        setSupportUsers(supportUsersList);
        addLog('success', `Löydettiin ${supportUsersList.length} tukihenkilöä`);
        
        setIsFetching(false);
        addLog('info', 'Generaattori valmiina tikettien luontiin');
      } catch (error) {
        console.error('Error fetching config:', error);
        toast.error('Virhe haettaessa asetuksia');
        addLog('error', 'Virhe asetuksien haussa', {
          message: error.message,
          status: error.response?.status
        });
        setIsFetching(false);
      }
    };
    
    fetchConfig();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!complexity || !category || !userProfile) {
      toast.error('Täytä kaikki pakolliset kentät');
      addLog('error', 'Pakolliset kentät puuttuvat');
      return;
    }
    
    try {
      setIsLoading(true);
      setGeneratedTicket(null);
      
      // Get auth token
      const token = await authService.acquireToken();
      
      // Build request payload
      const payload = {
        complexity,
        category,
        userProfile,
        assignToId: assignToId || undefined
      };
      
      // Add response format if specified (not auto)
      if (responseFormat !== 'auto') {
        payload.responseFormat = responseFormat;
      }
      
      addLog('info', 'Aloitetaan tiketin generointi', payload);
      addLog('debug', 'Lähetetään pyyntö tekoälylle');
      
      const startTime = performance.now();
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai/generate-ticket`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const endTime = performance.now();
      const generationTime = ((endTime - startTime) / 1000).toFixed(2); // In seconds
      
      // Set the generated ticket for display
      setGeneratedTicket(response.data.ticket);
      
      // Add detailed logs
      addLog('success', `Tiketti luotu onnistuneesti (${generationTime}s)`, {
        ticketId: response.data.ticket.id,
        generationTime: `${generationTime} sekuntia`,
        title: response.data.ticket.title,
        priority: response.data.ticket.priority,
        responseFormat: response.data.ticket.responseFormat
      });
      
      addLog('debug', 'LLM vastaus käsitelty ja tallennettu tietokantaan');
      
      toast.success('Harjoitustiketti luotu onnistuneesti!', {
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      // Reset assignment field
      setAssignToId('');
      
    } catch (error) {
      console.error('Error generating ticket:', error);
      
      // Add detailed error logs
      addLog('error', 'Virhe tiketin luonnissa', {
        message: error.message,
        details: error.response?.data?.details || 'Tuntematon virhe',
        status: error.response?.status
      });
      
      toast.error('Virhe tiketin luonnissa: ' + (error.response?.data?.details || error.message), {
        icon: <AlertCircle className="text-red-500" />
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get complexity display text
  const getComplexityLabel = (value) => {
    switch(value) {
      case 'simple': return 'Helppo';
      case 'moderate': return 'Keskitaso';
      case 'complex': return 'Haastava';
      default: return value;
    }
  };

  // Get user profile display text
  const getUserProfileLabel = (value) => {
    switch(value) {
      case 'student': return 'Opiskelija';
      case 'teacher': return 'Opettaja';
      case 'staff': return 'Henkilökunta';
      case 'administrator': return 'Järjestelmänvalvoja';
      default: return value;
    }
  };
  
  // Get response format display text and icon
  const getResponseFormatContent = (value) => {
    switch(value) {
      case 'TEKSTI':
        return { 
          label: 'Tekstivastaus', 
          icon: <MessageSquare size={16} className="text-blue-500" />,
          description: 'Tikettiin vastataan kirjallisesti'
        };
      case 'KUVA':
        return { 
          label: 'Kuvavastaus', 
          icon: <Image size={16} className="text-green-500" />,
          description: 'Tikettiin vastataan kuvan kanssa'
        };
      case 'VIDEO':
        return { 
          label: 'Videovastaus', 
          icon: <Video size={16} className="text-red-500" />,
          description: 'Tikettiin vastataan videon kanssa'
        };
      case 'auto':
        return { 
          label: 'Automaattinen', 
          icon: <Bot size={16} className="text-purple-500" />,
          description: 'Tekoäly valitsee sopivan vastausmuodon'
        };
      default:
        return { 
          label: value, 
          icon: <MessageSquare size={16} className="text-gray-500" />,
          description: ''
        };
    }
  };
  
  // Get log type formatting
  const getLogTypeFormatting = (type) => {
    switch(type) {
      case 'success':
        return { 
          className: 'text-green-500', 
          icon: <CheckCircle2 size={14} className="text-green-500 mr-1.5" />,
          badge: 'bg-green-100 text-green-800'
        };
      case 'error':
        return { 
          className: 'text-red-500', 
          icon: <AlertCircle size={14} className="text-red-500 mr-1.5" />,
          badge: 'bg-red-100 text-red-800'
        };
      case 'info':
        return { 
          className: 'text-blue-500', 
          icon: <Info size={14} className="text-blue-500 mr-1.5" />,
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'debug':
        return { 
          className: 'text-gray-500', 
          icon: <Code size={14} className="text-gray-500 mr-1.5" />,
          badge: 'bg-gray-100 text-gray-800'
        };
      default:
        return { 
          className: 'text-gray-700', 
          icon: <Terminal size={14} className="text-gray-700 mr-1.5" />,
          badge: 'bg-gray-100 text-gray-800'
        };
    }
  };

  // Loading skeleton when fetching data
  if (isFetching) {
    return (
      <div className="bg-white rounded-lg p-6 animate-pulse">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  // Render the generator UI
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column - Generation form */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* Form header */}
          <div className="bg-indigo-50 px-5 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Sparkles className="text-indigo-500 mr-3" size={20} />
              <h3 className="text-lg font-medium text-gray-800">Tiketin parametrit</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Määritä harjoitustiketin ominaisuudet
            </p>
          </div>
          
          {/* Form content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="space-y-4">
              {/* Complexity selection */}
              <div>
                <label htmlFor="complexity" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Cpu size={14} className="inline mr-1 text-gray-400" />
                  Tiketin vaikeustaso
                </label>
                <div className="relative">
                  <select
                    id="complexity"
                    value={complexity}
                    onChange={(e) => setComplexity(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                    required
                  >
                    {complexityOptions.map((option) => (
                      <option key={option} value={option}>
                        {getComplexityLabel(option)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {complexity === 'simple' && 'Yksinkertaisia IT-ongelmia, sopivia aloittelijoille'}
                  {complexity === 'moderate' && 'Keskitason IT-ongelmia, soveltuvat keskitason opiskelijoille'}
                  {complexity === 'complex' && 'Haastavia IT-ongelmia, soveltuvat edistyneille opiskelijoille'}
                </p>
              </div>
              
              {/* Category selection */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <HardDrive size={14} className="inline mr-1 text-gray-400" />
                  Kategoria
                </label>
                <div className="relative">
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                    required
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* User profile selection */}
              <div>
                <label htmlFor="userProfile" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Users size={14} className="inline mr-1 text-gray-400" />
                  Käyttäjäprofiili
                </label>
                <div className="relative">
                  <select
                    id="userProfile"
                    value={userProfile}
                    onChange={(e) => setUserProfile(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                    required
                  >
                    {userProfileOptions.map((profile) => (
                      <option key={profile} value={profile}>
                        {getUserProfileLabel(profile)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Response format selection */}
              <div>
                <label htmlFor="responseFormat" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MessageSquare size={14} className="inline mr-1 text-gray-400" />
                  Vastausmuoto
                </label>
                <div className="relative">
                  <select
                    id="responseFormat"
                    value={responseFormat}
                    onChange={(e) => setResponseFormat(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                  >
                    <option value="auto">Automaattinen (AI valitsee)</option>
                    {responseFormatOptions.map((format) => (
                      <option key={format} value={format}>
                        {getResponseFormatContent(format).label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500 flex items-center">
                  {getResponseFormatContent(responseFormat).icon}
                  <span className="ml-1">{getResponseFormatContent(responseFormat).description}</span>
                </p>
              </div>
              
              {/* Advanced options toggle */}
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center pt-2"
              >
                <ChevronDown 
                  size={16} 
                  className={`mr-1 transition-transform duration-200 ${showAdvancedOptions ? 'rotate-180' : ''}`} 
                />
                Lisäasetukset
              </button>
              
              {/* Advanced options */}
              {showAdvancedOptions && (
                <div className="pt-2 pb-1 border-t border-gray-100">
                  <div className="mt-3">
                    <label htmlFor="assignToId" className="block text-sm font-medium text-gray-700 mb-1">
                      Osoita tukihenkilölle (valinnainen)
                    </label>
                    <div className="relative">
                      <select
                        id="assignToId"
                        value={assignToId}
                        onChange={(e) => setAssignToId(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                                shadow-sm appearance-none bg-white"
                      >
                        <option value="">Ei osoiteta kenellekään</option>
                        {supportUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.role === 'ADMIN' ? 'Admin' : 'Tukihenkilö'})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <ChevronDown size={16} className="text-gray-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Submit button with loading state */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex items-center justify-center py-2.5 px-4 rounded-lg shadow-sm text-white 
                         font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 
                         ${isLoading 
                           ? 'bg-indigo-400 cursor-not-allowed' 
                           : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Luodaan...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" size={18} />
                    Luo harjoitustiketti
                  </>
                )}
              </button>
            </div>
          </form>
          
          {/* Info card */}
          <div className="bg-blue-50 p-4 mx-5 mb-5 rounded-lg border border-blue-100 flex">
            <Info size={18} className="text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p>Tekoäly luo realistisen tiketin annettujen parametrien perusteella. Tiketit tallentuvat järjestelmään harjoitustiketteinä.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right column - Preview/results */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-gray-200 bg-white h-full overflow-hidden">
          {/* Result tabs */}
          <div className="border-b border-gray-200 flex">
            <button
              onClick={() => setSelectedTab('generator')}
              className={`px-5 py-3 text-sm font-medium ${
                selectedTab === 'generator' 
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Tulokset
            </button>
            <button
              onClick={() => setSelectedTab('logs')}
              className={`px-5 py-3 text-sm font-medium ${
                selectedTab === 'logs' 
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Lokitiedot
            </button>
          </div>
          
          {/* Tab content */}
          <div className="p-5">
            {selectedTab === 'generator' && (
              <>
                {generatedTicket ? (
                  // Show generated ticket
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                        {generatedTicket.title}
                        {generatedTicket.priority === 'HIGH' && 
                          <span className="ml-2 text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Korkea prioriteetti</span>
                        }
                        {generatedTicket.priority === 'MEDIUM' && 
                          <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Keskitason prioriteetti</span>
                        }
                        {generatedTicket.priority === 'LOW' && 
                          <span className="ml-2 text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Matala prioriteetti</span>
                        }
                        {generatedTicket.priority === 'CRITICAL' && 
                          <span className="ml-2 text-xs font-medium bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Kriittinen prioriteetti</span>
                        }
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <Users size={14} className="mr-1" />
                          Käyttäjä: {generatedTicket.createdBy?.name || "Tuntematon"}
                        </span>
                        <span className="flex items-center">
                          <HardDrive size={14} className="mr-1" />
                          Laite: {generatedTicket.device}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="whitespace-pre-wrap text-gray-700">{generatedTicket.description}</p>
                      </div>
                    </div>
                    
                    {generatedTicket.additionalInfo && (
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">Lisätiedot</h4>
                        <p className="text-gray-600">{generatedTicket.additionalInfo}</p>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                        <span className="block text-gray-500 text-xs">Status</span>
                        <span className="font-medium text-gray-800">{generatedTicket.status}</span>
                      </div>
                      <div className="bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                        <span className="block text-gray-500 text-xs">Vastausmuoto</span>
                        <span className="font-medium text-gray-800 flex items-center">
                          {getResponseFormatContent(generatedTicket.responseFormat).icon}
                          <span className="ml-1">{getResponseFormatContent(generatedTicket.responseFormat).label}</span>
                        </span>
                      </div>
                      <div className="bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                        <span className="block text-gray-500 text-xs">Luotu</span>
                        <span className="font-medium text-gray-800">
                          {new Date(generatedTicket.createdAt).toLocaleString('fi-FI')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-3 flex">
                      <button 
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mr-4"
                        onClick={() => window.open(`/tickets/${generatedTicket.id}`, '_blank')}
                      >
                        Näytä tiketti järjestelmässä
                      </button>
                      <button 
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        onClick={() => setGeneratedTicket(null)}
                      >
                        Luo uusi tiketti
                      </button>
                    </div>
                  </div>
                ) : (
                  // Empty state
                  <div className="text-center py-16">
                    <Sparkles size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-500 mb-1">Ei tuloksia</h3>
                    <p className="text-gray-400 mb-6">Luo tiketti määrittämällä parametrit ja klikkaamalla "Luo harjoitustiketti"</p>
                  </div>
                )}
              </>
            )}
            
            {selectedTab === 'logs' && (
              <div className="text-sm font-mono p-0 bg-gray-50 rounded-lg border border-gray-200 h-[500px] overflow-hidden flex flex-col">
                {/* Log header */}
                <div className="border-b border-gray-200 p-3 bg-gray-100 flex justify-between items-center">
                  <div className="flex items-center">
                    <Terminal size={16} className="mr-2 text-gray-500" />
                    <h3 className="font-medium text-gray-700">Tekoälyn lokitiedot</h3>
                  </div>
                  <div className="flex space-x-2">
                    <span className="flex items-center text-xs text-gray-500">
                      <Clock size={12} className="mr-1" />
                      {new Date().toLocaleTimeString('fi-FI')}
                    </span>
                    <span className="flex items-center text-xs text-gray-500">
                      <CpuIcon size={12} className="mr-1" />
                      {generatedTicket ? 'Valmis' : 'Odottaa'}
                    </span>
                  </div>
                </div>
                
                {/* Log content */}
                <div 
                  ref={logContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-900 text-gray-200"
                >
                  <div className="pb-2 mb-2 border-b border-gray-700 text-xs text-gray-400">
                    # Tekoälyn tikettigenerointi - Aloitettu {new Date().toLocaleDateString('fi-FI')}
                  </div>
                  
                  {logs.length === 0 ? (
                    <div className="py-2 text-gray-500 text-center italic">
                      Lokitiedot näkyvät tässä kun luot tiketin...
                    </div>
                  ) : (
                    <>
                      {logs.map((log, index) => {
                        const format = getLogTypeFormatting(log.type);
                        return (
                          <div key={index} className="leading-tight">
                            <div className="flex items-start">
                              {format.icon}
                              <div>
                                <span className={format.className}>
                                  [{log.type.toUpperCase()}]
                                </span>
                                <span className="text-gray-400 mx-1">
                                  {new Date(log.timestamp).toLocaleTimeString('fi-FI')}
                                </span>
                                <span className="text-gray-100">{log.message}</span>
                              </div>
                            </div>
                            
                            {log.details && (
                              <div className="ml-5 mt-1 mb-2">
                                {typeof log.details === 'object' ? (
                                  <div className="bg-gray-800 rounded p-2 text-xs">
                                    {Object.entries(log.details).map(([key, value]) => (
                                      <div key={key} className="grid grid-cols-12 gap-2">
                                        <span className="col-span-3 text-gray-400">{key}:</span>
                                        <span className="col-span-9 text-gray-200">
                                          {typeof value === 'object' 
                                            ? JSON.stringify(value) 
                                            : String(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">{log.details}</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Terminal prompt */}
                      <div className="pt-2 flex items-center text-green-400">
                        <span className="mr-1">$</span>
                        <span className="animate-pulse">_</span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Log toolbar */}
                <div className="border-t border-gray-200 p-2 px-3 bg-gray-100 flex justify-between items-center text-xs">
                  <span className="text-gray-600">
                    {logs.length > 0 ? `${logs.length} tapahtumaa` : 'Ei lokitietoja'}
                  </span>
                  <div className="space-x-2">
                    <button 
                      onClick={() => setLogs([])} 
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Tyhjennä
                    </button>
                    <button 
                      onClick={() => {
                        if (logContainerRef.current) {
                          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
                        }
                      }}
                      className="text-gray-600 hover:text-gray-900 flex items-center"
                    >
                      <ChevronRight size={12} className="mr-0.5" />
                      Vieritä alas
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AITicketGenerator; 