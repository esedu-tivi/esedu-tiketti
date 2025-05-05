import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSupportUsers } from '../utils/api';

const MentionInput = ({ value, onChange, placeholder, onSubmit, disabled }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [mentionSearchPosition, setMentionSearchPosition] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // Instead of storing pure text, we'll store structured content
  // Each item is either plain text or a mention object
  const [structuredContent, setStructuredContent] = useState([{ type: 'text', content: value || '' }]);
  const [plainTextValue, setPlainTextValue] = useState(value || '');

  // Function to auto-resize textarea based on content
  const autoResizeTextarea = useCallback(() => {
    if (inputRef.current) {
      // Reset height to get accurate scrollHeight
      inputRef.current.style.height = 'auto';
      
      // Calculate new height (clamp between 40px and 150px)
      const newHeight = Math.min(150, Math.max(40, inputRef.current.scrollHeight));
      
      // Set the new height
      inputRef.current.style.height = `${newHeight}px`;
      
      // Add scrollbars if content exceeds max height
      if (inputRef.current.scrollHeight > 150) {
        inputRef.current.style.overflowY = 'auto';
      } else {
        inputRef.current.style.overflowY = 'hidden';
      }
    }
  }, []);

  // Auto-resize on input value change
  useEffect(() => {
    autoResizeTextarea();
  }, [plainTextValue, autoResizeTextarea]);

  // Handler for key press
  const handleKeyDown = (e) => {
    // Handle escape key to cancel mention (original functionality)
    if (e.key === 'Escape' && showSuggestions) {
      setShowSuggestions(false);
      setMentionSearchPosition(-1);
      e.preventDefault();
      return;
    }
    
    // If Enter is pressed without Shift key, and there's content, submit
    if (e.key === 'Enter' && !e.shiftKey && onSubmit && plainTextValue.trim()) {
      e.preventDefault(); // Prevent default behavior (newline)
      onSubmit();
    }
  };

  // Fetch users for suggestions
  const { data: users = [] } = useQuery({
    queryKey: ['support-users'],
    queryFn: fetchSupportUsers,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  // Convert structured content to plain text (for form submission)
  useEffect(() => {
    // Use a special format for mentions that the backend can recognize
    // Format: @[name] followed by a zero-width space to mark the end of the mention
    const plainText = structuredContent.map(item => {
      if (item.type === 'mention') {
        // Add a zero-width space after the mention to mark its end
        // This helps the backend distinguish between the mention and text after it
        return `@${item.user.name}\u200B `;
      } else {
        return item.content;
      }
    }).join('');
    
    setPlainTextValue(plainText);
    
    // Only update if changed to avoid infinite loop
    if (plainText !== value) {
      onChange(plainText);
    }
  }, [structuredContent, onChange]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setMentionSearchPosition(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update structuredContent when external value changes
  useEffect(() => {
    // Only update if value is different from our internal representation
    if (value !== undefined && value !== plainTextValue) {
      // For external updates, we parse mentions from plain text
      parseContentFromText(value);
    }
  }, [value]);

  // Parse mentions from plain text and update structured content
  const parseContentFromText = (text) => {
    // For simplicity, we just set as plain text
    // You could enhance this to parse existing mentions if needed
    setStructuredContent([{ type: 'text', content: text || '' }]);
    setPlainTextValue(text || '');
  };

  const handleInputChange = (e) => {
    const target = e.target;
    const newValue = target.value;
    const position = target.selectionStart;
    
    // Compare with previous value to determine what changed
    const previousValue = plainTextValue;
    setPlainTextValue(newValue);
    setCursorPosition(position);
    
    // Call autoResizeTextarea to adjust height immediately
    setTimeout(autoResizeTextarea, 0);
    
    // Check if we just typed @ symbol
    if (position > 0 && newValue.charAt(position - 1) === '@') {
      setMentionSearchPosition(position - 1);
      
      // Immediately show all suggestions when @ is typed
      setSuggestions(users || []);
      setShowSuggestions(users && users.length > 0);
      
      // Continue with normal processing
      if (newValue.length > previousValue.length) {
        handleAddition(newValue, previousValue, position);
      } else if (newValue.length < previousValue.length) {
        handleDeletion(newValue, previousValue, position);
      }
      return;
    }
    
    // If we have an active mention search, check if we should update or close it
    if (mentionSearchPosition !== -1) {
      // Check if the @ symbol still exists
      if (mentionSearchPosition >= newValue.length || newValue.charAt(mentionSearchPosition) !== '@') {
        // @ was removed, cancel the mention search
        setMentionSearchPosition(-1);
        setShowSuggestions(false);
      } else {
        // Get the text between @ and cursor
        const mentionText = newValue.substring(mentionSearchPosition + 1, position);
        
        // If there's a space in the mention text, cancel the search
        if (mentionText.includes(' ')) {
          setMentionSearchPosition(-1);
          setShowSuggestions(false);
        } else {
          // Update suggestions based on the mention text
          // If mentionText is empty, show all users
          const filtered = mentionText === '' 
            ? users || []
            : users?.filter(user => 
                user.name.toLowerCase().includes(mentionText.toLowerCase())
              ) || [];
          
          setSuggestions(filtered);
          setShowSuggestions(filtered.length > 0);
        }
      }
    }
    
    // If user is deleting content (backspace or delete)
    if (newValue.length < previousValue.length) {
      handleDeletion(newValue, previousValue, position);
      return;
    }
    
    // If user is typing content
    if (newValue.length > previousValue.length) {
      handleAddition(newValue, previousValue, position);
      return;
    }
    
    // If length is the same but content changed (e.g., selection + paste), just reset
    if (newValue !== previousValue) {
      parseContentFromText(newValue);
    }
  };

  const handleDeletion = (newValue, previousValue, position) => {
    // Create a plaintext position map to map between plain text positions
    // and structured content positions
    let plainTextPos = 0;
    let structuredItemIndex = 0;
    let positionInItem = 0;
    let newStructuredContent = [...structuredContent];
    let deletedSomething = false;
    
    for (let i = 0; i < structuredContent.length; i++) {
      const item = structuredContent[i];
      const itemLength = item.type === 'mention' 
        ? `@${item.user.name} `.length 
        : item.content.length;
      
      // Check if deletion happened in this item
      if (plainTextPos <= position && position <= plainTextPos + itemLength) {
        if (item.type === 'mention') {
          // If deletion happened in a mention, remove the entire mention
          newStructuredContent.splice(i, 1);
          deletedSomething = true;
          
          // Cancel any active mention search
          setMentionSearchPosition(-1);
          setShowSuggestions(false);
          break;
        } else {
          // For text items, update the content
          positionInItem = position - plainTextPos;
          const beforeDeletion = item.content.substring(0, positionInItem);
          const afterDeletion = item.content.substring(positionInItem + (previousValue.length - newValue.length));
          newStructuredContent[i] = {
            type: 'text',
            content: beforeDeletion + afterDeletion
          };
          deletedSomething = true;
          break;
        }
      }
      
      plainTextPos += itemLength;
      structuredItemIndex = i + 1;
    }
    
    // If we didn't find where the deletion happened, just reset
    if (!deletedSomething) {
      parseContentFromText(newValue);
      return;
    }
    
    // Merge adjacent text items
    const mergedContent = [];
    let currentTextItem = null;
    
    for (const item of newStructuredContent) {
      if (item.type === 'text') {
        if (currentTextItem) {
          currentTextItem.content += item.content;
        } else {
          currentTextItem = { ...item };
          mergedContent.push(currentTextItem);
        }
      } else {
        currentTextItem = null;
        mergedContent.push(item);
      }
    }
    
    setStructuredContent(mergedContent);
  };

  const handleAddition = (newValue, previousValue, position) => {
    // Check if we're starting to type a mention
    const typedChar = newValue.charAt(position - 1);
    
    // Create a plaintext position map to map between plain text positions
    // and structured content positions
    let plainTextPos = 0;
    let structuredItemIndex = 0;
    let positionInItem = 0;
    let newStructuredContent = [...structuredContent];
    let addedSomething = false;
    
    for (let i = 0; i < structuredContent.length; i++) {
      const item = structuredContent[i];
      const itemLength = item.type === 'mention' 
        ? `@${item.user.name} `.length 
        : item.content.length;
      
      // Check if addition happened in this item
      if (plainTextPos <= position && position <= plainTextPos + itemLength) {
        if (item.type === 'mention') {
          // If typing right after a mention, add a new text item
          if (position === plainTextPos + itemLength) {
            newStructuredContent.splice(i + 1, 0, {
              type: 'text',
              content: newValue.substring(position - 1, position)
            });
          } else {
            // If typing within a mention, convert it to text (this shouldn't normally happen)
            const mentionText = `@${item.user.name} `;
            newStructuredContent[i] = {
              type: 'text',
              content: mentionText
            };
            i--; // Process this item again as text
            continue;
          }
        } else {
          // For text items, update the content
          positionInItem = position - plainTextPos;
          const beforeAddition = item.content.substring(0, positionInItem - 1);
          const addedText = newValue.substring(position - 1, position);
          const afterAddition = item.content.substring(positionInItem - 1);
          
          newStructuredContent[i] = {
            type: 'text',
            content: beforeAddition + addedText + afterAddition
          };
        }
        
        addedSomething = true;
        break;
      }
      
      plainTextPos += itemLength;
      structuredItemIndex = i + 1;
    }
    
    // If we didn't find where to add, append to the end
    if (!addedSomething && structuredItemIndex === structuredContent.length) {
      const addedText = newValue.substring(previousValue.length);
      
      if (structuredContent.length > 0 && structuredContent[structuredContent.length - 1].type === 'text') {
        // Append to the last text item
        const lastItem = structuredContent[structuredContent.length - 1];
        newStructuredContent[structuredContent.length - 1] = {
          type: 'text',
          content: lastItem.content + addedText
        };
      } else {
        // Add a new text item
        newStructuredContent.push({
          type: 'text',
          content: addedText
        });
      }
      
      addedSomething = true;
    }
    
    // If we still couldn't determine how to update the structure, just reset
    if (!addedSomething) {
      parseContentFromText(newValue);
      return;
    }
    
    // Merge adjacent text items
    const mergedContent = [];
    let currentTextItem = null;
    
    for (const item of newStructuredContent) {
      if (item.type === 'text') {
        if (currentTextItem) {
          currentTextItem.content += item.content;
        } else {
          currentTextItem = { ...item };
          mergedContent.push(currentTextItem);
        }
      } else {
        currentTextItem = null;
        mergedContent.push(item);
      }
    }
    
    setStructuredContent(mergedContent);
  };

  const insertMention = (user) => {
    // If no active mention search, do nothing
    if (mentionSearchPosition === -1) return;
    
    // Get the text before the @ and after the cursor
    const textBeforeAt = plainTextValue.substring(0, mentionSearchPosition);
    const textAfterCursor = plainTextValue.substring(cursorPosition);
    
    // Create a plaintext position map to map between plain text positions
    // and structured content positions
    let plainTextPos = 0;
    let atItemIndex = -1;
    let positionInItem = -1;
    
    // Find which structured item contains the @ symbol
    for (let i = 0; i < structuredContent.length; i++) {
      const item = structuredContent[i];
      const itemLength = item.type === 'mention' 
        ? `@${item.user.name} `.length 
        : item.content.length;
      
      // Check if @ is in this item
      if (plainTextPos <= mentionSearchPosition && mentionSearchPosition < plainTextPos + itemLength) {
        atItemIndex = i;
        positionInItem = mentionSearchPosition - plainTextPos;
        break;
      }
      
      plainTextPos += itemLength;
    }
    
    if (atItemIndex !== -1) {
      // Create new structured content
      let newStructuredContent = [...structuredContent];
      const currentItem = structuredContent[atItemIndex];
      
      if (currentItem.type === 'text') {
        // Find where cursor is among structured items
        let cursorItemIndex = -1;
        let cursorPositionInItem = -1;
        plainTextPos = 0;
        
        for (let i = 0; i < structuredContent.length; i++) {
          const item = structuredContent[i];
          const itemLength = item.type === 'mention' 
            ? `@${item.user.name} `.length 
            : item.content.length;
          
          if (plainTextPos <= cursorPosition && cursorPosition <= plainTextPos + itemLength) {
            cursorItemIndex = i;
            cursorPositionInItem = cursorPosition - plainTextPos;
            break;
          }
          
          plainTextPos += itemLength;
        }
        
        // Create the new structured content
        const newContent = [];
        
        // Add all items before the @ item
        for (let i = 0; i < atItemIndex; i++) {
          newContent.push(structuredContent[i]);
        }
        
        // Add text before @ in the @ item
        if (positionInItem > 0) {
          newContent.push({
            type: 'text',
            content: currentItem.content.substring(0, positionInItem)
          });
        }
        
        // Add the mention
        newContent.push({ type: 'mention', user });
        
        // Add a space after the mention
        if (cursorItemIndex === atItemIndex) {
          // If cursor is in the same item, split the text
          const afterMention = currentItem.content.substring(cursorPositionInItem);
          newContent.push({
            type: 'text',
            content: ' ' + afterMention
          });
        } else if (cursorItemIndex > atItemIndex) {
          // If cursor is in a later item, add space and keep rest of content
          newContent.push({ type: 'text', content: ' ' });
          
          // Add all items between @ item and cursor item
          for (let i = atItemIndex + 1; i < cursorItemIndex; i++) {
            newContent.push(structuredContent[i]);
          }
          
          // Add text before cursor in the cursor item
          const cursorItem = structuredContent[cursorItemIndex];
          if (cursorPositionInItem > 0) {
            if (cursorItem.type === 'text') {
              newContent.push({
                type: 'text',
                content: cursorItem.content.substring(0, cursorPositionInItem)
              });
            } else {
              // It's a mention, this is unusual but handle it anyway
              newContent.push(cursorItem);
              cursorPositionInItem = `@${cursorItem.user.name} `.length;
            }
          }
          
          // Add text after cursor
          newContent.push({
            type: 'text',
            content: textAfterCursor
          });
        } else {
          // Cursor is before @ (unusual), just add space
          newContent.push({ type: 'text', content: ' ' });
          
          // Add all remaining items
          for (let i = atItemIndex + 1; i < structuredContent.length; i++) {
            newContent.push(structuredContent[i]);
          }
        }
        
        // Merge adjacent text items
        const mergedContent = [];
        let currentTextItem = null;
        
        for (const item of newContent) {
          if (item.type === 'text') {
            if (currentTextItem) {
              currentTextItem.content += item.content;
            } else {
              currentTextItem = { ...item };
              mergedContent.push(currentTextItem);
            }
          } else {
            currentTextItem = null;
            mergedContent.push(item);
          }
        }
        
        // Calculate new cursor position
        const mentionText = `@${user.name} `;
        const newCursorPosition = textBeforeAt.length + mentionText.length;
        
        // Update state
        setStructuredContent(mergedContent);
        setMentionSearchPosition(-1);
        setShowSuggestions(false);
        
        // Set focus and cursor position
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            setCursorPosition(newCursorPosition);
          }
        }, 0);
      }
    }
  };

  // Check if there are any mentions in the structured content
  const hasMentions = structuredContent.some(item => item.type === 'mention');

  // Render the input field
  return (
    <div className="relative w-full">
      <div className="relative">
        <textarea
          ref={inputRef}
          value={plainTextValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none ${hasMentions ? 'mention-textarea' : ''}`}
          rows={1}
          onSelect={(e) => setCursorPosition(e.target.selectionStart)}
          onClick={(e) => setCursorPosition(e.target.selectionStart)}
          onKeyDown={handleKeyDown}
          style={{ 
            minHeight: '40px',
            maxHeight: '150px',
            overflow: 'hidden' // Default state, will be updated by autoResizeTextarea
          }}
        />
        
        {/* Render an overlay with colored mentions */}
        {hasMentions && (
          <div 
            className="absolute inset-0 pointer-events-none px-3 py-2 whitespace-pre-wrap overflow-hidden mention-overlay"
            style={{ 
              minHeight: '40px',
              maxHeight: '150px',
              overflowY: inputRef.current?.style.overflowY
            }}
          >
            {structuredContent.map((item, index) => {
              if (item.type === 'mention') {
                return (
                  <span key={index} className="mention">
                    @{item.user.name}
                  </span>
                );
              } else {
                // Replace text with space for correct alignment
                return <span key={index}>{item.content}</span>;
              }
            })}
          </div>
        )}
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