import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios'; // Use axios
import { format } from 'date-fns';
import { authService } from '../../services/authService'; // Import authService
import { useUsers } from '../../hooks/useUsers';
import { useCategories } from '../../hooks/useCategories';
import { Loader2, AlertCircle, Table, List, MessageSquare, Calendar, User, Tag, Hash, Eye, ExternalLink, Filter, ListFilter, ArrowUpDown, ArrowUp, ArrowDown, Search, PieChart, CheckCircle, RefreshCw } from 'lucide-react'; // Import Lucide icons
import { debounce } from 'lodash'; // Import debounce
import FilterDialog from './FilterDialog'; // Import the new dialog
import PaginationControls from './PaginationControls'; // Import pagination controls

// Helper component for displaying a single statistic
const StatCard = ({ title, value, icon }) => (
  <div className="bg-gray-100 p-4 rounded-lg flex items-center">
    {icon && <div className="mr-3 text-indigo-600">{icon}</div>}
    <div>
      <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
      <dd className="mt-1 text-2xl font-semibold text-gray-900">{value}</dd>
    </div>
  </div>
);

// Receive ONLY onViewConversation prop from parent (AITools)
const AiTicketAnalysis = ({ onViewConversation, onOpenTicketDetails }) => { 
  const [tickets, setTickets] = useState([]);
  const [aggregates, setAggregates] = useState(null); // State for aggregates
  const [pagination, setPagination] = useState(null); // State for pagination data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Use centralized hooks for data
  const { data: categoriesData } = useCategories();
  const { data: usersData } = useUsers();
  
  // Keep state for filter options
  const categories = categoriesData?.categories || categoriesData?.data || [];
  const supportUsers = (usersData || []).filter(user => user.role === 'SUPPORT' || user.role === 'ADMIN');
  const [statuses] = useState(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

  // Consolidated state for applied filters
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    agent: 'all', // Represents selected agent ID or 'all'/'unassigned'
    status: 'all',
    agentSearch: '', // Represents the search term if agent ID is not set
    minInteractions: '', 
    startDate: '', // Add date defaults
    endDate: ''
  });
  
  // Sorting state
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');

  // State for dialog visibility
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // State for current page and pagination metadata
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25); // Or make this configurable

  // Function to fetch tickets, aggregates, and pagination data
  const fetchFilteredTickets = useCallback(debounce(async () => {
    // Don't reset page on loading, only on filter/sort change implicitly
    setLoading(true);
    setError(null);
    setAggregates(null); 
    setPagination(null); // Clear pagination data
    try {
      const token = await authService.acquireToken();
      const params = {
        category: activeFilters.category === 'all' ? undefined : activeFilters.category,
        // Use agent ID if set and not 'all', otherwise use search term if it exists
        agent: activeFilters.agent && activeFilters.agent !== 'all' ? activeFilters.agent : undefined,
        agentSearch: !activeFilters.agent && activeFilters.agentSearch?.trim() ? activeFilters.agentSearch.trim() : undefined,
        status: activeFilters.status === 'all' ? undefined : activeFilters.status,
        minInteractions: activeFilters.minInteractions ? parseInt(activeFilters.minInteractions, 10) : undefined,
        startDate: activeFilters.startDate || undefined, // Pass dates if they exist
        endDate: activeFilters.endDate || undefined,
        sortBy: sortBy,
        sortDir: sortDirection,
        page: currentPage, // Pass current page
        pageSize: pageSize // Pass page size
      };
      
      // Remove undefined/invalid params (logic remains similar)
      Object.keys(params).forEach(key => {
        if (params[key] === undefined || 
           (key === 'minInteractions' && (isNaN(params[key]) || params[key] < 0)) ||
           (key === 'agentSearch' && params[key] === '') ||
           (key === 'startDate' && params[key] === '') || // Remove empty dates
           (key === 'endDate' && params[key] === ''))
        {
          delete params[key];
        }
      });

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/ai/analysis/tickets`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: params 
        }
      );
      // Expect response like { data: { tickets: [], aggregates: {}, pagination: {} } }
      const responseData = response.data.data || response.data;
      setTickets(responseData.tickets || responseData || []);
      setAggregates(responseData.aggregates || null);
      setPagination(responseData.pagination || null);

    } catch (err) {
      console.error('Error fetching filtered AI analysis data:', err);
      setError(err.response?.data?.message || 'Failed to fetch filtered data.');
      setTickets([]); // Clear tickets on error
      setAggregates(null); // Clear aggregates on error
      setPagination(null); // Clear pagination on error too
    } finally {
      setLoading(false);
    }
  }, 300), [activeFilters, sortBy, sortDirection, currentPage, pageSize]); // Add page dependencies

  // Initial data fetch (tickets only, options come from hooks)
  useEffect(() => {
    // Fetch initial tickets using the debounced function with default filters
    fetchFilteredTickets();
    return () => fetchFilteredTickets.cancel(); // Cleanup debounce
  }, []); // Run only once on mount

  // useEffect to refetch when page changes (or filters/sort change)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      fetchFilteredTickets();
    }
  }, [fetchFilteredTickets]); // Depends on the memoized fetch function

  // Handler to apply filters from the dialog - RESETS page to 1
  const handleApplyFilters = (newFilters) => {
    setActiveFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    // The state change (activeFilters) triggers the useEffect above
  };

  // Handler for sorting changes - RESETS page to 1
  const handleSortChange = (newSortBy) => {
    setCurrentPage(1); // Reset to first page when sorting changes
    if (sortBy === newSortBy) {
      setSortDirection(prevDirection => prevDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
    // State changes (sortBy, sortDirection) trigger the useEffect above
  };

  // Handler for pagination control clicks
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // State change (currentPage) triggers the useEffect above
  };

  // Helper to get appropriate sort icon
  const getSortIcon = (columnField) => {
    if (sortBy !== columnField) {
      return <ArrowUpDown size={14} className="ml-1 opacity-40" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp size={14} className="ml-1" />;
    }
    return <ArrowDown size={14} className="ml-1" />;
  };

  // Map display header to backend sort field name
  const sortableColumns = {
    'Otsikko': 'title',
    'Kategoria': 'category',
    'Vastuuhenkilö': 'assignedAgent',
    'Luotu': 'createdAt',
    'Tila': 'status',
    'AI Interaktiot': 'aiInteractionCount'
    // Add 'Tiketti ID': 'id' if needed, though sorting by full ID might not be useful
  };

  // Calculate percentage for status distribution (example)
  const calculatePercentage = (count, total) => {
      if (!total) return '0%';
      return `${((count / total) * 100).toFixed(0)}%`;
  };

  if (loading && tickets.length === 0) { // Show loading only on initial load
      return (
        <div className="flex justify-center items-center min-h-[200px]">
            <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
        </div>
      );
  }
  
  // Keep rendering error if it exists
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold mr-2">Virhe:</strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white shadow border border-gray-200 rounded-lg overflow-hidden relative flex flex-col"> {/* Flex column layout */}
      {/* Header with Title and Filter Button */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">AI-generoitujen tikettien analyysi</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => fetchFilteredTickets()}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            title="Päivitä tiedot"
          >
            <RefreshCw size={16} className={`-ml-1 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Päivitä
          </button>
          <button 
            onClick={() => setIsFilterDialogOpen(true)}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-5 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Filter size={16} className="-ml-1 mr-2" />
            Suodattimet
          </button>
        </div>
      </div>
      
      {/* --- Aggregate Statistics Section --- */}
      {aggregates && !loading && (
         <div className="p-4 border-b border-gray-200 bg-gray-50/50">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-3">Yhteenveto</h3>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                 title="Tikettejä yhteensä" 
                 value={aggregates.totalCount ?? '-'} 
                 icon={<Hash size={24}/>} 
              />
              <StatCard 
                 title="Keskim. AI Interaktiot" 
                 value={aggregates.averageInteractions ?? '-'} 
                 icon={<MessageSquare size={24}/>} 
              />
              {/* Status Distribution - Example showing OPEN */}
              <StatCard 
                 title="Avoimet tiketit" 
                 value={`${aggregates.statusCounts?.OPEN ?? 0} (${calculatePercentage(aggregates.statusCounts?.OPEN, aggregates.totalCount)})`} 
                 icon={<List size={24}/>} 
              />
              {/* You could add more StatCards for other statuses or create a small pie chart component */}
              <StatCard 
                 title="Ratkaistut tiketit" 
                 value={`${aggregates.statusCounts?.RESOLVED ?? 0} (${calculatePercentage(aggregates.statusCounts?.RESOLVED, aggregates.totalCount)})`} 
                 icon={<CheckCircle size={24}/>} // Assuming CheckCircle is imported
              />

            </dl>
         </div>
      )}
      
      {/* Table Section Wrapper (for scrolling and loading overlay) */} 
      <div className="flex-grow overflow-y-auto"> {/* Allow table area to scroll */} 
        <div className="p-4 min-h-[200px] relative"> {/* Added relative for potential overlay */} 
           {loading && (
               <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                   <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
               </div>
           )}
           {!loading && error && (
                <div className="text-center text-red-600">{/* Error display */}</div>
           )}
           {!loading && !error && (
             <div className={`overflow-x-auto ${loading ? 'opacity-50' : ''}`}> 
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiketti ID</th>
                     {Object.entries(sortableColumns).map(([header, field]) => (
                       <th 
                         key={field}
                         scope="col" 
                         className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" 
                         onClick={() => handleSortChange(field)}
                       >
                         <div className="flex items-center">
                           {header}
                           {getSortIcon(field)}
                         </div>
                       </th>
                     ))}
                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toiminnot</th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {/* Display message if filters result in no tickets */}
                   {!loading && tickets.length === 0 && (
                       <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-500">Ei hakuehtoja vastaavia tikettejä.</td></tr>
                   )}
                   {tickets.map((ticket) => (
                     <tr key={ticket.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id.substring(0, 8)}...</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ticket.title}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ticket.category}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{ticket.assignedAgent}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                         {format(new Date(ticket.createdAt), 'yyyy-MM-dd HH:mm')}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm">
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ 
                           ticket.status === 'OPEN' ? 'bg-blue-100 text-blue-800' : 
                           ticket.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' : 
                           ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : 
                           ticket.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800' 
                         }`}>
                           {ticket.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{ticket.aiInteractionCount}</td>
                       <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2"> 
                         <button
                           onClick={() => onViewConversation(ticket.id)} 
                           className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md p-1 inline-flex items-center text-xs transition-colors duration-150"
                           title="Näytä keskustelu & ratkaisu"
                         >
                           <Eye size={16} />
                         </button>
                         <button
                           onClick={() => onOpenTicketDetails(ticket.id)} 
                           className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md p-1 inline-flex items-center text-xs transition-colors duration-150"
                           title="Avaa tiketin tiedot"
                         >
                           <ExternalLink size={16} /> 
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>
      
      {/* Pagination Controls - Render below table area */} 
      {!loading && !error && tickets.length > 0 && (
          <PaginationControls pagination={pagination} onPageChange={handlePageChange} />
      )}

      {/* Filter Dialog */} 
      <FilterDialog 
         isOpen={isFilterDialogOpen}
         onClose={() => setIsFilterDialogOpen(false)}
         onApplyFilters={handleApplyFilters}
         initialFilters={activeFilters} // Pass current active filters
         filterOptions={{ categories, supportUsers }} 
      />
    </div>
  );
};

export default AiTicketAnalysis;