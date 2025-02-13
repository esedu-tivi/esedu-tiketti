import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSupportUsers } from '../utils/api';

const MentionInput = ({ value, onChange, placeholder }) => {
  const [mentionSearch, setMentionSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const [formattedText, setFormattedText] = useState('');

  // Fetch users for suggestions
  const { data: users = [] } = useQuery({
    queryKey: ['support-users'],
    queryFn: fetchSupportUsers,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format text with mentions highlighted
  useEffect(() => {
    const formatText = () => {
      const container = document.createElement('div');
      let lastIndex = 0;
      const mentionRegex = /@[a-zA-ZäöåÄÖÅ\s]+/g;
      const parts = [];
      let match;

      while ((match = mentionRegex.exec(value)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
          parts.push(value.slice(lastIndex, match.index));
        }
        // Add mention with styling
        parts.push(`<span class="mention">${match[0]}</span>`);
        lastIndex = match.index + match[0].length;
      }
      // Add remaining text
      if (lastIndex < value.length) {
        parts.push(value.slice(lastIndex));
      }

      container.innerHTML = parts.join('');
      setFormattedText(container.innerHTML);
    };

    formatText();
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const position = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(position);

    // Find the word being typed
    const textBeforeCursor = newValue.slice(0, position);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const searchTerm = mentionMatch[1].toLowerCase();
      setMentionSearch(searchTerm);
      
      // Filter users based on search term
      const filtered = users?.filter(user => 
        user.name.toLowerCase().includes(searchTerm)
      ) || [];
      
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const insertMention = (user) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const startOfMention = textBeforeCursor.lastIndexOf('@');
      const newText = textBeforeCursor.slice(0, startOfMention) + 
                     `@${user.name}` + 
                     (textAfterCursor.startsWith(' ') ? '' : ' ') +
                     textAfterCursor;
      
      onChange(newText);
      setShowSuggestions(false);
      
      // Set focus back to input with correct cursor position
      setTimeout(() => {
        const newPosition = startOfMention + user.name.length + 1; // +1 for @
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows={3}
        />
        <div 
          className="absolute inset-0 pointer-events-none px-3 py-2 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ 
            __html: formattedText.replace(/\n/g, '<br>')
          }}
          style={{
            color: 'transparent',
            userSelect: 'none',
            zIndex: 1
          }}
        >
        </div>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-64 bottom-full mb-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((user) => (
            <div
              key={user.id}
              onClick={() => insertMention(user)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-2">
                {user.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-gray-500">{user.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput; 