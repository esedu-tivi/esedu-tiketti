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
  Terminal,
  Send,
  X,
  Eye,
  Lightbulb
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
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [ticketPreviewData, setTicketPreviewData] = useState(null);
  const [generatedTicket, setGeneratedTicket] = useState(null);
  const [generatedSolution, setGeneratedSolution] = useState(null);
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

  // Handle form submission to generate PREVIEW
  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!complexity || !category || !userProfile) {
      toast.error('Täytä kaikki pakolliset kentät');
      addLog('error', 'Pakolliset kentät puuttuvat');
      return;
    }
    
    try {
      setIsLoading(true);
      setGeneratedTicket(null); // Clear previous final ticket
      setGeneratedSolution(null); // Clear previous solution
      setTicketPreviewData(null); // Clear previous preview
      setIsPreviewing(false);
      
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
      
      addLog('info', 'Aloitetaan tiketin esikatselun generointi', payload);
      addLog('debug', 'Lähetetään esikatselupyyntö tekoälylle');
      
      const startTime = performance.now();
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai/generate-ticket-preview`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const endTime = performance.now();
      const generationTime = ((endTime - startTime) / 1000).toFixed(2); // In seconds
      
      // Set the preview data AND solution, then enter preview mode
      setTicketPreviewData(response.data.ticketData);
      setGeneratedSolution(response.data.solution); // Store solution received from preview
      setIsPreviewing(true);
      
      // Add detailed logs
      addLog('success', `Esikatselu luotu onnistuneesti (${generationTime}s)`, {
        generationTime: `${generationTime} sekuntia`,
        title: response.data.ticketData.title,
        priority: response.data.ticketData.priority,
        responseFormat: response.data.ticketData.responseFormat
      });
      
      addLog('debug', 'LLM vastaus käsitelty, odotetaan vahvistusta');
      
      toast.success('Tiketin esikatselu luotu. Tarkista ja vahvista.', {
        icon: <Eye className="text-blue-500" />
      });
      
    } catch (error) {
      console.error('Error generating ticket preview:', error);
      
      // Add detailed error logs
      addLog('error', 'Virhe esikatselun luonnissa', {
        message: error.message,
        details: error.response?.data?.details || 'Tuntematon virhe',
        status: error.response?.status
      });
      
      toast.error('Virhe esikatselun luonnissa: ' + (error.response?.data?.details || error.message), {
        icon: <AlertCircle className="text-red-500" />
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle confirming the ticket creation
  const handleConfirmCreation = async () => {
    if (!ticketPreviewData || !generatedSolution) { // Also check for solution
      addLog('error', 'Vahvistus epäonnistui: esikatseludata tai ratkaisu puuttuu');
      toast.error('Vahvistusta ei voida suorittaa, esikatseludata tai ratkaisu puuttuu.');
      return;
    }
    
    try {
      setIsLoading(true); // Indicate loading for confirmation
      
      // Get auth token
      const token = await authService.acquireToken();
      
      // Build request payload for confirmation, including the solution
      const payload = {
        ticketData: ticketPreviewData,
        complexity: complexity, // Pass original complexity
        solution: generatedSolution // Pass the pre-generated solution
      };
      
      addLog('info', 'Vahvistetaan tiketin luonti...', { ticketTitle: ticketPreviewData.title });
      addLog('debug', 'Lähetetään vahvistuspyyntö palvelimelle');
      
      const startTime = performance.now();
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai/confirm-ticket-creation`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const endTime = performance.now();
      const confirmationTime = ((endTime - startTime) / 1000).toFixed(2); // In seconds
      
      // Set the final generated ticket and solution, exit preview mode
      // Note: response.data.solution should be the same as generatedSolution we sent,
      // but using the response ensures consistency if backend modified it (though it shouldn't here).
      setGeneratedTicket(response.data.ticket);
      setGeneratedSolution(response.data.solution); // Store the solution from confirmation response
      setTicketPreviewData(null);
      setIsPreviewing(false);
      
      // Add detailed logs
      addLog('success', `Tiketti vahvistettu ja luotu (${confirmationTime}s)`, {
        ticketId: response.data.ticket.id,
        confirmationTime: `${confirmationTime} sekuntia`,
        title: response.data.ticket.title,
        priority: response.data.ticket.priority,
        responseFormat: response.data.ticket.responseFormat,
        assignedTo: response.data.ticket.assignedTo?.name || 'Ei osoitettu'
      });
      
      addLog('debug', 'Tiketti tallennettu tietokantaan');
      
      toast.success('Harjoitustiketti luotu onnistuneesti!', {
        icon: <CheckCircle2 className="text-green-500" />
      });
      
      // Reset assignment field after successful creation
      setAssignToId('');
      
    } catch (error) {
      console.error('Error confirming ticket creation:', error);
      
      // Add detailed error logs
      addLog('error', 'Virhe tiketin vahvistuksessa', {
        message: error.message,
        details: error.response?.data?.details || 'Tuntematon virhe',
        status: error.response?.status
      });
      
      toast.error('Virhe tiketin vahvistuksessa: ' + (error.response?.data?.details || error.message), {
        icon: <AlertCircle className="text-red-500" />
      });
      // Keep preview data if confirmation fails?
      // setIsPreviewing(false); 
      // setTicketPreviewData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle canceling the preview
  const handleCancelPreview = () => {
    addLog('info', 'Esikatselu peruutettu');
    setTicketPreviewData(null);
    setGeneratedSolution(null); // Clear solution on cancel
    setIsPreviewing(false);
    toast('Tiketin luonti peruutettu.', { icon: <X className="text-gray-500" /> });
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
          description: 'Tikettiin odotetaan vastausta kuvana'
        };
      case 'VIDEO':
        return { 
          label: 'Videovastaus', 
          icon: <Video size={16} className="text-purple-500" />,
          description: 'Tikettiin odotetaan vastausta videona'
        };
      default:
        return { 
          label: 'Tekstivastaus (Oletus)',
          icon: <MessageSquare size={16} className="text-gray-500" />,
          description: 'Tikettiin vastataan kirjallisesti'
        };
    }
  };
  
  // Get log type formatting
  const getLogTypeFormatting = (type) => {
    switch(type) {
      case 'info': return { icon: <Info size={14} />, color: 'text-blue-400' };
      case 'success': return { icon: <CheckCircle2 size={14} />, color: 'text-green-400' };
      case 'error': return { icon: <AlertCircle size={14} />, color: 'text-red-400' };
      case 'debug': return { icon: <Code size={14} />, color: 'text-gray-500' };
      default: return { icon: <ChevronRight size={14} />, color: 'text-gray-400' };
    }
  };

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
          
          {/* Form content - Conditionally render based on preview state */}
          {!isPreviewing && (
            <form onSubmit={handleGeneratePreview} className="p-5 space-y-5">
              {/* Complexity */}
              <div>
                <label htmlFor="complexity" className="block text-sm font-medium text-gray-700 mb-1">
                  Vaikeustaso
                </label>
                <div className="relative">
                  <select
                    id="complexity"
                    value={complexity}
                    onChange={(e) => setComplexity(e.target.value)}
                    disabled={isLoading || isFetching}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                  >
                    {complexityOptions.map((opt) => (
                      <option key={opt} value={opt}>{getComplexityLabel(opt)}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Kategoria
                </label>
                <div className="relative">
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isLoading || isFetching || categoryOptions.length === 0}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                  >
                    {categoryOptions.length === 0 && <option>Ladataan...</option>}
                    {categoryOptions.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* User Profile */}
              <div>
                <label htmlFor="userProfile" className="block text-sm font-medium text-gray-700 mb-1">
                  Käyttäjäprofiili
                </label>
                <div className="relative">
                  <select
                    id="userProfile"
                    value={userProfile}
                    onChange={(e) => setUserProfile(e.target.value)}
                    disabled={isLoading || isFetching}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                  >
                    {userProfileOptions.map((opt) => (
                      <option key={opt} value={opt}>{getUserProfileLabel(opt)}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>
              
              {/* Response Format */}
              <div>
                <label htmlFor="responseFormat" className="block text-sm font-medium text-gray-700 mb-1">
                  Haluttu vastausmuoto (Valinnainen)
                </label>
                <div className="relative">
                  <select
                    id="responseFormat"
                    value={responseFormat}
                    onChange={(e) => setResponseFormat(e.target.value)}
                    disabled={isLoading || isFetching}
                    className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm appearance-none bg-white"
                  >
                    <option value="auto">Automaattinen (AI päättää)</option>
                    {responseFormatOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {getResponseFormatContent(opt).label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
                {responseFormat !== 'auto' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {getResponseFormatContent(responseFormat).description}
                  </p>
                )}
              </div>
              
              {/* Advanced options toggle and content */}
              <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 w-full text-left"
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
                          disabled={isLoading || isFetching || supportUsers.length === 0}
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
              <div className="pt-3">
              <button
                type="submit"
                  disabled={isLoading || isFetching || !category}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent 
                            text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 
                            hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                            focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {isLoading ? (
                  <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Generoidaan esikatselua...
                  </>
                ) : (
                  <>
                      <Sparkles size={18} className="mr-2" />
                      Luo esikatselu
                  </>
                )}
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
      
      {/* Right column - Preview/Generated ticket and Logs */}
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 px-5" aria-label="Tabs">
            <button
              onClick={() => setSelectedTab('generator')}
                className={`${selectedTab === 'generator' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} 
                          whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                {isPreviewing ? <Eye size={16} className="mr-2" /> : <Sparkles size={16} className="mr-2" />}
                {isPreviewing ? 'Esikatselu' : 'Generaattori'}
            </button>
            <button
              onClick={() => setSelectedTab('logs')}
                className={`${selectedTab === 'logs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} 
                          whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Terminal size={16} className="mr-2" />
                Lokit
            </button>
            </nav>
          </div>
          
          {/* Tab content */}
          <div className="p-5">
            {selectedTab === 'generator' && (
              <>
                {isPreviewing && ticketPreviewData && (
                  // Show preview data + Confirm/Cancel buttons
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                        {ticketPreviewData.title}
                        {ticketPreviewData.priority === 'HIGH' && 
                          <span className="ml-2 text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded-full">Korkea prioriteetti</span>
                        }
                        {ticketPreviewData.priority === 'MEDIUM' && 
                          <span className="ml-2 text-xs font-medium bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">Keskitason prioriteetti</span>
                        }
                        {ticketPreviewData.priority === 'LOW' && 
                          <span className="ml-2 text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Matala prioriteetti</span>
                        }
                        {ticketPreviewData.priority === 'CRITICAL' && 
                          <span className="ml-2 text-xs font-medium bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Kriittinen prioriteetti</span>
                        }
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                        {/* Note: createdBy is not available in preview data yet */}
                        {/* <span className="flex items-center">
                          <Users size={14} className="mr-1" />
                          Käyttäjä: {ticketPreviewData.createdBy?.name || "Luodaan admin-käyttäjällä"}
                        </span> */}
                        <span className="flex items-center">
                          <HardDrive size={14} className="mr-1" />
                          Laite: {ticketPreviewData.device}
                        </span>
                        <span className="flex items-center">
                          {getResponseFormatContent(ticketPreviewData.responseFormat).icon}
                          <span className="ml-1">{getResponseFormatContent(ticketPreviewData.responseFormat).label}</span>
                        </span>
                        {/* Show assigned user if available in preview */}
                        {ticketPreviewData.assignedToId && (
                          <span className="flex items-center">
                            <Users size={14} className="mr-1" />
                            Osoitettu: {supportUsers.find(u => u.id === ticketPreviewData.assignedToId)?.name || ticketPreviewData.assignedToId}
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="whitespace-pre-wrap text-gray-700">{ticketPreviewData.description}</p>
                      </div>
                    </div>
                    
                    {ticketPreviewData.additionalInfo && (
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">Lisätiedot</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{ticketPreviewData.additionalInfo}</p>
                      </div>
                    )}
                    
                    {/* Display Solution during Preview */}
                    {generatedSolution && (
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                          <Lightbulb size={16} className="mr-2 text-yellow-500"/>
                          Ratkaisuehdotus
                        </h4>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 prose prose-sm max-w-none">
                          {/* Use pre for better formatting of potential markdown/code in solution */}
                          <pre className="whitespace-pre-wrap text-sm font-sans">{generatedSolution}</pre>
                        </div>
                      </div>
                    )}

                    {/* Confirmation buttons */}
                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleConfirmCreation}
                        disabled={isLoading}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent 
                                  text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 
                                  hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                                  focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                      >
                        {isLoading ? (
                          <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        ) : (
                          <Send size={16} className="mr-2" />
                        )}
                        Vahvista ja luo tiketti
                      </button>
                      <button 
                        onClick={handleCancelPreview}
                        disabled={isLoading}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 
                                  text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white 
                                  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                                  focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                      >
                        <X size={16} className="mr-2" />
                        Peruuta
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Vahvistamalla luot tiketin järjestelmään näillä tiedoilla.</p>
                  </div>
                )} 
                
                {/* Show final generated ticket if creation was confirmed */}
                {!isPreviewing && generatedTicket && (
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
                         {/* Show assigned user if available in final ticket */}
                        {generatedTicket.assignedTo && (
                          <span className="flex items-center">
                            <Users size={14} className="mr-1" />
                            Osoitettu: {generatedTicket.assignedTo.name}
                          </span>
                        )}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="whitespace-pre-wrap text-gray-700">{generatedTicket.description}</p>
                      </div>
                    </div>
                    
                    {generatedTicket.additionalInfo && (
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">Lisätiedot</h4>
                        <p className="text-gray-600 whitespace-pre-wrap">{generatedTicket.additionalInfo}</p>
                      </div>
                    )}
                    
                    {/* Display Solution AFTER confirmation (already stored in generatedSolution state) */}
                    {generatedSolution && (
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                          <Lightbulb size={16} className="mr-2 text-yellow-500"/>
                          Ratkaisu
                        </h4>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 prose prose-sm max-w-none">
                          {/* Use pre for better formatting */}
                          <pre className="whitespace-pre-wrap text-sm font-sans">{generatedSolution}</pre>
                        </div>
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
                       {generatedTicket.assignedTo && (
                        <div className="bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                          <span className="block text-gray-500 text-xs">Osoitettu</span>
                          <span className="font-medium text-gray-800">
                            {generatedTicket.assignedTo.name}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 flex flex-wrap gap-4">
                      <a 
                        href={`/tickets/${generatedTicket.id}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium inline-flex items-center"
                      >
                        Avaa tiketti uudessa välilehdessä <ChevronRight size={16} className="ml-1"/>
                      </a>
                      <button 
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        onClick={() => { 
                          setGeneratedTicket(null); // Clear the displayed ticket
                          setGeneratedSolution(null); // Clear the displayed solution
                        }}
                      >
                        Luo uusi tiketti
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Empty state (when not previewing and no final ticket) */}
                {!isPreviewing && !generatedTicket && (
                  <div className="text-center py-16">
                    <Sparkles size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-500 mb-1">Ei tuloksia</h3>
                    <p className="text-gray-400 mb-6">Luo tiketti määrittämällä parametrit ja klikkaamalla "Luo esikatselu"</p>
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
                      {isLoading ? 'Käsitellään' : (isPreviewing ? 'Esikatselu' : (generatedTicket ? 'Valmis' : 'Odottaa'))}
                    </span>
                  </div>
                </div>
                
                {/* Log content */}
                <div 
                  ref={logContainerRef}
                  className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-900 text-gray-200"
                >
                  {logs.length === 0 && (
                    <div className="text-center text-gray-500 py-4">Ei lokitietoja vielä.</div>
                  )}
                  {logs.map((log, index) => (
                    <div key={index} className={`flex items-start ${getLogTypeFormatting(log.type).color}`}>
                      <span className="mr-2 mt-0.5 flex-shrink-0">
                        {getLogTypeFormatting(log.type).icon}
                                </span>
                      <div className="flex-1">
                        <span className="font-medium">[{new Date(log.timestamp).toLocaleTimeString('fi-FI')}]</span>
                        <span className="ml-1">{log.message}</span>
                            {log.details && (
                          <pre className="text-xs text-gray-400 mt-1 p-2 bg-gray-800 rounded overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                </div>
                  ))}
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