import React, { useState } from 'react';
import axios from 'axios';
import { authService } from '../../services/authService';
import { Sparkles, Send, Loader2, Bot, HelpCircle, X, RefreshCcw } from 'lucide-react';
import { Button } from '../ui/Button';

/**
 * Support Assistant component that provides AI-powered help for support personnel
 * working on tickets. It allows support users to ask questions about the current ticket
 * and get AI-generated answers to help resolve the ticket.
 */
export default function SupportAssistant({ ticket, user }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Ask a question to the Support Assistant
   */
  const handleSendQuestion = async () => {
    if (!question.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await authService.acquireToken();
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/tickets/${ticket.id}/support-assistant`,
        { 
          supportQuestion: question,
          supportUserId: user.id
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setResponse(response.data.response);
      // Keep the question visible
    } catch (err) {
      console.error('Error getting assistant response:', err);
      setError(
        err.response?.data?.error || 
        'Avustajan vastausta ei voitu hakea. Yritä myöhemmin uudelleen.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear the assistant conversation
   */
  const handleClearConversation = () => {
    setQuestion('');
    setResponse('');
    setError(null);
  };

  if (!isExpanded) {
    return (
      <div className="mt-2">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200 flex items-center gap-2"
        >
          <Bot className="h-4 w-4" />
          <span>Avaa tukiavustaja</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 border rounded-lg shadow-sm bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4" />
          <h3 className="font-medium">Tukiavustaja</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsExpanded(false)}
          className="text-white opacity-80 hover:opacity-100 hover:bg-white/10 rounded-full w-7 h-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Body */}
      <div className="p-4">
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            <p className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4" />
              <span>{error}</span>
            </p>
          </div>
        )}
        
        {/* Question input */}
        <div className="mb-4">
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
            Kysy avustajalta tikettiin liittyvä kysymys:
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendQuestion()}
              placeholder="Miten voisin ratkaista tämän ongelman?"
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendQuestion}
              disabled={!question.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Lähetä</span>
            </Button>
          </div>
        </div>
        
        {/* Response display */}
        {response && (
          <div className="mb-2">
            <div className="bg-purple-50 border border-purple-100 rounded-md p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 rounded-full p-1.5 mt-0.5">
                  <Bot className="h-4 w-4 text-purple-700" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-purple-900 mb-1">Tukiavustajan vastaus:</h4>
                  <div 
                    className="text-sm text-gray-800 prose-sm prose"
                    dangerouslySetInnerHTML={{ 
                      __html: response.replace(/\n/g, '<br />') 
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearConversation}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                <span className="text-xs">Tyhjennä</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 