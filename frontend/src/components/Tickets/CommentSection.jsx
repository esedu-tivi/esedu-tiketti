import React, { useState, useEffect } from 'react';
import { User, Calendar, ImageIcon, VideoIcon, Check, FileIcon } from 'lucide-react';
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
      <div className="mt-2">
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
      <div className="mt-2">
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
    <div className="mt-2">
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
    e.preventDefault();
    
    // Clear any previous messages
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await handleAddComment();
      
      setSuccessMessage('Kommentti lisätty! 🎉');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowForm(false);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      // Check if the error is about requiring media response
      if (error.message && (
          error.message.includes('vaatii kuvan sisältävän vastauksen') || 
          error.message.includes('vaatii videon sisältävän vastauksen')
        )) {
        setErrorMessage(`Tämä tiketti vaatii ${ticket.responseFormat === 'KUVA' ? 'kuvan' : 'videon'} sisältävän vastauksen ensin. Käytä "Lisää media" -painiketta.`);
        setTimeout(() => setErrorMessage(''), 5000);
      } else {
        setErrorMessage('Virhe kommentin lisäämisessä. Yritä uudelleen.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    }
  };

  const handleMediaChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleMediaSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any previous messages
    setSuccessMessage('');
    setErrorMessage('');
    
    if (!mediaFile || !newComment.trim()) {
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('media', mediaFile);
      formData.append('content', newComment);
      
      await onAddMediaComment(formData);
      
      // If this is a support user adding a media response for the first time, mark it
      if (shouldUseMediaResponse() && !hasAddedMediaResponse) {
        setHasAddedMediaResponse(true);
      }
      
      setSuccessMessage(`${mediaFile.type.startsWith('image') ? 'Kuva' : 'Video'} lisätty! 🎉`);
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowMediaForm(false);
      setNewComment('');
      setMediaFile(null);
    } catch (error) {
      console.error('Error adding media comment:', error);
      setErrorMessage('Virhe mediasisällön lisäämisessä. Yritä uudelleen.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleMediaClick = (media) => {
    setSelectedMedia(media);
  };

  const closeLightbox = () => {
    setSelectedMedia(null);
  };

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-semibold mb-2">Keskustelu</h3>
      
      {comments.length === 0 ? (
        <div className="bg-gray-50 text-gray-500 p-4 rounded-lg text-sm text-center border border-gray-200">
          <p>Ei vielä kommentteja. Aloita keskustelu!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const styles = getCommentStyle(comment);
            return (
              <div key={comment.id} className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 ${styles.container}`}>
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
                  className={`text-sm ${styles.text} comment-content`}
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
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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

      {successMessage && (
        <div className="mt-2 p-3 text-green-700 bg-green-50 border border-green-200 rounded-lg shadow-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mt-2 p-3 text-red-700 bg-red-50 border border-red-200 rounded-lg shadow-sm flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        {!showForm && !showMediaForm ? (
          <>
            <Button 
              variant="outline" 
              onClick={() => setShowForm(true)}
              disabled={!canAddTextComment()}
              title={!canAddTextComment() ? getCommentDisabledMessage() : undefined}
              className="shadow-sm hover:shadow transition-shadow w-full sm:w-auto"
            >
              + Lisää tekstikommentti
            </Button>
            
            {/* Show media button for both ticket creator and support staff */}
            {(canAddMediaComment()) && (
              <Button
                variant="default"
                onClick={() => setShowMediaForm(true)}
                disabled={!canComment()}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-shadow w-full sm:w-auto"
              >
                + Lisää media
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setShowMediaForm(false);
                setMediaFile(null);
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
                className="shadow-sm hover:shadow transition-shadow w-full sm:w-auto"
              >
                {addCommentMutation.isLoading ? 'Lisätään...' : 'Lisää kommentti'}
              </Button>
            )}
            
            {showMediaForm && (
              <Button
                type="submit"
                disabled={!canComment() || addCommentMutation.isLoading || !newComment.trim() || !mediaFile}
                onClick={handleMediaSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow transition-shadow w-full sm:w-auto"
              >
                {addCommentMutation.isLoading ? 'Lisätään...' : 'Lisää media'}
              </Button>
            )}
          </>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <Label htmlFor="new-comment" className="text-sm font-medium text-gray-700">Lisää kommentti</Label>
          <MentionInput
            value={newComment}
            onChange={(value) => setNewComment(value)}
            placeholder="Kirjoita kommentti... Käytä @-merkkiä mainitaksesi käyttäjän"
            className="min-h-24 focus:border-blue-400 focus:ring-blue-400"
          />
        </form>
      )}
      
      {showMediaForm && (
        <form onSubmit={handleMediaSubmit} className="mt-4 space-y-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <Label htmlFor="new-comment" className="text-sm font-medium text-gray-700">Lisää media</Label>
          <MentionInput
            value={newComment}
            onChange={(value) => setNewComment(value)}
            placeholder="Kirjoita kommentti mediasisällölle... Käytä @-merkkiä mainitaksesi käyttäjän"
            className="min-h-24 focus:border-blue-400 focus:ring-blue-400"
          />
          
          <div className="mt-4">
            <Label htmlFor="media-file" className="text-sm font-medium text-gray-700">Valitse media</Label>
            <input
              id="media-file"
              type="file"
              accept={ticket.responseFormat === 'KUVA' 
                ? "image/*" 
                : ticket.responseFormat === 'VIDEO'
                ? "video/*"
                : "image/*,video/*"}
              onChange={handleMediaChange}
              className="mt-2 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 transition-colors
                      border border-gray-200 rounded-md"
            />
            {mediaFile && (
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                <FileIcon className="w-4 h-4 text-blue-500" />
                Valittu tiedosto: <span className="font-medium">{mediaFile.name}</span>
              </p>
            )}
          </div>
        </form>
      )}

      {!canComment() && (
        <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg border border-gray-200">
          {getCommentDisabledMessage()}
        </div>
      )}
      
      {shouldUseMediaResponse() && !hasAddedMediaResponse && (
        <div className="text-sm text-blue-700 bg-blue-50 p-3 mt-2 rounded-lg border border-blue-200 flex items-center gap-2">
          {ticket.responseFormat === 'KUVA' ? <ImageIcon className="w-4 h-4" /> : <VideoIcon className="w-4 h-4" />}
          <p>Tämä tiketti vaatii mediavastauksen ({ticket.responseFormat.toLowerCase()}). Lisää se ennen tekstikommentteja.</p>
        </div>
      )}
    </div>
  );
}
