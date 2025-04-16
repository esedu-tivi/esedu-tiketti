import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { authService } from '../../services/authService';
import TicketDetailsModal from '../Tickets/TicketDetailsModal';
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
  Lightbulb,
  List,
  ExternalLink,
  Trash2,
  RefreshCw
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
  const [ticketCount, setTicketCount] = useState(1); // New state for ticket quantity
  
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
  // Use arrays to store multiple previews and generated items
  const [previewItems, setPreviewItems] = useState([]); // Renamed and changed to array
  const [generatedItems, setGeneratedItems] = useState([]); // Renamed and changed to array
  const [selectedTab, setSelectedTab] = useState('generator');
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [selectedTicketId, setSelectedTicketId] = useState(null); // State for the ticket ID to show in modal
  const [isRerolling, setIsRerolling] = useState(false); // State to track reroll in progress
  
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
        addLog('debug', 'Fetching initial configuration and user data...');
        addLog('info', 'Alustetaan generaattoria');
        
        addLog('debug', 'Acquiring token for config fetch...');
        // Get auth token
        const token = await authService.acquireToken();
        addLog('debug', 'Hankittu autentikaatio');
        
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
        addLog('debug', 'Configuration and user data fetched successfully.');
        
        setIsFetching(false);
        addLog('debug', 'Exited fetching state.');
        addLog('info', 'Generaattori valmiina tikettien luontiin');
      } catch (error) {
        console.error('Error fetching config:', error);
        toast.error('Virhe haettaessa asetuksia');
        addLog('error', 'Virhe asetuksien haussa', {
          message: error.message,
          status: error.response?.status,
          responseData: error.response?.data
        });
        setIsFetching(false);
        addLog('debug', 'Exited fetching state due to error.');
      }
    };
    
    fetchConfig();
  }, []);

  // Handle form submission to generate PREVIEW(S)
  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    
    const count = parseInt(ticketCount) || 1;
    addLog('info', `Pyydetty ${count} esikatselun generointia`, { count, complexity, category, userProfile, responseFormat, assignToId: count === 1 ? assignToId : 'N/A' }); // Log initial request

    if (count <= 0) {
      toast.error('Tikettien määrän tulee olla vähintään 1.');
      addLog('error', 'Virheellinen tikettimäärä', { count });
      return;
    }
    
    // Validate required fields
    if (!complexity || !category || !userProfile) {
      toast.error('Täytä kaikki pakolliset kentät (Vaikeustaso, Kategoria, Käyttäjäprofiili).');
      addLog('error', 'Pakolliset kentät puuttuvat');
      return;
    }
    
    try {
      setIsLoading(true);
      setLogs([]); // Clear logs at the start of a new generation
      addLog('debug', 'Cleared previous results and entered loading state for preview.');
      setGeneratedItems([]); // Clear previous final tickets
      setPreviewItems([]); // Clear previous previews
      setIsPreviewing(false);
      addLog('debug', 'State updated: isPreviewing=false, previewItems=[], generatedItems=[]');
      
      addLog('debug', 'Acquiring auth token for preview...');
      // Get auth token
      const token = await authService.acquireToken();
      addLog('debug', 'Autentikaatio hankittu esikatselua varten');
      
      addLog('info', `Aloitetaan ${count} tiketin esikatselun generointi...`);

      const previews = [];
      let hasError = false;

      for (let i = 0; i < count; i++) {
        addLog('debug', `Generoidaan esikatselu ${i + 1} / ${count}`);
        // Build request payload for this iteration
        // Use original assignToId only if count is 1
        const currentAssignToId = count === 1 ? (assignToId || undefined) : undefined;
      const payload = {
        complexity,
        category,
        userProfile,
          assignToId: currentAssignToId 
      };
      if (responseFormat !== 'auto') {
        payload.responseFormat = responseFormat;
      }
      
        addLog('debug', `Lähetetään esikatselupyyntö ${i + 1}`, { payload }); // Log payload before sending
        addLog('debug', `Processing preview item ${i + 1}`, { complexity: payload.complexity, category: payload.category, userProfile: payload.userProfile }); // Log item details
      
        try {
      const startTime = performance.now();
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai/generate-ticket-preview`, payload, {
            headers: { Authorization: `Bearer ${token}` }
      });
      const endTime = performance.now();
      const generationTime = ((endTime - startTime) / 1000).toFixed(2); // In seconds
      
          previews.push({ 
            ticketData: response.data.ticketData, 
            solution: response.data.solution, 
            id: `preview-${i}` // Temporary ID for list rendering
          });
          addLog('success', `Esikatselu ${i + 1} luotu (${generationTime}s)`, { title: response.data.ticketData.title, previewId: `preview-${i}` }); // Added previewId
          addLog('debug', `Received preview response ${i + 1}`, { responseData: response.data }); // Log raw response
        } catch (error) {
          hasError = true;
          console.error(`Error generating ticket preview ${i + 1}:`, error);
          const errorDetails = error.response?.data?.details || error.message || 'Tuntematon virhe';
          addLog('error', `Virhe esikatselun ${i + 1} luonnissa`, {
            details: errorDetails, 
            status: error.response?.status, 
            responseData: error.response?.data 
          });
          toast.error(`Virhe luotaessa esikatselua ${i + 1}: ${errorDetails}`);
          // Optionally break the loop on first error, or continue?
          // break; 
        }
      }

      // Set the preview data and enter preview mode if any previews were successful
      addLog('info', `Esikatseluiden generointi valmis. ${previews.length} / ${count} onnistui.`); // Log completion summary
      if (previews.length > 0) {
        setPreviewItems(previews);
        setIsPreviewing(true);
        addLog('debug', `State updated: isPreviewing=true, previewItems=[${previews.length} items]`);
        toast.success(`${previews.length} tiketin esikatselu luotu. Tarkista ja vahvista.`, {
          icon: <Eye className="text-blue-500" />
        });
        addLog('info', `Luotu ${previews.length} esikatselua. Odotetaan vahvistusta.`);
      } else {
        addLog('error', 'Yhtään esikatselua ei voitu luoda.');
      }
      if (hasError) {
         addLog('warning', 'Joitakin esikatseluita ei voitu luoda virheiden vuoksi.');
      }
      
    } catch (error) { // Catch errors outside the loop (e.g., token acquisition)
      console.error('Error generating ticket previews (outer scope): ', error);
      addLog('error', 'Odottamaton virhe esikatseluiden luonnissa', { message: error.message });
      toast.error('Odottamaton virhe esikatseluiden luonnissa: ' + error.message);
    } finally {
      addLog('debug', 'Exiting preview loading state.');
      setIsLoading(false);
    }
  };
  
  // Handle confirming the ticket creation (potentially multiple)
  const handleConfirmCreation = async () => {
    if (!previewItems || previewItems.length === 0) { 
      addLog('error', 'Vahvistus epäonnistui: esikatseludata puuttuu');
      addLog('debug', 'Confirmation check failed: previewItems array is empty.'); // Specific check failure log
      toast.error('Vahvistusta ei voida suorittaa, esikatseludata puuttuu.');
      return;
    }
    
    const itemsToConfirm = [...previewItems]; // Create a copy
    addLog('info', `Aloitetaan ${itemsToConfirm.length} tiketin vahvistus...`); // Log start of confirmation
    const successfullyCreated = [];
    let hasError = false;

    try {
      setIsLoading(true); // Indicate loading for confirmation
      addLog('debug', 'Cleared previous generated items and entered loading state for confirmation.');
      setGeneratedItems([]); // Clear previously generated items
      addLog('debug', 'State updated: generatedItems=[]');

      addLog('info', `Vahvistetaan ${itemsToConfirm.length} tiketin luonti...`);
      
      addLog('debug', 'Acquiring auth token for confirmation...');
      // Get auth token
      const token = await authService.acquireToken();
      addLog('debug', 'Autentikaatio hankittu vahvistusta varten');
      
      for (let i = 0; i < itemsToConfirm.length; i++) {
        const previewItem = itemsToConfirm[i];
        addLog('debug', `Vahvistetaan tiketti ${i + 1} / ${itemsToConfirm.length}`, { title: previewItem.ticketData.title });

        // Build request payload for confirmation
        const payload = {
          ticketData: previewItem.ticketData,
          complexity: complexity, // Use the complexity selected in the form
          solution: previewItem.solution 
        };
        
        addLog('debug', `Lähetetään vahvistuspyyntö ${i + 1}`, { title: payload.ticketData.title, previewId: previewItem.id }); // Log before sending confirmation, include preview id

        try {
          const startTime = performance.now();
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai/confirm-ticket-creation`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const endTime = performance.now();
          const confirmationTime = ((endTime - startTime) / 1000).toFixed(2);

          addLog('debug', `Received confirmation response ${i + 1}`, { responseData: response.data }); // Log raw response

          successfullyCreated.push(response.data.ticket); // Store the final ticket object
          addLog('success', `Tiketti ${i + 1} vahvistettu ja luotu (${confirmationTime}s)`, {
        ticketId: response.data.ticket.id,
            title: response.data.ticket.title
          });
        } catch (error) {
           hasError = true;
           console.error(`Error confirming ticket creation ${i + 1}:`, error);
           const errorDetails = error.response?.data?.details || error.message || 'Tuntematon virhe';
           addLog('error', `Virhe tiketin ${i + 1} vahvistuksessa`, {
              title: previewItem.ticketData.title, 
              details: errorDetails, 
              status: error.response?.status, 
              responseData: error.response?.data 
           });
           toast.error(`Virhe vahvistettaessa tikettiä ${i + 1} (${previewItem.ticketData.title.substring(0,20)}...): ${errorDetails}`);
           // Optionally break? Or continue confirming others?
        }
      }

      // Set the final generated tickets, exit preview mode
      setGeneratedItems(successfullyCreated);
      setPreviewItems([]); // Clear previews after confirmation attempt
      setIsPreviewing(false);
      addLog('debug', `State updated: generatedItems=[${successfullyCreated.length} items], previewItems=[], isPreviewing=false`);
      
      addLog('info', `Tikettien vahvistus valmis. ${successfullyCreated.length} / ${itemsToConfirm.length} luotu.`); // Log completion summary

      if (successfullyCreated.length > 0) {
         toast.success(`${successfullyCreated.length} / ${itemsToConfirm.length} harjoitustikettiä luotu onnistuneesti!`, {
        icon: <CheckCircle2 className="text-green-500" />
      });
         addLog('info', `${successfullyCreated.length} tikettiä tallennettu tietokantaan.`);
      } else {
         toast.error('Yhtään tikettiä ei voitu luoda vahvistusvaiheessa.');
         addLog('error', 'Yhtään tikettiä ei voitu vahvistaa.');
      }
      if (hasError) {
         addLog('warning', 'Joitakin tikettejä ei voitu vahvistaa virheiden vuoksi.');
      }
      
      // Reset assignment field after successful creation (if only 1 was generated initially)
      if (ticketCount === 1) {
      setAssignToId('');
      }
      
    } catch (error) { // Catch outer errors (e.g., token)
      console.error('Error confirming ticket creations (outer scope):', error);
       addLog('error', 'Odottamaton virhe tikettien vahvistuksessa', { message: error.message });
       toast.error('Odottamaton virhe tikettien vahvistuksessa: ' + error.message);
    } finally {
      addLog('debug', 'Exiting confirmation loading state.');
      setIsLoading(false);
    }
  };

  // Handle canceling the preview
  const handleCancelPreview = () => {
    addLog('debug', 'Cancel preview requested. Clearing preview items and exiting preview state.');
    addLog('info', 'Esikatselu peruutettu');
    setPreviewItems([]); // Clear preview items array
    setIsPreviewing(false);
    addLog('debug', 'State updated: isPreviewing=false, previewItems=[]');
    toast('Tiketin luonti peruutettu.', { icon: <X className="text-gray-500" /> });
  };

  // --- New handlers for preview item actions ---
  const handleDeletePreviewItem = (previewId) => {
    if (isLoading || isRerolling) return; // Prevent action during other operations
    addLog('debug', `Delete requested for preview item: ${previewId}`);
    setPreviewItems(prev => prev.filter(item => item.id !== previewId));
    toast.success('Esikatselu poistettu.', { icon: <Trash2 size={16} /> });
    addLog('info', `Esikatselu ${previewId} poistettu listalta.`);
  };

  const handleRerollPreviewItem = async (previewId) => {
    if (isLoading || isRerolling) return; // Prevent action during other operations
    const itemIndex = previewItems.findIndex(item => item.id === previewId);
    if (itemIndex === -1) {
      addLog('error', `Reroll failed: Could not find preview item ${previewId}`);
      return;
    }

    addLog('info', `Aloitetaan uudelleengenerointi esikatselulle ${previewId}...`);
    setIsRerolling(true);

    try {
      addLog('debug', 'Acquiring token for reroll...');
      const token = await authService.acquireToken();
      addLog('debug', 'Token acquired for reroll.');

      // Rebuild payload using current form state, EXCLUDING assignToId
      const payload = {
        complexity,
        category,
        userProfile,
        // assignToId: undefined, // Explicitly undefined for reroll
      };
      if (responseFormat !== 'auto') {
        payload.responseFormat = responseFormat;
      }

      addLog('debug', `Sending reroll request for ${previewId}`, { payload });
      const startTime = performance.now();
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/ai/generate-ticket-preview`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const endTime = performance.now();
      const generationTime = ((endTime - startTime) / 1000).toFixed(2);

      addLog('debug', `Received reroll response for ${previewId}`, { responseData: response.data });

      // Create new item data, keeping the original previewId
      const newItem = {
        ticketData: response.data.ticketData,
        solution: response.data.solution,
        id: previewId // Keep the same temporary ID
      };

      // Update the state by replacing the item at the specific index
      setPreviewItems(prev => prev.map((item, idx) => idx === itemIndex ? newItem : item));
      toast.success(`Esikatselu #${itemIndex + 1} generoitu uudelleen!`, { icon: <RefreshCw size={16} /> });
      addLog('success', `Esikatselu ${previewId} generoitu uudelleen (${generationTime}s)`, { title: newItem.ticketData.title });

    } catch (error) {
      console.error(`Error rerolling preview item ${previewId}:`, error);
      const errorDetails = error.response?.data?.details || error.message || 'Tuntematon virhe';
      addLog('error', `Virhe uudelleengeneroinnissa (${previewId})`, {
         details: errorDetails,
         status: error.response?.status,
         responseData: error.response?.data
      });
      toast.error(`Virhe uudelleengeneroinnissa: ${errorDetails}`);
    } finally {
      addLog('debug', `Finished reroll attempt for ${previewId}.`);
      setIsRerolling(false);
    }
  };
  // --- End new handlers ---

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

  // --- Modal Handlers ---
  const handleOpenTicketModal = (ticketId) => {
    if (!ticketId) return;
    addLog('debug', `Opening modal for ticket ID: ${ticketId}`);
    setSelectedTicketId(ticketId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    addLog('debug', `Closing ticket modal for ID: ${selectedTicketId}`);
    setIsModalOpen(false);
    setSelectedTicketId(null); // Clear selected ID when closing
  };
  // --- End Modal Handlers ---

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
              {/* Ticket Count */}
              <div>
                <label htmlFor="ticketCount" className="block text-sm font-medium text-gray-700 mb-1">
                  Määrä
                </label>
                <input 
                  type="number"
                  id="ticketCount"
                  name="ticketCount"
                  value={ticketCount}
                  onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value) || 1))} // Ensure >= 1
                  min="1"
                  disabled={isLoading || isFetching}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 focus:outline-none
                            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                            shadow-sm bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Montako tikettiä generoidaan kerralla?</p>
              </div>

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
                        disabled={isLoading || isFetching || supportUsers.length === 0 || ticketCount > 1} // Disable if count > 1
                        className="w-full pl-3 pr-10 py-2.5 text-base border border-gray-300 focus:outline-none
                                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 rounded-lg 
                                shadow-sm appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                disabled={isLoading || isFetching || !category || ticketCount <= 0}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 border border-transparent 
                          text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 
                          hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                          focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Generoidaan esikatselu{ticketCount > 1 ? 'ja...' : 'a...'}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="mr-2" />
                    Luo {ticketCount} esikatselu{ticketCount > 1 ? 'a' : ''}
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
                {isPreviewing && previewItems.length > 0 && (
                  // Show preview data + Confirm/Cancel buttons
                  <div className="space-y-6">
                    <h3 className="text-lg font-medium text-gray-800 flex items-center">
                      <Eye size={20} className="mr-2 text-blue-500"/>
                      Esikatselu ({previewItems.length} tikettiä)
                      </h3>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                      {previewItems.map((item, index) => (
                        <details key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden group">
                          <summary className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50 list-none">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-700 mr-3">#{index + 1}: {item.ticketData.title}</span>
                              {/* Add priority spans here if needed */}
                              {item.ticketData.priority === 'HIGH' && <span className="text-xs font-medium bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">Korkea</span>}
                              {item.ticketData.priority === 'MEDIUM' && <span className="ml-1 text-xs font-medium bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">Keski</span>}
                              {item.ticketData.priority === 'LOW' && <span className="ml-1 text-xs font-medium bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">Matala</span>}
                              {item.ticketData.priority === 'CRITICAL' && <span className="ml-1 text-xs font-medium bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full">Kriit</span>}
                      </div>
                            <ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform" />
                          </summary>
                          <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
                            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                              {/* Device, Response Format, Assigned User spans... */}
                              <span className="flex items-center"><HardDrive size={14} className="mr-1" />Laite: {item.ticketData.device}</span>
                              <span className="flex items-center">{getResponseFormatContent(item.ticketData.responseFormat).icon}<span className="ml-1">{getResponseFormatContent(item.ticketData.responseFormat).label}</span></span>
                              {item.ticketData.assignedToId && (
                                <span className="flex items-center"><Users size={14} className="mr-1" />Osoitettu: {supportUsers.find(u => u.id === item.ticketData.assignedToId)?.name || item.ticketData.assignedToId}</span>
                              )}
                      </div>
                            <div>
                              <h5 className="font-medium text-gray-700 text-sm mb-1">Kuvaus</h5>
                              <p className="whitespace-pre-wrap text-gray-700 text-sm">{item.ticketData.description}</p>
                    </div>
                            {item.ticketData.additionalInfo && (
                      <div>
                                <h5 className="font-medium text-gray-700 text-sm mb-1">Lisätiedot</h5>
                                <p className="text-gray-600 whitespace-pre-wrap text-sm">{item.ticketData.additionalInfo}</p>
                      </div>
                    )}
                            {item.solution && (
                              <div className="pt-3 border-t border-gray-200">
                                <h5 className="font-medium text-gray-700 text-sm mb-1 flex items-center"><Lightbulb size={14} className="mr-1 text-yellow-500"/>Ratkaisuehdotus</h5>
                                <div className="bg-blue-50 p-3 rounded border border-blue-200 prose prose-sm max-w-none">
                                  <pre className="whitespace-pre-wrap text-xs font-sans">{item.solution}</pre>
                      </div>
                      </div>
                            )}
                            {/* --- Add Action Buttons for Preview Item --- */} 
                            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                                <button 
                                    onClick={() => handleRerollPreviewItem(item.id)}
                                    disabled={isLoading || isRerolling}
                                    className="inline-flex items-center px-2.5 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRerolling ? <Loader2 size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1"/>}
                                    Generoi uudelleen
                                </button>
                                <button 
                                    onClick={() => handleDeletePreviewItem(item.id)}
                                    disabled={isLoading || isRerolling}
                                    className="inline-flex items-center px-2.5 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={14} className="mr-1"/>
                                    Poista
                                </button>
                      </div>
                            {/* --- End Action Buttons --- */} 
                          </div>
                        </details>
                      ))}
                    </div>
                    
                    {/* Confirmation buttons */} 
                    <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={handleConfirmCreation}
                        disabled={isLoading || isRerolling || previewItems.length === 0} // Disable if no items left or rerolling
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
                        Vahvista ja luo {previewItems.length} tiketti{previewItems.length !== 1 ? 'ä' : ''} {/* Updated pluralization */}
                      </button>
                      <button 
                        onClick={handleCancelPreview}
                        disabled={isLoading || isRerolling}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 
                                  text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white 
                                  hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
                                  focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                      >
                        <X size={16} className="mr-2" />
                        Peruuta
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Vahvistamalla luot {previewItems.length} tikettiä järjestelmään näillä tiedoilla.</p>
                  </div>
                )} 
                
                {/* Show final generated ticket(s) if creation was confirmed */}
                {!isPreviewing && generatedItems.length > 0 && (
                  <div className="space-y-5">
                    <h3 className="text-lg font-medium text-gray-800 flex items-center">
                      <CheckCircle2 size={20} className="mr-2 text-green-500"/>
                      Luotu {generatedItems.length} tikettiä
                    </h3>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                      {generatedItems.map((ticket, index) => (
                        <div key={ticket.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-gray-800">#{index + 1}: {ticket.title}</span>
                            <button 
                              onClick={() => handleOpenTicketModal(ticket.id)}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-medium inline-flex items-center"
                            >
                              Avaa modaalissa <ExternalLink size={12} className="ml-1"/>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center"><List size={12} className="mr-1" />ID: {ticket.id}</span>
                            <span className="flex items-center"><Users size={12} className="mr-1" />Luonut: {ticket.createdBy?.name || "N/A"}</span>
                            {ticket.assignedTo && (
                              <span className="flex items-center"><Users size={12} className="mr-1" />Osoitettu: {ticket.assignedTo.name}</span>
                            )}
                            <span className="flex items-center"><Clock size={12} className="mr-1" />Luotu: {new Date(ticket.createdAt).toLocaleString('fi-FI')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-3 flex flex-wrap gap-4">
                      <button 
                        className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                        onClick={() => { 
                          setGeneratedItems([]); // Clear the displayed tickets
                        }}
                      >
                        Luo uusia tikettejä
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Empty state (when not previewing and no final ticket) */}
                {!isPreviewing && generatedItems.length === 0 && (
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
                      {isLoading ? 'Käsitellään' : (isPreviewing ? 'Esikatselu' : (generatedItems.length > 0 ? 'Valmis' : 'Odottaa'))}
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
                
      {/* Ticket Details Modal */}
      {isModalOpen && selectedTicketId && (
        <TicketDetailsModal
          ticketId={selectedTicketId}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          // Optional: Add onTicketUpdate if modifications within modal should refresh anything here
          // onTicketUpdate={() => { /* Maybe refetch something? */ }}
        />
      )}
    </div>
  );
};

export default AITicketGenerator; 