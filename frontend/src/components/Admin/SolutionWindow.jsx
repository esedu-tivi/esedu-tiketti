import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { authService } from '../../services/authService';
import { Loader2, AlertCircle, X, BookOpen, Maximize, Minimize } from 'lucide-react';

// Simple window-like component for displaying the solution
const SolutionWindow = ({ open, onClose, ticketId }) => {
  const [solution, setSolution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false); // Optional: state for maximizing
  const windowRef = useRef(null);

  useEffect(() => {
    if (open && ticketId) {
      const fetchSolution = async () => {
        setLoading(true);
        setError(null);
        setSolution(null);
        try {
          const token = await authService.acquireToken();
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL}/ai/tickets/${ticketId}/solution`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setSolution(response.data.solution);
        } catch (err) {
          console.error(`Error fetching solution for ticket ${ticketId}:`, err);
          setError(err.response?.data?.message || 'Failed to fetch solution.');
        } finally {
          setLoading(false);
        }
      };
      fetchSolution();
    } else {
      // Reset when closed or no ticketId
      setSolution(null);
      setError(null);
      setLoading(false);
    }
  }, [open, ticketId]);

  // Handle Escape key press to close
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);


  if (!open) return null; // Don't render if not open

  // Responsive window width
  const windowClasses = `
    relative 
    w-11/12 // Wider on smallest screens
    md:w-3/4 // Good width on medium
    lg:w-[48%] // Side-by-side on large
    max-w-2xl 
    max-h-[70vh] // Keep max height 
    bg-white rounded-lg shadow-xl border border-gray-300 
    flex flex-col overflow-hidden
    transform transition-all duration-200 ease-out 
    ${open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
    ${isMaximized ? 'absolute inset-4 w-auto max-w-none max-h-none z-50' : ''} 
  `;

  return (
    <div ref={windowRef} className={windowClasses} onClick={e => e.stopPropagation()}> {/* Prevent backdrop click closing */} 
      {/* Window Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 cursor-move">
        <div className="flex items-center">
           <BookOpen size={16} className="mr-2 text-gray-500"/>
           <h4 className="text-sm font-semibold text-gray-700">
             Ratkaisu (Tiketti: {ticketId ? ticketId.substring(0, 8) + '...' : ''})
           </h4>
        </div>
        <div className="flex items-center space-x-1">
           {/* Optional Maximize Button 
           <button 
             onClick={() => setIsMaximized(!isMaximized)}
             className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200"
             aria-label={isMaximized ? "Restore" : "Maximize"}
           >
             {isMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
           </button>
           */}
           <button 
             onClick={onClose} 
             className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-100"
             aria-label="Sulje"
           >
             <X size={16} />
           </button>
        </div>
      </div>

      {/* Window Body - Scrollable */} 
      <div className="p-4 overflow-y-auto flex-grow">
         {loading && (
           <div className="flex justify-center items-center h-full">
             <Loader2 className="animate-spin h-6 w-6 text-indigo-600" />
           </div>
         )}
         {error && (
           <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm" role="alert">
             <strong className="font-bold mr-1">Virhe:</strong> {error}
           </div>
         )}
         {!loading && !error && solution && (
           <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
             {solution.content ? solution.content : <p className="italic text-gray-500">Ratkaisua ei löytynyt.</p>} 
           </div>
         )}
         {!loading && !error && !solution && (
           <p className="italic text-gray-500 text-sm text-center">Tähän tikettiin ei ole saatavilla ratkaisua.</p>
         )}
      </div>
    </div>
  );
};

export default SolutionWindow; 