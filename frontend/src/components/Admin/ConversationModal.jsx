import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios'; // Use axios
import { format } from 'date-fns';
import { authService } from '../../services/authService'; // Import authService
import { Loader2, AlertCircle, X, MessageSquare, User, Bot, Calendar, Check, Zap, Activity, AlertTriangle, BookOpen, ChevronDown, ExternalLink, Info, FileText, MessageSquareText } from 'lucide-react'; // Import more icons for evaluation and new ones

// Function to get styling for evaluation badges
const getEvaluationBadgeStyle = (evaluation) => {
  switch (evaluation?.toUpperCase()) {
    case 'EARLY':
      return 'bg-red-100 text-red-700';
    case 'PROGRESSING':
      return 'bg-yellow-100 text-yellow-700';
    case 'CLOSE':
      return 'bg-blue-100 text-blue-700';
    case 'SOLVED':
      return 'bg-green-100 text-green-700';
    case 'ERROR':
      return 'bg-gray-200 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-500'; // Default/Unknown
  }
};

// Function to get icon for evaluation badges
const getEvaluationIcon = (evaluation) => {
  switch (evaluation?.toUpperCase()) {
    case 'EARLY':
      return <Zap size={12} className="mr-1" />;
    case 'PROGRESSING':
      return <Activity size={12} className="mr-1" />;
    case 'CLOSE':
      return <MessageSquare size={12} className="mr-1" />;
    case 'SOLVED':
      return <Check size={12} className="mr-1" />;
    case 'ERROR':
      return <AlertTriangle size={12} className="mr-1" />;
    default:
      return null;
  }
};

// NEW: Helper function for evaluation explanations
const getEvaluationExplanation = (evaluation) => {
  switch (evaluation?.toUpperCase()) {
    case 'EARLY':
      return 'Tukihenkilö ehdottaa yleisiä toimia tai kerää lisätietoja.';
    case 'PROGRESSING':
      return 'Tukihenkilö on tunnistanut oikean alueen, mutta ehdotukset ovat vielä epätarkkoja.';
    case 'CLOSE':
      return 'Tukihenkilö on lähellä ratkaisua, mutta yksityiskohdissa voi olla puutteita.';
    case 'SOLVED':
      return 'Tukihenkilö on ehdottanut keskeistä toimenpidettä ongelman ratkaisemiseksi.';
    case 'ERROR':
      return 'Arviointia ei voitu suorittaa virheen vuoksi.';
    default:
      return 'Tuntematon arviointitila.';
  }
};

// Modal component using DIV and Tailwind - removed <dialog>
// Added onOpenSolutionWindow prop
const ConversationModal = ({ 
  open, 
  onClose, 
  ticketId, 
  onOpenSolutionWindow, 
  isSolutionWindowOpen, 
  solutionWindowTicketId, 
  onOpenTicketDetails
}) => {
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [solution, setSolution] = useState(null);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [solutionError, setSolutionError] = useState(null);
  const [summary, setSummary] = useState('');         // Current summary text
  const [hasSavedSummary, setHasSavedSummary] = useState(false); // Track if initial summary loaded
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  
  // Remove dialogRef - no longer needed
  // const dialogRef = useRef(null); 

  // Effect to fetch data
  useEffect(() => {
    if (open && ticketId) {
      const fetchData = async () => {
        // Reset states
        setLoading(true);
        setSolutionLoading(true);
        setError(null);
        setSolutionError(null);
        setConversation([]);
        setSolution(null);
        setSummary(''); // Clear displayed summary
        setHasSavedSummary(false); // Reset flag
        setSummaryError('');
        setLoadingSummary(false); // Ensure loading state is reset
        
        try {
          const token = await authService.acquireToken();
          
          // Fetch conversation (which now includes aiSummary) and solution
          const [convResponse, solutionResponse] = await Promise.all([
            axios.get(
              // Endpoint now returns { comments: [], aiSummary: string | null }
              `${import.meta.env.VITE_API_URL}/ai/analysis/tickets/${ticketId}/conversation`,
              { headers: { Authorization: `Bearer ${token}` } }
            ),
            axios.get(
              `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/solution`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
          ]);
          
          setConversation(convResponse.data.comments || []);
          // Set initial summary from fetched data
          const savedSummary = convResponse.data.aiSummary;
          if (savedSummary) {
            setSummary(savedSummary);
            setHasSavedSummary(true);
          }
          
          setSolution(solutionResponse.data.solution); 
          
        } catch (err) {
          console.error(`Error fetching data for ticket ${ticketId}:`, err);
          if (err.response?.config?.url?.includes('/conversation')) {
            setError(err.response?.data?.message || 'Failed to fetch conversation.');
          } else if (err.response?.config?.url?.includes('/solution')) {
            setSolutionError(err.response?.data?.message || 'Failed to fetch solution.');
          } else {
            setError('Failed to fetch data. Please try again later.');
            setSolutionError('Failed to fetch data. Please try again later.');
          }
        } finally {
          setLoading(false);
          setSolutionLoading(false);
        }
      };
      fetchData();
    } else {
        // Clear data when closing
        setConversation([]);
        setSolution(null);
        setError(null);
        setSolutionError(null);
        setSummary('');
        setHasSavedSummary(false);
        setSummaryError('');
    }
  }, [open, ticketId]);

  // REMOVE useEffect hooks for controlling dialog and backdrop click

  if (!open) return null; // Don't render if not open

  // Determine if the internal solution should be hidden
  const hideInternalSolution = isSolutionWindowOpen && solutionWindowTicketId === ticketId;

  // Responsive modal width - takes more width on smaller screens
  const modalClasses = `
    relative 
    w-11/12 // Wider on smallest screens
    md:w-3/4 // Good width on medium
    lg:w-[48%] // Side-by-side on large
    max-w-2xl 
    max-h-[85vh] md:max-h-[80vh] // Slightly less height on larger screens if needed 
    bg-white rounded-lg shadow-xl border border-gray-300 
    flex flex-col overflow-hidden
    transform transition-all duration-200 ease-out
    ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
  `;

  // --- Fetch Summary Handler (now Regenerate) --- 
  const handleGenerateSummary = async () => {
    if (!ticketId) return;
    setLoadingSummary(true);
    setSummaryError('');
    // Don't clear summary here, show loading indicator over it
    try {
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/summarize`,
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update the summary state with the newly generated one
      setSummary(response.data.summary || 'Uuden yhteenvedon luonti epäonnistui.');
      setHasSavedSummary(true); // Ensure flag is set after generation
    } catch (err) {
      console.error('Error generating summary:', err);
      setSummaryError(err.response?.data?.message || 'Uuden yhteenvedon luonti epäonnistui.');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    // Use a standard DIV instead of dialog
    <div className={modalClasses} onClick={e => e.stopPropagation()}> {/* Prevent backdrop click closing */} 
      {/* Modal Content */}
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-base font-medium text-gray-900">
          {/* Translated Title */} 
          Keskusteluanalyysi (Tiketti: {ticketId ? ticketId.substring(0, 8) + '...' : ''}) 
        </h3>
        {/* Button Group in Header */}
        <div className="flex items-center space-x-1">
           {/* NEW: Button to open TicketDetailsModal */} 
           <button
             onClick={() => { if(ticketId) onOpenTicketDetails(ticketId); }}
             className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-100"
             aria-label="Avaa tiketin tiedot" 
             title="Avaa tiketin tiedot"
           >
             <FileText size={18} />
           </button>

           {/* Existing Close Button */}
           <button 
             onClick={onClose} 
             className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-100"
             aria-label="Sulje"
           >
             <X size={18} />
           </button>
        </div>
      </div>

      {/* Body - Scrollable content area */}
      <div className="overflow-y-auto flex-grow p-4 space-y-4"> 
        {/* Summary Section - Now Collapsible */} 
        <details className="group border border-gray-200 rounded-md overflow-hidden"> {/* Use details tag */} 
           <summary className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 list-none"> {/* Use summary tag */} 
             <span className="text-sm font-semibold text-gray-700 flex items-center">
               <MessageSquareText size={16} className="mr-2 text-gray-500"/> {/* Optional icon */} 
               Keskustelun yhteenveto
             </span>
             <ChevronDown size={16} className="text-gray-500 group-open:rotate-180 transition-transform" />
           </summary>
           
           {/* Content inside the details tag */} 
           <div className="p-4 border-t border-gray-200 bg-white min-h-[60px] relative"> {/* Inner div for padding and background */} 
             {/* Loading Overlay */} 
             {loadingSummary && (
               <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                 <div className="flex items-center text-sm text-gray-500">
                   <Loader2 size={16} className="animate-spin mr-2" /> Generoidaan...
                 </div>
               </div>
             )}
             
             {/* Content Area (behind overlay if loading) */} 
             <div className={`${loadingSummary ? 'opacity-50' : ''}`}>
               {!summary && !summaryError && (
                  <div className="flex items-center justify-center text-sm text-gray-500 pt-1">
                     {/* Generate Button */} 
                     <button 
                        onClick={handleGenerateSummary}
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                     >
                       <MessageSquareText size={14} className="mr-1.5"/>
                       Luo yhteenveto
                     </button>
                  </div>
               )}
               {summaryError && (
                   <div className="flex items-center text-sm text-red-600">
                      <AlertCircle size={16} className="mr-2" /> {summaryError}
                   </div>
               )}
               {summary && (
                   <p className="text-sm text-gray-800 whitespace-pre-wrap">{summary}</p>
               )}
             </div>

             {/* Regenerate Button (shown only if a summary exists and not loading) */} 
             {hasSavedSummary && !loadingSummary && (
               <div className="text-right mt-2">
                 <button 
                   onClick={handleGenerateSummary} 
                   className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                   title="Luo yhteenveto uudelleen"
                 >
                   Luo uusi
                 </button>
               </div>
             )}
           </div>
        </details>

        {/* Conversation Section */}
        <div>
          {/* Translated Heading */}
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Keskusteluhistoria</h4>
          {loading && (
            <div className="flex justify-center items-center min-h-[100px]">
              <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold mr-2">Error:</strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {!loading && !error && (
            <ul className="space-y-4 border border-gray-200 rounded-md p-3 bg-gray-50/50 max-h-80 overflow-y-auto">
              {conversation.length === 0 ? (
                 // Translated text
                 <li className="text-center text-gray-500 py-4">Ei kommentteja.</li>
              ) : (
                conversation.map((comment) => (
                  <li 
                    key={comment.id}
                    className={`p-3 rounded-lg ${comment.isAiGenerated ? 'bg-indigo-50/70' : 'bg-white shadow-sm border border-gray-100'}`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-semibold text-gray-800 flex items-center flex-wrap gap-x-2">
                        {comment.isAiGenerated ? <Bot size={14} className="mr-1.5 text-indigo-500 flex-shrink-0"/> : <User size={14} className="mr-1.5 text-gray-500 flex-shrink-0"/>}
                        <span className="flex-shrink-0">{comment.author.name}</span>
                        {comment.isAiGenerated && (
                          <span className="text-xs font-medium bg-indigo-100 text-indigo-700 py-0.5 px-2 rounded-full flex-shrink-0">AI Agent</span>
                        )}
                        {comment.isAiGenerated && comment.evaluationResult && (
                          <span className={`text-xs font-medium py-0.5 px-2 rounded-full inline-flex items-center flex-shrink-0 ${getEvaluationBadgeStyle(comment.evaluationResult)}`}>
                            {getEvaluationIcon(comment.evaluationResult)}
                            {comment.evaluationResult}
                            {/* Tooltip Implementation using group-hover */}
                            <span className="relative group ml-1 cursor-help"> {/* Added relative group */}
                              <Info size={13} className="opacity-60"/>
                              {/* Tooltip element */}
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 w-max max-w-xs 
                                             bg-gray-700 text-white text-xs rounded shadow-lg 
                                             scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100 
                                             transition-opacity duration-150 ease-in-out pointer-events-none">
                                {getEvaluationExplanation(comment.evaluationResult)}
                              </span>
                            </span>
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center flex-shrink-0 ml-2">
                        <Calendar size={12} className="mr-1"/>
                        {format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap pl-5">
                      {comment.content}
                    </p>
                    {comment.mediaUrl && (
                      <p className="text-xs text-gray-400 mt-2 pl-5">
                        (Media: {comment.mediaType || 'link'} - Not displayed)
                      </p>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        
        {/* Conditionally render Solution Section */}
        {!hideInternalSolution && (
          <details className="group border border-gray-200 rounded-md overflow-hidden">
            <summary className="flex items-center justify-between p-3 cursor-pointer bg-gray-50 hover:bg-gray-100 list-none">
              <span className="text-sm font-semibold text-gray-700 flex items-center">
                <BookOpen size={16} className="mr-2 text-gray-500"/>
                {/* Translated Title */} 
                AI-generoitu ratkaisu 
              </span>
              <div className="flex items-center">
                <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(ticketId) onOpenSolutionWindow(ticketId); }}
                    className="text-gray-500 hover:text-indigo-600 mr-2 p-1 rounded hover:bg-gray-200 transition-colors"
                    // Translated title/aria-label
                    title="Avaa ratkaisu erillisessä ikkunassa" 
                    aria-label="Avaa ratkaisu erillisessä ikkunassa" 
                  >
                    <ExternalLink size={14} />
                  </button>
                <ChevronDown size={16} className="text-gray-500 group-open:rotate-180 transition-transform" />
              </div>
            </summary>
            <div className="p-4 border-t border-gray-200 bg-white max-h-60 overflow-y-auto"> 
              {solutionLoading && (
                <div className="flex justify-center items-center min-h-[50px]">
                  <Loader2 className="animate-spin h-5 w-5 text-indigo-600" />
                </div>
              )}
              {solutionError && ( 
                 // Translated error 
                 <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm" role="alert"><strong className="font-bold mr-1">Virhe:</strong> {solutionError}</div>
              )}
              {!solutionLoading && !solutionError && solution && (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {/* Translated fallback */}
                  {solution.content ? solution.content : <p className="italic text-gray-500">Ratkaisua ei löytynyt.</p>} 
                </div>
              )}
              {!solutionLoading && !solutionError && !solution && (
                 // Translated text 
                 <p className="italic text-gray-500 text-sm">Tähän tikettiin ei ole saatavilla ratkaisua.</p> 
               )}
            </div>
          </details>
        )}
        
        {/* Show a placeholder/message if the internal solution is hidden */}
        {hideInternalSolution && (
            // Translated text
            <div className="text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-md p-3 bg-gray-50">
                Ratkaisu näytetään erillisessä ikkunassa.
            </div>
        )}

      </div>
    </div>
  );
};

export default ConversationModal;
