import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { authService } from '../../services/authService';
import { aiAnalyticsService } from '../../services/aiAnalyticsService';
import { supportAssistantService } from '../../services/supportAssistantService';
import { 
  Sparkles, Send, Loader2, Bot, X, MessageSquare, 
  Copy, Check, ThumbsUp, ThumbsDown, MoreHorizontal, 
  RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import ProfilePicture from '../User/ProfilePicture';
import toast from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Enterprise-grade chat message component with rich formatting and interactions
 */
const ChatMessage = ({ message, onCopy, onFeedback, feedbackStatus }) => {
  const isUser = message.sender === 'user';
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  // Initialize feedback state from props if available
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(Boolean(feedbackStatus));
  const [feedbackType, setFeedbackType] = useState(feedbackStatus?.type || null);
  
  // Update feedback state when feedbackStatus changes
  useEffect(() => {
    if (feedbackStatus) {
      setFeedbackSubmitted(true);
      setFeedbackType(feedbackStatus.type);
    }
  }, [feedbackStatus]);
  
  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle feedback submission
  const handleFeedback = (type) => {
    if (feedbackSubmitted) return; // Prevent multiple submissions
    
    setFeedbackSubmitted(true);
    setFeedbackType(type);
    onFeedback?.(message, type);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mb-4"
    >
      {/* Message container with sender info */}
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 ${isUser ? 'ml-2' : 'mr-2'} mb-1`}>
            {isUser && message.user ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
                <ProfilePicture 
                  email={message.user.email || message.user.username}
                  name={message.user.name || message.user.email || message.user.username}
                  size={36} 
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-md">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}
          </div>
          
          {/* Message content */}
          <div 
            className={`relative px-4 py-3 rounded-2xl shadow-sm max-w-full ${
              isUser 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}
            onMouseEnter={() => !isUser && setShowActions(true)}
            onMouseLeave={() => !isUser && setShowActions(false)}
            style={{
              boxShadow: isUser 
                ? '0 2px 5px rgba(37, 99, 235, 0.1)' 
                : '0 2px 5px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div 
              className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:bg-gray-100 prose-pre:text-xs prose-pre:p-2 prose-pre:rounded prose-code:text-xs prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-blockquote:border-l-2 prose-blockquote:border-gray-300 prose-blockquote:pl-2 prose-blockquote:my-1 leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: message.text
                  .replace(/\n/g, '<br />')
                  .replace(/`([^`]+)`/g, '<code>$1</code>')
                  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*([^*]+)\*/g, '<em>$1</em>')
              }}
            />
            
            {/* Timestamp */}
            <div className={`text-[10px] ${isUser ? 'text-blue-200' : 'text-gray-400'} mt-1 text-right font-light`}>
              {message.timestamp || new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute: '2-digit'})}
            </div>
            
            {/* Message Actions - For AI messages only */}
            {!isUser && (
              <AnimatePresence>
                {showActions && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -bottom-8 left-2 flex items-center space-x-1 bg-white shadow-md rounded-full border border-gray-200 p-1 z-10"
                  >
                    <Tooltip content={copied ? "Kopioitu!" : "Kopioi vastaus"}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleCopy}
                        className="h-6 w-6 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-600" />}
                      </Button>
                    </Tooltip>
                    
                    <Tooltip content={feedbackSubmitted && feedbackType === 'positive' ? "Palautetta annettu" : "Hyvä vastaus"}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleFeedback('positive')}
                        disabled={feedbackSubmitted}
                        className={`h-6 w-6 rounded-full ${
                          feedbackSubmitted 
                            ? feedbackType === 'positive' 
                              ? 'bg-green-100' 
                              : 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-100'
                        } transition-colors`}
                      >
                        <ThumbsUp className={`h-3 w-3 ${
                          feedbackSubmitted && feedbackType === 'positive' 
                            ? 'text-green-600' 
                            : 'text-gray-600'
                        }`} />
                      </Button>
                    </Tooltip>
                    
                    <Tooltip content={feedbackSubmitted && feedbackType === 'negative' ? "Palautetta annettu" : "Huono vastaus"}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleFeedback('negative')}
                        disabled={feedbackSubmitted}
                        className={`h-6 w-6 rounded-full ${
                          feedbackSubmitted 
                            ? feedbackType === 'negative' 
                              ? 'bg-red-100' 
                              : 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-100'
                        } transition-colors`}
                      >
                        <ThumbsDown className={`h-3 w-3 ${
                          feedbackSubmitted && feedbackType === 'negative' 
                            ? 'text-red-600' 
                            : 'text-gray-600'
                        }`} />
                      </Button>
                    </Tooltip>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
            
            {/* Feedback Indicator - Show even when not hovering */}
            {!isUser && feedbackSubmitted && (
              <div className="absolute -right-2 -top-2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border border-white">
                {feedbackType === 'positive' ? (
                  <div className="bg-green-500 rounded-full w-full h-full flex items-center justify-center">
                    <ThumbsUp className="h-2.5 w-2.5 text-white" />
                  </div>
                ) : (
                  <div className="bg-red-500 rounded-full w-full h-full flex items-center justify-center">
                    <ThumbsDown className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Advanced AI Support Assistant Chat interface.
 * Enterprise-grade implementation with enhanced UX, animations and features.
 */
export default function SupportAssistantChat({ ticket, user, onClose }) {
  const [conversation, setConversation] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "Miten tämä ongelma voidaan ratkaista?",
    "Tarvitsenko lisätietoja asiakkaalta?",
    "Onko tähän valmiita ratkaisumalleja?",
    "Mitä vaihtoehtoja minulla on?"
  ]);
  
  // New state to keep track of message feedback
  const [messageFeedback, setMessageFeedback] = useState({});
  
  // New state to keep track of the current interaction
  const [currentInteraction, setCurrentInteraction] = useState(null);
  
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const textAreaRef = useRef(null);
  
  // Function to auto-resize textarea based on content
  const autoResizeTextarea = useCallback(() => {
    if (textAreaRef.current) {
      // Reset height to get accurate scrollHeight
      textAreaRef.current.style.height = 'auto';
      
      // Calculate new height (clamp between 40px and 120px)
      const newHeight = Math.min(120, Math.max(40, textAreaRef.current.scrollHeight));
      
      // Set the new height
      textAreaRef.current.style.height = newHeight + 'px';
      
      // Add scrollbars if content exceeds max height
      if (textAreaRef.current.scrollHeight > 120) {
        textAreaRef.current.style.overflowY = 'auto';
      } else {
        textAreaRef.current.style.overflowY = 'hidden';
      }
    }
  }, []);
  
  // Auto-scroll to bottom when conversation updates
  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      // Find the closest scrollable container instead of scrolling the entire page
      const scrollContainer = chatEndRef.current.closest('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
      // Don't use scrollIntoView as it affects the entire page
      // chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  // Auto-resize on input change
  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);
  
  // Scroll to bottom when conversation updates or loading changes
  useEffect(() => {
    scrollToBottom();
  }, [conversation, isLoading, scrollToBottom]);
  
  // Focus input when chat opens
  useEffect(() => {
    if (!isMinimized) {
      textAreaRef.current?.focus();
    }
  }, [isMinimized]);
  
  // Simulate typing indicator before AI response
  useEffect(() => {
    if (isLoading) {
      setTypingIndicator(true);
    } else {
      // Delay hiding the indicator a bit for natural feel
      const timer = setTimeout(() => setTypingIndicator(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);
  
  // Add useEffect to load conversation history on component mount
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!ticket || !user) return;
      
      try {
        setIsInitialLoading(true);
        
        // Fetch conversation history from server
        const response = await supportAssistantService.getConversationHistory(ticket.id, user.id);
        
        if (response.success && response.hasHistory && response.history) {
          // Parse the conversation history into individual messages
          const messages = parseConversationHistory(response.history);
          setConversation(messages);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
        // Don't show error to user, just start with an empty conversation
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadConversationHistory();
    
    // The dependency array only includes user.id and ticket.id to prevent reloading
    // when other properties of the ticket change (like comments being added)
  }, [user?.id, ticket?.id]);
  
  // Helper function to parse conversation history into message objects
  const parseConversationHistory = (history) => {
    const messages = [];
    if (!history || history.trim() === '') {
      return messages;
    }

    // console.log("SupportAssistantChat: Raw conversation history from database:", JSON.stringify(history));

    // Regex to find each message block.
    // A message block starts with: [timestamp] (Student:|Assistant:) actual_message_text
    // The message text can be multi-line.
    // The positive lookahead (?= ... |$) ensures that the message text capture ([\s\S]*?)
    // stops correctly before the next message block or the end of the string.
    // The \s*\n\n\[.*\] part correctly identifies the delimiter plus the start of the next timestamp.
    const messageBlockPattern = /\[(.*?)\] (Student:|Assistant:)\s*([\s\S]*?)(?=\s*\n\n\[.*\] (?:Student:|Assistant:)|$)/g;

    let match;
    while ((match = messageBlockPattern.exec(history)) !== null) {
      const timestampStr = match[1].trim();
      const senderTypePrefix = match[2]; // "Student:" or "Assistant:"
      let text = match[3].trim();       // The actual message content

      const timestamp = getTimeFromTimestamp(timestampStr);

      if (senderTypePrefix === 'Student:') {
        messages.push({
          sender: 'user',
          text: text,
          timestamp: timestamp,
          user: {
            ...user, // user is from component props
            id: user.id,
            email: user.email || user.username,
            name: user.name || user.displayName || user.email || user.username,
          },
        });
      } else if (senderTypePrefix === 'Assistant:') {
        messages.push({
          sender: 'ai',
          text: text,
          timestamp: timestamp,
        });
      }
    }

    // console.log("SupportAssistantChat: Parsed messages (" + messages.length + "):", JSON.stringify(messages, null, 2));
    return messages;
  };
  
  // Helper function to extract time from timestamp
  const getTimeFromTimestamp = (timestampString) => {
    const dateObj = new Date(timestampString);
  
    // Check if the date object is valid and was successfully parsed
    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' });
    } else {
      // new Date() failed to parse it into a valid date object.
      // Try to extract time like HH:mm or H:mm using a regular expression.
      // This regex looks for patterns like "H:MM" or "HH:MM" or "H.MM" or "HH.MM",
      // possibly followed by seconds, common in fi-FI locale strings.
      const timeMatch = timestampString.match(/(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?/);
      
      if (timeMatch && timeMatch[1] && timeMatch[2]) {
        const hour = timeMatch[1].padStart(2, '0');
        const minute = timeMatch[2]; // The regex \d{2} ensures minute is two digits
        return `${hour}:${minute}`;
      } else {
        // If regex extraction also fails, return an empty string.
        // This will cause the ChatMessage component to use its own fallback (current time),
        // which is preferable to displaying "Invalid Date".
        return ''; 
      }
    }
  };
  
  /**
   * Send user message and get AI response with enhanced error handling.
   */
  const handleSendMessage = async (messageText = input.trim()) => {
    if (!messageText || isLoading) return;

    // Make sure we have the email and name properly set for the profile picture
    const userMessage = { 
      sender: 'user', 
      text: messageText, 
      user: {
        ...user,
        id: user.id,
        email: user.email || user.username,
        name: user.name || user.displayName || user.email || user.username
      }, 
      timestamp: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute: '2-digit'})
    };
    
    // Add the user message to the conversation immediately
    setConversation(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    
    // Track request start time for response time calculation
    const requestStartTime = performance.now();

    try {
      // Use the service instead of direct axios call
      const response = await supportAssistantService.sendMessage(
        ticket.id,
        messageText,
        user.id
      );
      
      // Calculate response time in seconds
      const responseTime = (performance.now() - requestStartTime) / 1000;
      
      const aiMessage = { 
        sender: 'ai', 
        text: response.response,
        timestamp: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute: '2-digit'})
      };
      
      // Add the AI message to the conversation
      setConversation(prev => [...prev, aiMessage]);
      
      // Check if backend already tracked the interaction (via interactionId)
      if (response.interactionId) {
        console.log('Interaction tracked by backend, ID:', response.interactionId);
        setCurrentInteractionId(response.interactionId);
      } else {
        // Backend didn't track it, so track manually with the frontend service
        try {
          const analyticsData = {
            ticketId: ticket.id,
            userId: user.id,
            query: messageText,
            response: response.response,
            responseTime: responseTime
          };
          
          console.log('Tracking AI interaction via frontend:', analyticsData);
          const interactionResponse = await aiAnalyticsService.trackInteraction(analyticsData);
          
          if (interactionResponse && interactionResponse.id) {
            setCurrentInteractionId(interactionResponse.id);
          }
        } catch (analyticsError) {
          console.error('Error tracking interaction analytics:', analyticsError);
          // Non-blocking error - don't show to user since the main functionality worked
        }
      }

    } catch (err) {
      console.error('Error getting assistant response:', err);
      const errorText = err.response?.data?.details || 
                       err.response?.data?.error || 
                       'Avustajan vastausta ei voitu hakea. Yritä uudestaan.';
      
      const errorMessage = { 
        sender: 'system_error', 
        text: errorText,
        timestamp: new Date().toLocaleTimeString('fi-FI', {hour: '2-digit', minute: '2-digit'})
      };
      
      setError(errorText);
      setConversation(prev => [...prev, errorMessage]);
      
      toast.error('Avustajan vastauksen hakeminen epäonnistui', {
        duration: 4000
      });
    } finally {
      setIsLoading(false);
      textAreaRef.current?.focus();
    }
  };
  
  /**
   * Handle message feedback collection
   */
  const handleFeedback = async (message, feedbackType) => {
    // Only process feedback for AI messages and if we have a current interaction ID
    if (message.sender !== 'ai') {
      return;
    }
    
    try {
      if (!currentInteractionId) {
        toast.error('Palautteen antaminen ei onnistu tällä hetkellä', { duration: 3000 });
        return;
      }
      
      // Store feedback state to prevent multiple submissions for the same message
      const messageKey = `${message.timestamp}-${message.text.substring(0, 20)}`;
      if (messageFeedback[messageKey]) {
        toast.error('Olet jo antanut palautetta tälle viestille', { duration: 2000 });
        return;
      }
      
      // Update local messageFeedback state
      setMessageFeedback(prev => ({
        ...prev,
        [messageKey]: { type: feedbackType, timestamp: new Date().toISOString() }
      }));
      
      // Submit feedback to analytics service
      await aiAnalyticsService.submitFeedback(currentInteractionId, {
        rating: feedbackType === 'positive' ? 5 : 2,
        feedback: feedbackType === 'positive' 
          ? 'Käyttäjä arvioi vastauksen hyväksi' 
          : 'Käyttäjä arvioi vastauksen huonoksi'
      });
      
      if (feedbackType === 'positive') {
        toast.success('Kiitos palautteesta! Palaute auttaa kehittämään tekoälyä paremmaksi.', {
          duration: 3000
        });
      } else {
        toast('Kiitos palautteesta. Pahoittelut huonosta vastauksesta. Kehitämme järjestelmää jatkuvasti.', {
          icon: '🙏',
          duration: 3000
        });
      }
      
      // Update local state to show feedback was given
      setRating(feedbackType === 'positive' ? 5 : 2);
      
    } catch (err) {
      console.error('Error submitting feedback:', err);
      
      // Remove the feedback from local state if submission failed
      const messageKey = `${message.timestamp}-${message.text.substring(0, 20)}`;
      setMessageFeedback(prev => {
        const newState = {...prev};
        delete newState[messageKey];
        return newState;
      });
      
      toast.error('Palautteen tallentaminen epäonnistui', {
        duration: 3000
      });
    }
  };
  
  /**
   * Handle copying content
   */
  const handleCopy = () => {
    toast.success('Kopioitu leikepöydälle', {
      icon: '📋',
      duration: 2000
    });
  };
  
  /**
   * Reset the conversation - now also clears conversation history on server
   */
  const handleReset = async () => {
    if (conversation.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Call the server to clear the conversation history
      await supportAssistantService.clearConversationHistory(ticket.id, user.id);
      
      // Clear local conversation history
      setConversation([]);
      setError(null);
      
      toast('Keskustelu tyhjennetty', {
        icon: '🔄',
        duration: 2000
      });
    } catch (err) {
      console.error('Error clearing conversation history:', err);
      toast.error('Keskustelun tyhjentäminen epäonnistui', {
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add state for tracking the current interaction and rating
  const [currentInteractionId, setCurrentInteractionId] = useState(null);
  const [rating, setRating] = useState(null);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-[60]">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized button */
          <motion.div
            key="minimized"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <Tooltip content="Avaa tukiavustaja">
              <Button
                onClick={() => setIsMinimized(false)}
                className="h-14 w-14 rounded-full shadow-xl hover:shadow-indigo-200/40 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-600 text-white flex items-center justify-center transition-all duration-300"
                style={{
                  boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.3), 0 8px 10px -6px rgba(99, 102, 241, 0.2)"
                }}
              >
                <div className="relative">
                  <Bot className="h-6.5 w-6.5" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                  </span>
                </div>
              </Button>
            </Tooltip>
          </motion.div>
        ) : (
          /* Full chat interface */
          <motion.div
            key="expanded"
            initial={{ y: 20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-[90vw] max-w-lg h-[75vh] max-h-[600px] bg-gradient-to-b from-white to-gray-50 rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden"
            style={{
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.1), 0 8px 10px -6px rgba(59, 130, 246, 0.1)',
              backdropFilter: 'blur(4px)'
            }}
          >
            {/* Header with controls */}
            <header className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-indigo-900 px-4 py-3.5 flex justify-between items-center flex-shrink-0 shadow-lg relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -right-6 -top-10 w-24 h-24 rounded-full bg-indigo-500 opacity-20 blur-xl"></div>
                <div className="absolute left-1/3 -bottom-8 w-16 h-16 rounded-full bg-purple-400 opacity-20 blur-lg"></div>
              </div>
              
              <div className="flex items-center gap-2.5 text-white z-10">
                <div className="flex items-center justify-center bg-white/15 h-8 w-8 rounded-full shadow-inner shadow-white/5">
                  <Sparkles className="h-4 w-4 text-purple-100" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-wide">EseduTiketti AI</h3>
                  <div className="text-[11px] text-indigo-200 font-light flex items-center">
                    <span className="max-w-[180px] truncate">{ticket.title}</span>
                    <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-green-300"></span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 z-10">
                <Tooltip content="Tyhjennä keskustelu">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleReset}
                    className="text-indigo-100 hover:text-white hover:bg-white/10 rounded-full w-7 h-7 p-0 transition-all duration-200"
                    disabled={conversation.length === 0}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                
                <Tooltip content="Pienennä">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setIsMinimized(true)}
                    className="text-indigo-100 hover:text-white hover:bg-white/10 rounded-full w-7 h-7 p-0 transition-all duration-200"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
                
                <Tooltip content="Sulje avustaja">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose}
                    className="text-indigo-100 hover:text-white hover:bg-white/10 rounded-full w-7 h-7 p-0 transition-all duration-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Tooltip>
              </div>
            </header>

            {/* Chat messages container */}
            <div className="flex-grow p-4 overflow-y-auto space-y-1.5 bg-[#f8fafc]/80 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {/* Loading state */}
              {isInitialLoading && (
                <div className="text-center flex flex-col items-center justify-center h-full px-6">
                  <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
                  <p className="text-sm text-gray-600">Ladataan keskustelua...</p>
                </div>
              )}
              
              {/* Empty state */}
              {conversation.length === 0 && !isLoading && !isInitialLoading && (
                <div className="text-center flex flex-col items-center justify-center h-full px-6">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 w-18 h-18 rounded-full flex items-center justify-center mb-4 p-1.5 shadow-sm">
                    <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full w-full h-full flex items-center justify-center">
                      <MessageSquare className="h-8 w-8 text-indigo-500" />
                    </div>
                  </div>
                  <h3 className="text-gray-800 font-medium text-lg mb-1">Tukiavustaja</h3>
                  <p className="text-sm text-gray-600 mb-6 max-w-xs leading-relaxed">
                    Kysy tikettiin liittyviä kysymyksiä ja saat tekoälyavusteisia vastauksia tukityöhösi.
                  </p>
                  
                  {/* Suggested questions */}
                  <div className="w-full space-y-2.5 mt-2">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Ehdotetut kysymykset</p>
                    {suggestedQuestions.map((question, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(question)}
                        className="w-full justify-start text-left text-sm py-2.5 px-3.5 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 text-gray-700 hover:text-indigo-700 shadow-sm hover:shadow transition-all duration-150 rounded-xl group"
                      >
                        <span className="mr-2 text-indigo-400 group-hover:text-indigo-500">→</span>
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Render conversation messages */}
              {conversation.map((msg, index) => (
                msg.sender === 'system_error' ? (
                  <motion.div 
                    key={`error-${index}-${msg.timestamp}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center text-red-600 text-xs my-3 px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center gap-2 shadow-sm"
                  >
                    <div className="bg-red-100 p-1 rounded-full">
                      <X className="h-3 w-3 text-red-500" />
                    </div>
                    <span className="font-medium">{msg.text}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSendMessage(conversation[conversation.length - 2]?.text || "")}
                      className="text-xs text-red-600 hover:text-red-700 px-1.5 py-0.5 h-auto font-medium hover:bg-red-100 rounded ml-1"
                    >
                      Yritä uudelleen
                    </Button>
                  </motion.div>
                ) : (
                  <ChatMessage 
                    key={`message-${index}-${msg.timestamp}`}
                    message={msg} 
                    onCopy={handleCopy}
                    onFeedback={handleFeedback}
                    feedbackStatus={
                      msg.sender === 'ai' 
                        ? messageFeedback[`${msg.timestamp}-${msg.text.substring(0, 20)}`] 
                        : null
                    }
                  />
                )
              ))}

              {/* Typing indicator */}
              {typingIndicator && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2 ml-2 mt-2"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border-2 border-white shadow-md">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex space-x-1.5 bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 rounded-bl-none mt-1">
                    <span className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounceFirst"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounceSecond"></span>
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounceThird"></span>
                  </div>
                </motion.div>
              )}

              {/* Scroll anchor */}
              <div ref={chatEndRef} className="h-1" />
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-gray-100/80 p-2 pl-3.5 pr-1.5 rounded-xl border border-gray-200/80 shadow-inner transition-all focus-within:border-indigo-200 focus-within:shadow-indigo-100/20">
                <textarea
                  ref={textAreaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Kirjoita viesti... (Enter lähetä, Shift+Enter uusi rivi)"
                  className="flex-grow py-2 text-sm bg-transparent focus:outline-none placeholder-gray-400 resize-none w-full"
                  style={{ 
                    minHeight: '40px',
                    maxHeight: '120px'
                  }}
                  disabled={isLoading}
                  aria-label="Kysymys tukiavustajalle"
                />
                <Tooltip content="Lähetä viesti">
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="shrink-0 h-10 w-10 p-0 flex items-center justify-center bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg disabled:shadow-none"
                    aria-label="Lähetä kysymys"
                  >
                    {isLoading 
                      ? <Loader2 className="h-5 w-5 animate-spin" /> 
                      : <Send className="h-4.5 w-4.5" />
                    }
                  </Button>
                </Tooltip>
              </div>
              
              {/* Optional hint text */}
              {!isLoading && conversation.length === 0 && (
                <p className="text-[10px] text-gray-400 mt-2 px-3 text-center">
                  Avustajan vastaukset perustuvat tiketin tietoihin ja tietokannan tietopankkisisältöön
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Keyboard shortcut handler - could be added */}
      {/* <KeyboardShortcuts onSend={() => handleSendMessage()} /> */}
    </div>
  );
} 