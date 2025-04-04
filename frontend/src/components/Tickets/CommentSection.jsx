import React, { useState, useEffect } from 'react';
import { User, Calendar, ImageIcon, VideoIcon, Check, FileIcon, X, Send, Paperclip, MessageSquare, InfoIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import MentionInput from '../MentionInput';
import { useAuth } from '../../providers/AuthProvider';
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
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [hasAddedMediaResponse, setHasAddedMediaResponse] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Check if support staff has already added a media response
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
    // Allow ticket creators to add media comments
    if (ticket.createdById === user?.id) {
      return ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
    }
    
    // All support staff and admins can add media comments if they can comment at all
    return (userRole === 'SUPPORT' || userRole === 'ADMIN') && canComment();
  };

  const canAddTextComment = () => {
    // For ticket creators, they can always add text comments if the ticket is open
    if (ticket.createdById === user?.id) {
      return ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
    }
    
    // For support staff handling tickets requiring media, they need to add a media response first
    if (shouldUseMediaResponse()) {
      return hasAddedMediaResponse;
    }
    
    // Otherwise, use the standard commenting rules
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
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage('Kommentin lisääminen epäonnistui: ' + (error.message || 'Tuntematon virhe'));
      
      // Clear error message after 5 seconds
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
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      setErrorMessage('Median lisääminen epäonnistui: ' + (error.message || 'Tuntematon virhe'));
      
      // Clear error message after 5 seconds
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

  return (
    <div className="space-y-4">
      {comments.length === 0 ? (
        <div className="bg-gray-50 text-gray-500 p-6 rounded-lg text-sm text-center border border-gray-200">
          <p>Ei vielä kommentteja. Aloita keskustelu!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const styles = getCommentStyle(comment);
            return (
              <div key={comment.id} className={`p-5 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${styles.container}`}>
                <div className="flex items-start gap-3 mb-3">
                  <ProfilePicture 
                    email={comment.author?.email}
                    name={comment.author?.name || 'Tuntematon'}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={styles.author}>
                        {comment.author?.name || comment.author?.email || 'Tuntematon'}
                      </span>
                      {comment.mediaType && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {comment.mediaType === 'image' ? 'Kuva' : 'Video'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString('fi-FI', {
                        day: 'numeric',
                        month: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                
                <div 
                  className={`text-sm ${styles.text} comment-content leading-relaxed`}
                  dangerouslySetInnerHTML={{ __html: formatCommentContent(comment.content) }}
                />
                
                {/* Render media content if present */}
                {comment.mediaUrl && (
                  <MediaContent 
                    mediaUrl={comment.mediaUrl} 
                    mediaType={comment.mediaType}
                    onClick={handleMediaClick}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Media Lightbox */}
      {selectedMedia && selectedMedia.type === 'image' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 backdrop-blur-sm" onClick={closeLightbox}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={closeLightbox}
                className="bg-black/50 text-white p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <img 
              src={selectedMedia.url} 
              alt="Mediakuva" 
              className="max-h-[90vh] max-w-full object-contain mx-auto rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
          <Check className="h-5 w-5 mr-2 text-green-500" />
          <p>{successMessage}</p>
        </div>
      )}
      
      {/* Error message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        {!showForm && !showMediaForm ? (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => setShowForm(true)}
              disabled={!canAddTextComment()}
              title={!canAddTextComment() ? getCommentDisabledMessage() : undefined}
              className="shadow-sm hover:shadow transition-shadow w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Lisää tekstikommentti
            </Button>
            
            {/* Show media button for both ticket creator and support staff */}
            {(canAddMediaComment()) && (
              <Button
                variant="default"
                onClick={() => setShowMediaForm(true)}
                disabled={!canComment()}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-shadow w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Paperclip className="w-4 h-4" />
                Lisää media
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setShowMediaForm(false);
                setMediaFile(null);
                setPreviewUrl(null);
              }}
              className="shadow-sm hover:shadow transition-shadow w-full sm:w-auto"
            >
              Peruuta
            </Button>
            
            {showForm && (
              <Button
                type="submit"
                disabled={!canAddTextComment() || addCommentMutation.isLoading || !newComment.trim()}
                onClick={handleSubmit}
                className="shadow-sm hover:shadow transition-shadow w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {addCommentMutation.isLoading ? 'Lisätään...' : 'Lähetä kommentti'}
              </Button>
            )}
            
            {showMediaForm && (
              <Button
                type="submit"
                disabled={!canComment() || addCommentMutation.isLoading || !mediaFile}
                onClick={handleMediaSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-shadow w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Paperclip className="w-4 h-4" />
                {addCommentMutation.isLoading ? 'Lisätään...' : 'Lisää media'}
              </Button>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <Label htmlFor="new-comment" className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Lisää kommentti
          </Label>
          <MentionInput
            value={newComment}
            onChange={(value) => setNewComment(value)}
            placeholder="Kirjoita kommentti... Käytä @-merkkiä mainitaksesi käyttäjän"
            className="min-h-24 focus:border-blue-400 focus:ring-blue-400 rounded-lg"
          />
        </form>
      )}
      
      {showMediaForm && (
        <form onSubmit={handleMediaSubmit} className="mt-4 space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <Label htmlFor="media-file" className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-500" />
            Lisää mediatiedosto
          </Label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => document.getElementById('media-file').click()}>
            <input
              type="file"
              id="media-file"
              accept="image/*,video/*"
              onChange={handleMediaChange}
              className="hidden"
            />
            
            {!mediaFile ? (
              <div>
                <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">Klikkaa lisätäksesi kuva tai video</p>
                <p className="text-xs text-gray-400 mt-1">tai raahaa tiedosto tähän</p>
              </div>
            ) : previewUrl ? (
              <div className="relative">
                <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMediaFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <FileIcon className="w-5 h-5" />
                <span>{mediaFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMediaFile(null);
                  }}
                  className="bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          
          <Label htmlFor="comment-text" className="text-sm font-medium text-gray-700 mt-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Kommentin teksti (valinnainen)
          </Label>
          <MentionInput
            value={newComment}
            onChange={(value) => setNewComment(value)}
            placeholder="Voit lisätä kuvailevan tekstin..."
            className="min-h-24 focus:border-blue-400 focus:ring-blue-400 rounded-lg"
          />
        </form>
      )}

      {!canComment() && (
        <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center gap-2">
          <InfoIcon className="w-4 h-4 text-gray-400" />
          {getCommentDisabledMessage()}
        </div>
      )}
      
      {shouldUseMediaResponse() && !hasAddedMediaResponse && (
        <div className="text-sm text-blue-700 bg-blue-50 p-4 mt-2 rounded-lg border border-blue-200 flex items-center gap-2">
          {ticket.responseFormat === 'KUVA' ? <ImageIcon className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
          <p>Tämä tiketti vaatii mediavastauksen ({ticket.responseFormat.toLowerCase()}). Lisää se ennen tekstikommentteja.</p>
        </div>
      )}
    </div>
  );
}
