import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Use axios
import { format } from 'date-fns';
import { authService } from '../../services/authService'; // Import authService
import { Loader2, AlertCircle, Table, List, MessageSquare, Calendar, User, Tag, Hash, Eye } from 'lucide-react'; // Import Lucide icons

// Receive ONLY onViewConversation prop from parent (AITools)
const AiTicketAnalysis = ({ onViewConversation }) => { 
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAiTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await authService.acquireToken(); // Get token
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/ai/analysis/tickets`, // Use axios and env var
          {
            headers: { Authorization: `Bearer ${token}` } // Add auth header
          }
        );
        setTickets(response.data);
      } catch (err) {
        console.error('Error fetching AI analysis tickets:', err);
        setError(
          err.response?.data?.message ||
            'Failed to fetch AI analysis tickets. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAiTickets();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold mr-2">Virhe:</strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="bg-white shadow border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">AI-generoitujen tikettien analyysi</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiketti ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Otsikko</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategoria</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vastuuhenkilö</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Luotu</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tila</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">AI Interaktiot</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Toiminnot</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickets.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  AI-generoituja tikettejä ei löytynyt.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
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
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium"> 
                    <button
                      onClick={() => onViewConversation(ticket.id)} 
                      className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-md p-1 inline-flex items-center text-xs transition-colors duration-150"
                      title="Näytä keskustelu & ratkaisu"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AiTicketAnalysis;