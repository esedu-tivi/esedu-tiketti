import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ListFilter } from 'lucide-react'; // Import necessary icons

const FilterDialog = ({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  initialFilters, 
  filterOptions 
}) => {
  // Destructure options and initial filters
  const { categories = [], supportUsers = [] } = filterOptions || {};
  const { 
    category: initialCategory = 'all', 
    agent: initialAgentId = 'all', // Expecting agent ID or 'all'/'unassigned'
    status: initialStatus = 'all', 
    agentSearch: initialAgentSearch = '', 
    minInteractions: initialMinInteractions = '', // Add initial value for new filter
    startDate: initialStartDate = '', // Add initial date values
    endDate: initialEndDate = '' 
  } = initialFilters || {};

  // --- Default Filter Values --- 
  const defaultFilters = {
     category: 'all',
     agentId: 'all',
     status: 'all',
     agentSearch: '',
     minInteractions: '',
     startDate: '',
     endDate: ''
  };

  // Internal state for the dialog, initialized from props
  const [tempCategory, setTempCategory] = useState(initialCategory);
  const [tempAgentId, setTempAgentId] = useState(initialAgentId); // Store selected ID
  const [tempStatus, setTempStatus] = useState(initialStatus);
  const [tempAgentSearch, setTempAgentSearch] = useState(initialAgentSearch); // Input text
  const [tempMinInteractions, setTempMinInteractions] = useState(initialMinInteractions); // State for interaction filter
  const [tempStartDate, setTempStartDate] = useState(initialStartDate); // State for start date
  const [tempEndDate, setTempEndDate] = useState(initialEndDate);     // State for end date

  const [showAgentSuggestions, setShowAgentSuggestions] = useState(false);
  const agentInputRef = useRef(null); // Ref for input
  const suggestionsRef = useRef(null); // Ref for suggestions container

  // Reset internal state when initial filters change
  useEffect(() => {
    setTempCategory(initialCategory);
    setTempAgentId(initialAgentId);
    setTempStatus(initialStatus);
    // Initialize search text based on initial agent ID if not searching
    const initialAgentName = 
      initialAgentId === 'all' ? '' :
      initialAgentId === 'unassigned' ? 'Ei vastuuhenkilöä' :
      supportUsers.find(u => u.id === initialAgentId)?.name || ''; // Find name by ID
    setTempAgentSearch(initialAgentSearch || initialAgentName); // Prefer search term if exists
    
    setTempMinInteractions(initialMinInteractions);
    setTempStartDate(initialStartDate); // Reset dates
    setTempEndDate(initialEndDate);
    setShowAgentSuggestions(false); // Ensure suggestions are hidden initially
  }, [
    initialCategory, initialAgentId, initialStatus, initialAgentSearch, 
    initialMinInteractions, initialStartDate, initialEndDate, // Add date dependencies
    isOpen, supportUsers
  ]);

  if (!isOpen) {
    return null; // Don't render anything if not open
  }

  // Filter users for suggestions based on input text
  const agentSuggestions = supportUsers.filter(user => 
    user.name.toLowerCase().includes(tempAgentSearch.toLowerCase())
  );

  const handleApply = () => {
    let agentFilterToSend = {};
    if (tempAgentId && tempAgentId !== 'search_mode') { // Check if a specific ID was selected
      agentFilterToSend = { agent: tempAgentId, agentSearch: undefined };
    } else if (tempAgentSearch.trim()) { // If no ID selected, use search term
      agentFilterToSend = { agent: undefined, agentSearch: tempAgentSearch.trim() };
    } else { // Default to all if nothing selected/searched
       agentFilterToSend = { agent: 'all', agentSearch: undefined };
    }
    
    onApplyFilters({
      category: tempCategory,
      status: tempStatus,
      minInteractions: tempMinInteractions,
      startDate: tempStartDate, // Add dates to applied filters
      endDate: tempEndDate,
      ...agentFilterToSend // Spread the determined agent filters
    });
    onClose();
  };

  const handleAgentSuggestionClick = (id, name) => {
    setTempAgentId(id); // Set the selected ID
    setTempAgentSearch(name); // Update input text to reflect selection
    setShowAgentSuggestions(false);
  };

  const handleAgentSearchChange = (e) => {
    setTempAgentSearch(e.target.value);
    setTempAgentId(null); // Clear specific ID selection when user types
    setShowAgentSuggestions(true); // Show suggestions while typing
  };

  const handleAgentInputFocus = () => {
    setShowAgentSuggestions(true);
  };

  // Hide suggestions on blur unless clicking on the suggestion list itself
  const handleAgentInputBlur = (e) => {
     // Use setTimeout to allow click event on suggestions to fire first
    setTimeout(() => {
       if (suggestionsRef.current && !suggestionsRef.current.contains(document.activeElement)) {
         setShowAgentSuggestions(false);
       }
    }, 100); // Small delay
  };

  // --- Clear Filters Handler --- 
  const handleClearFilters = () => {
     // Reset temp state to defaults
     setTempCategory(defaultFilters.category);
     setTempAgentId(defaultFilters.agentId);
     setTempStatus(defaultFilters.status);
     setTempAgentSearch(defaultFilters.agentSearch);
     setTempMinInteractions(defaultFilters.minInteractions);
     setTempStartDate(defaultFilters.startDate);
     setTempEndDate(defaultFilters.endDate);
     setShowAgentSuggestions(false);

     // Apply the cleared filters immediately
     onApplyFilters({
        category: defaultFilters.category,
        agent: defaultFilters.agentId, // Use the agent ID default
        status: defaultFilters.status,
        agentSearch: defaultFilters.agentSearch,
        minInteractions: defaultFilters.minInteractions,
        startDate: defaultFilters.startDate,
        endDate: defaultFilters.endDate,
     });
     onClose(); // Close the dialog
  };

  return (
    // Basic Modal Structure using Tailwind
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" 
      onClick={onClose} // Close on overlay click
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-6" // Increased max-width slightly
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside dialog
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Suodattimet</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
            title="Sulje"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Controls - Use Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4"> {/* Changed to 3 columns */}
          {/* Category Filter */}
          <div>
            <label htmlFor="dialog-filter-category" className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
            <select 
              id="dialog-filter-category" 
              value={tempCategory}
              onChange={(e) => setTempCategory(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="all">Kaikki kategoriat</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Agent Filter (Autocomplete) */}
          <div className="relative"> {/* Relative positioning for suggestions */}
            <label htmlFor="dialog-agent-search" className="block text-sm font-medium text-gray-700 mb-1">Vastuuhenkilö</label>
            <input 
              id="dialog-agent-search"
              ref={agentInputRef}
              type="text"
              placeholder="Hae tai valitse..."
              value={tempAgentSearch}
              onChange={handleAgentSearchChange}
              onFocus={handleAgentInputFocus}
              onBlur={handleAgentInputBlur}
              className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
              autoComplete="off" // Prevent browser autocomplete
            />
            {/* Suggestions List */} 
            {showAgentSuggestions && (
              <ul 
                ref={suggestionsRef}
                className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto"
              >
                {/* Static Options */} 
                <li 
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur before click registers
                  onClick={() => handleAgentSuggestionClick('all', 'Kaikki tukihenkilöt')}
                >
                  Kaikki tukihenkilöt
                </li>
                <li 
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer"
                  onMouseDown={(e) => e.preventDefault()} 
                  onClick={() => handleAgentSuggestionClick('unassigned', 'Ei vastuuhenkilöä')}
                >
                  Ei vastuuhenkilöä
                </li>
                {/* Divider */}
                <li className="border-t border-gray-200 my-1"></li>
                
                {/* Dynamic User Suggestions */} 
                {agentSuggestions.length > 0 ? (
                  agentSuggestions.map(user => (
                    <li 
                      key={user.id}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 cursor-pointer"
                      onMouseDown={(e) => e.preventDefault()} 
                      onClick={() => handleAgentSuggestionClick(user.id, user.name)}
                    >
                      {user.name}
                    </li>
                  ))
                ) : (
                  tempAgentSearch && <li className="px-4 py-2 text-sm text-gray-500 italic">Ei hakutuloksia</li>
                )}
              </ul>
            )}
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="dialog-filter-status" className="block text-sm font-medium text-gray-700 mb-1">Tila</label>
            <select 
              id="dialog-filter-status" 
              value={tempStatus}
              onChange={(e) => setTempStatus(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            >
              <option value="all">Kaikki tilat</option>
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => ( // Assuming statuses are hardcoded here too
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          {/* AI Interactions Filter */}
          <div>
            <label htmlFor="dialog-filter-interactions" className="block text-sm font-medium text-gray-700 mb-1">AI Interaktiot (väh.)</label>
            <input 
              id="dialog-filter-interactions"
              type="number"
              min="0"
              placeholder="0"
              value={tempMinInteractions}
              onChange={(e) => setTempMinInteractions(e.target.value)}
              className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
            />
          </div>
          
          {/* Start Date Filter */} 
          <div>
             <label htmlFor="dialog-filter-start-date" className="block text-sm font-medium text-gray-700 mb-1">Luotu Alkaen</label>
             <input 
               id="dialog-filter-start-date"
               type="date"
               value={tempStartDate}
               onChange={(e) => setTempStartDate(e.target.value)}
               className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
               // Set max date to end date if end date is selected
               max={tempEndDate || undefined}
             />
          </div>
          
          {/* End Date Filter */} 
          <div>
             <label htmlFor="dialog-filter-end-date" className="block text-sm font-medium text-gray-700 mb-1">Luotu Päättyen</label>
             <input 
               id="dialog-filter-end-date"
               type="date"
               value={tempEndDate}
               onChange={(e) => setTempEndDate(e.target.value)}
               className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
               // Set min date to start date if start date is selected
               min={tempStartDate || undefined}
             />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between pt-6 border-t mt-6"> {/* Changed to justify-between */} 
          {/* Clear Button on the left */}
          <button 
            onClick={handleClearFilters} 
            className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 border border-transparent rounded-md shadow-sm hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Tyhjennä suodattimet
          </button>
          
          {/* Cancel and Apply on the right */} 
          <div>
             <button 
               onClick={onClose} 
               className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             >
               Peruuta
             </button>
             <button 
               onClick={handleApply} 
               className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
             >
               Käytä suodattimia
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterDialog; 