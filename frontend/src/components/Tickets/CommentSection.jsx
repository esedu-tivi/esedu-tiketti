import React, { useState, useEffect, useRef } from 'react';
import { User, Calendar, ImageIcon, VideoIcon, Check, FileIcon, X, Send, Paperclip, MessageSquare, InfoIcon, Loader2, Bot, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import MentionInput from '../MentionInput';
import { useAuth } from '../../providers/AuthProvider';
import { useSocket } from '../../hooks/useSocket';
import { Avatar, AvatarFallback, Badge } from '../ui/Avatar';
import ProfilePicture from '../User/ProfilePicture';

// Lisätään mukautettu värimääritys
const SUPPORT_COLOR = {
  bg: 'bg-[#92C01F]',
  bgLight: 'bg-[#92C01F]/10',
  text: 'text-[#92C01F]',
  border: 'border-[#92C01F]/20'
};

const formatCommentContent = (content) => {
  // Improved regex to match mentions with zero-width space delimiter
  // This ensures we only match complete mentions, not partial text
  const mentionRegex = /@([\w\sáàâäãåçéèêëíìîïñóòôöõúùûüÿýæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜŸÝÆŒÄÖÅäöå]+)\u200B\s/g;
  
  return content.replace(mentionRegex, (match, name) => {
    // Create a mention span with just the name (without the @ and trailing space)
    return `<span class="mention">@${name}</span> `;
  });
};

// Render media content based on type
const MediaContent = ({ mediaUrl, mediaType, onClick }) => {
  if (!mediaUrl) return null;
  
  // Ensure mediaUrl has the full path to the backend
  const fullMediaUrl = mediaUrl.startsWith('http') 
    ? mediaUrl 
    : `http://localhost:3001${mediaUrl}`;
  
  // Handle image content
  if (mediaType === 'image') {
    return (
      <div className="mt-3">
        <img 
          src={fullMediaUrl} 
          alt="Kuva vastauksessa" 
          className="max-w-full rounded-lg border border-gray-200 shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
          style={{ maxHeight: '300px' }}
          onClick={() => onClick({ url: fullMediaUrl, type: mediaType })}
        />
      </div>
    );
  }
  
  // Handle video content
  if (mediaType === 'video') {
    return (
      <div className="mt-3">
        <video 
          src={fullMediaUrl} 
          controls
          className="max-w-full rounded-lg border border-gray-200 shadow-sm"
          style={{ maxHeight: '300px' }}
        >
          Selaimesi ei tue video-elementtiä.
        </video>
      </div>
    );
  }
  
  // Fallback for unsupported media types
  return (
    <div className="mt-3">
      <a 
        href={fullMediaUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-500 hover:underline flex items-center"
      >
        {mediaType === 'image' ? <ImageIcon className="mr-1 h-4 w-4" /> : <VideoIcon className="mr-1 h-4 w-4" />}
        Avaa {mediaType === 'image' ? 'kuva' : 'video'} uudessa ikkunassa
      </a>
    </div>
  );
};

export default function CommentSection({
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  addCommentMutation,
  ticket,
  onAddMediaComment
}) {
  const { user, userRole } = useAuth();
  const { subscribe } = useSocket();
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [hasAddedMediaResponse, setHasAddedMediaResponse] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments, isAiTyping]);

  useEffect(() => {
    if (!ticket?.id || !subscribe) return;

    console.log(`[CommentSection Socket] Subscribing to updateTypingStatus for ticket ${ticket.id}`);

    const setupSubscription = async () => {
      try {
        const unsubscribe = await subscribe('updateTypingStatus', (data) => {
          console.log(`[CommentSection Socket] Received updateTypingStatus event:`, data);
          if (data && data.ticketId === ticket.id) {
            console.log(`[CommentSection Socket] Typing status matches current ticket (${ticket.id}). Setting typing to ${data.isTyping}`);
            setIsAiTyping(data.isTyping);
          } else {
            console.log(`[CommentSection Socket] Typing status does not match current ticket (${ticket.id}). Ignoring.`);
          }
        });
        return unsubscribe;
      } catch (error) {
        console.error('[CommentSection Socket] Error setting up updateTypingStatus subscription:', error);
        return () => {};
      }
    };

    const cleanupPromise = setupSubscription();

    return () => {
      console.log(`[CommentSection Socket] Cleaning up updateTypingStatus subscription for ticket ${ticket.id}`);
      setIsAiTyping(false);
      cleanupPromise.then(cleanup => cleanup());
    };
  }, [ticket?.id, subscribe]);

  useEffect(() => {
    if (userRole === 'SUPPORT' || userRole === 'ADMIN') {
      const hasMedia = comments.some(comment => 
        comment.author?.id === user?.id && 
        comment.mediaUrl && 
        (comment.mediaType === 'image' || comment.mediaType === 'video')
      );
      setHasAddedMediaResponse(hasMedia);
    }
  }, [comments, user?.id, userRole]);

  const canComment = () => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return false;
    }

    if (ticket.createdById === user?.id) {
      return true;
    }

    if (userRole === 'SUPPORT' || userRole === 'ADMIN') {
      return (
        userRole === 'ADMIN' ||
        (ticket.status === 'IN_PROGRESS' && ticket.assignedToId === user?.id)
      );
    }

    return true;
  };

  const shouldUseMediaResponse = () => {
    return (userRole === 'SUPPORT' || userRole === 'ADMIN') &&
           (ticket.responseFormat === 'KUVA' || ticket.responseFormat === 'VIDEO') &&
           ticket.assignedToId === user?.id;
  };

  const canAddMediaComment = () => {
    if (ticket.createdById === user?.id) {
      return ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
    }
    
    return (userRole === 'SUPPORT' || userRole === 'ADMIN') && canComment();
  };

  const canAddTextComment = () => {
    if (ticket.createdById === user?.id) {
      return ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
    }
    
    if (shouldUseMediaResponse()) {
      return hasAddedMediaResponse;
    }
    
    return canComment();
  };

  const getCommentDisabledMessage = () => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return 'Tiketti on ratkaistu tai suljettu - kommentointi ei ole mahdollista';
    }
    if ((userRole === 'SUPPORT' || userRole === 'ADMIN') && 
        ticket.status === 'OPEN' && 
        userRole !== 'ADMIN') {
      return 'Ota tiketti ensin käsittelyyn kommentoidaksesi';
    }
    if (userRole === 'SUPPORT' && 
        ticket.status === 'IN_PROGRESS' && 
        ticket.assignedToId !== user?.id) {
      return 'Vain tiketin käsittelijä voi kommentoida';
    }
    if (shouldUseMediaResponse() && !hasAddedMediaResponse) {
      return 'Lisää ensin mediavastaus (kuva/video) ennen tekstikommentteja';
    }
    return '';
  };

  const getCommentStyle = (comment) => {
    const isCreator = comment.author?.id === ticket.createdById;
    if (isCreator) {
      return {
        container: 'bg-gray-50 border-gray-200',
        text: 'text-gray-700',
        author: 'text-gray-900 font-medium'
      };
    }
    return {
      container: 'bg-[#92C01F]/10 border-gray-200',
      text: 'text-gray-700',
      author: 'text-gray-900 font-medium'
    };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      await handleAddComment();
      setNewComment('');
      setSuccessMessage('Kommentti lisätty onnistuneesti');
      setShowForm(false);
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage('Kommentin lisääminen epäonnistui: ' + (error.message || 'Tuntematon virhe'));
      
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    }
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setMediaFile(null);
      setPreviewUrl(null);
      return;
    }
    
    setMediaFile(file);
    
    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleMediaSubmit = async (e) => {
    e?.preventDefault();
    if (!mediaFile) return;
    
    const formData = new FormData();
    formData.append('media', mediaFile);
    formData.append('content', newComment.trim() || 'Media-kommentti');
    
    try {
      await onAddMediaComment(formData);
      setMediaFile(null);
      setPreviewUrl(null);
      setNewComment('');
      setShowMediaForm(false);
      setSuccessMessage('Media lisätty onnistuneesti');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage('Median lisääminen epäonnistui: ' + (error.message || 'Tuntematon virhe'));
      
      setTimeout(() => {
        setErrorMessage('');
      }, 5000);
    }
  };

  const handleMediaClick = (media) => {
    setSelectedMedia(media);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  const disabledMessage = getCommentDisabledMessage();
  const textInputDisabled = !canAddTextComment() || addCommentMutation.isLoading;
  const mediaInputDisabled = !canAddMediaComment() || addCommentMutation.isLoading;

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Keskustelu</h3>
      
      <div className="flex-grow overflow-y-auto space-y-4 pr-2 mb-4" style={{ maxHeight: '400px' }}>
        {comments.length === 0 ? (
          <div className="text-center text-gray-500 py-6">
            Ei vielä kommentteja.
          </div>
        ) : (
          comments.map((comment) => {
            if (comment.isAiGenerated) {
              // --- AI Comment Rendering --- 
              return (
                <div key={comment.id} className="p-4 rounded-lg border shadow-md animate-fadeIn bg-gradient-to-br from-indigo-100 via-purple-50 to-indigo-100 border-indigo-200">
                  <div className="flex items-start space-x-3">
                    {/* AI Icon instead of ProfilePicture */}
                    <Bot size={40} className="p-2 flex-shrink-0 rounded-full shadow-sm border border-indigo-300 bg-indigo-100 text-indigo-600" />
                    <div className="flex-1 min-w-0">
                      {/* AI Header */}
                      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-indigo-200/50">
                        <Sparkles size={16} className="text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-700">AI Agent Response</span>
                        {/* Timestamp moved here */}
                         <span className="text-xs text-gray-400 flex items-center flex-shrink-0 ml-auto">
                           <Calendar size={12} className="mr-1" />
                           {new Date(comment.createdAt).toLocaleString('fi-FI')}
                         </span>
                      </div>
                      {/* AI Comment Content */}
                      <div 
                         className="text-gray-800 whitespace-pre-wrap comment-content"
                         dangerouslySetInnerHTML={{ __html: formatCommentContent(comment.content) }}
                       />
                      {/* AI Media Content (unlikely but possible) */}
                      <MediaContent 
                        mediaUrl={comment.mediaUrl} 
                        mediaType={comment.mediaType} 
                        onClick={handleMediaClick}
                      />
                    </div>
                  </div>
                </div>
              );
            } else {
              // --- Existing User/Support Comment Rendering ---
              const style = getCommentStyle(comment);
              return (
                <div key={comment.id} className={`p-4 rounded-lg border ${style.container} shadow-sm animate-fadeIn`}>
                  <div className="flex items-start space-x-3">
                    <ProfilePicture 
                        email={comment.author?.email}
                        name={comment.author?.name}
                        size={40} 
                        className="flex-shrink-0 rounded-full shadow-sm border border-gray-200"
                     />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1 flex-wrap">
                        <span className={style.author}>{comment.author?.name || 'Tuntematon'}</span>
                        <span className="text-xs text-gray-400 flex items-center flex-shrink-0 ml-2">
                          <Calendar size={12} className="mr-1" />
                          {new Date(comment.createdAt).toLocaleString('fi-FI')}
                        </span>
                      </div>
                      <div 
                         className={`${style.text} whitespace-pre-wrap comment-content`}
                         dangerouslySetInnerHTML={{ __html: formatCommentContent(comment.content) }}
                       />
                      <MediaContent 
                        mediaUrl={comment.mediaUrl} 
                        mediaType={comment.mediaType} 
                        onClick={handleMediaClick}
                      />
                    </div>
                  </div>
                </div>
              );
            }
          })
        )}
        
        {isAiTyping && (
          <div className="flex items-center space-x-2 pl-4 pt-2 animate-fadeIn">
            <ProfilePicture 
                userId={ticket?.createdById}
                size={32} 
                className="flex-shrink-0 rounded-full shadow-sm border border-gray-200 opacity-80"
             />
            <div className="flex items-center space-x-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
        
        <div ref={commentsEndRef} /> 
      </div>

      <div className="mt-auto pt-4 border-t border-gray-200">
        {successMessage && <div className="mb-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200 transition-all duration-300 animate-fadeIn">{successMessage}</div>}
        {errorMessage && <div className="mb-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200 transition-all duration-300 animate-fadeIn">{errorMessage}</div>}

        {shouldUseMediaResponse() && !hasAddedMediaResponse ? (
          <form onSubmit={handleMediaSubmit} className="space-y-3">
             <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700 flex items-start gap-2">
                <InfoIcon size={16} className="flex-shrink-0 mt-0.5" />
                <span>Tämä tiketti vaatii vastaukseksi {ticket.responseFormat === 'KUVA' ? 'kuvan' : 'videon'}. Lisää ensin mediavastaus.</span>
              </div>
            <div>
              <Label htmlFor="required-media-comment">Liitä {ticket.responseFormat === 'KUVA' ? 'kuva' : 'video'}</Label>
              <input
                id="required-media-comment"
                type="file"
                accept={ticket.responseFormat === 'KUVA' ? 'image/*' : 'video/*'}
                onChange={handleMediaChange}
                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={addCommentMutation.isLoading}
              />
              {previewUrl && ticket.responseFormat === 'KUVA' && (
                <img src={previewUrl} alt="Esikatselu" className="mt-2 rounded max-h-40 border" />
              )}
            </div>
            <div>
              <Label htmlFor="required-media-description">Lyhyt kuvaus (valinnainen)</Label>
              <MentionInput
                id="required-media-description"
                value={newComment}
                onChange={setNewComment}
                placeholder="Kirjoita lyhyt kuvaus medialle... Voit mainita @käyttäjän."
                disabled={!mediaFile || addCommentMutation.isLoading}
                className="mt-1"
              />
            </div>
            <Button 
              type="submit" 
              disabled={!mediaFile || addCommentMutation.isLoading}
            >
              {addCommentMutation.isLoading ? 'Lähetetään...' : 'Lähetä mediavastaus'}
            </Button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <MentionInput
                value={newComment}
                onChange={setNewComment}
                placeholder={disabledMessage || "Kirjoita kommentti... Voit mainita @käyttäjän."}
                disabled={textInputDisabled}
                aria-label="Uusi kommentti"
              />
               <div className="flex justify-between items-center">
                 <span className="text-xs text-red-500">{textInputDisabled ? disabledMessage : ''}</span>
                  <Button 
                    type="submit" 
                    disabled={textInputDisabled || !newComment.trim()}
                    size="sm"
                  >
                     {addCommentMutation.isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                         <Send className="mr-1.5 h-4 w-4" />
                     )}
                     <span>Lähetä</span>
                   </Button>
               </div>
            </form>
            
             {canAddMediaComment() && (
               <button 
                  onClick={() => setShowMediaForm(!showMediaForm)}
                  className="mt-2 text-sm text-blue-600 hover:underline flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={mediaInputDisabled}
                  title={mediaInputDisabled ? disabledMessage : ''}
                >
                 {showMediaForm ? <X size={14} className="mr-1" /> : <Paperclip size={14} className="mr-1" />}
                 {showMediaForm ? 'Peruuta media' : 'Liitä kuva/video'}
               </button>
              )}

            {showMediaForm && canAddMediaComment() && (
              <form onSubmit={handleMediaSubmit} className="mt-3 space-y-3 p-4 border rounded bg-gray-50 animate-fadeIn">
                 <h4 className="font-medium text-sm">Liitä media</h4>
                <div>
                  <Label htmlFor="optional-media-comment">Valitse kuva tai video</Label>
                  <input
                    id="optional-media-comment"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={addCommentMutation.isLoading}
                  />
                  {previewUrl && mediaFile?.type.startsWith('image/') && (
                    <img src={previewUrl} alt="Esikatselu" className="mt-2 rounded max-h-40 border" />
                  )}
                </div>
                <div>
                  <Label htmlFor="optional-media-description">Lyhyt kuvaus (valinnainen)</Label>
                  <MentionInput
                    id="optional-media-description"
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Kirjoita lyhyt kuvaus medialle..."
                    disabled={!mediaFile || addCommentMutation.isLoading}
                    className="mt-1"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={!mediaFile || addCommentMutation.isLoading}
                  size="sm"
                >
                  {addCommentMutation.isLoading ? 'Lähetetään...' : 'Lähetä media'}
                </Button>
              </form>
            )}
          </>
        )}
      </div>

      {selectedMedia && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm" onClick={closeLightbox}>
          <div className="relative max-w-3xl max-h-[80vh] w-full mx-4">
            <button 
              onClick={closeLightbox}
              className="absolute -top-2 -right-2 z-10 bg-black/50 text-white p-1.5 rounded-full hover:bg-opacity-70 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            {selectedMedia.type === 'image' ? (
              <img 
                src={selectedMedia.url} 
                alt="Media liite" 
                className="block max-h-[80vh] max-w-full object-contain mx-auto rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video 
                src={selectedMedia.url} 
                controls 
                autoPlay
                className="block max-h-[80vh] max-w-full mx-auto rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
