import React, { useState } from 'react';
import { User, Calendar, ImageIcon, VideoIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import MentionInput from '../MentionInput';
import { useAuth } from '../../providers/AuthProvider';
import { Avatar, AvatarFallback, Badge } from '../ui/Avatar';

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
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);

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
    // All support staff and admins can add media comments if they can comment at all
    return (userRole === 'SUPPORT' || userRole === 'ADMIN') && canComment();
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

    await handleAddComment();

    if (!addCommentMutation.isError) {
      setSuccessMessage('Kommentti lisätty! 🎉');
      setTimeout(() => setSuccessMessage(''), 1500);
      setShowForm(false);
      setNewComment('');
    }
  };

  const handleMediaChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
    }
  };

  const handleMediaSubmit = async (e) => {
    e.preventDefault();
    
    if (!mediaFile || !newComment.trim()) {
      return;
    }
    
    const formData = new FormData();
    formData.append('media', mediaFile);
    formData.append('content', newComment);
    
    await onAddMediaComment(formData);
    
    setSuccessMessage(`${mediaFile.type.startsWith('image') ? 'Kuva' : 'Video'} lisätty! 🎉`);
    setTimeout(() => setSuccessMessage(''), 1500);
    setShowMediaForm(false);
    setNewComment('');
    setMediaFile(null);
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
        <p className="text-sm text-gray-500">Ei vielä kommentteja. Aloita keskustelu!</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const styles = getCommentStyle(comment);
            return (
              <div key={comment.id} className={`p-3 rounded-lg border ${styles.container}`}>
                <p 
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
                
                <div className="text-xs mt-1 flex items-center space-x-2">
                  <User className={`w-3 h-3 ${styles.text}`} />
                  <span className={styles.author}>
                    {comment.author?.name || comment.author?.email || 'Tuntematon'}
                  </span>
                  <Calendar className={`w-3 h-3 ${styles.text}`} />
                  <span className={styles.text}>
                    {new Date(comment.createdAt).toLocaleDateString('fi-FI', {
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  
                  {/* Add media type indicator icons */}
                  {comment.mediaType === 'image' && (
                    <ImageIcon className={`w-3 h-3 ${styles.text}`} />
                  )}
                  {comment.mediaType === 'video' && (
                    <VideoIcon className={`w-3 h-3 ${styles.text}`} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Media Lightbox */}
      {selectedMedia && selectedMedia.type === 'image' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={closeLightbox}>
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={closeLightbox}
                className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
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
        <div className="mt-2 p-2 text-green-700 bg-green-100 border border-green-400 rounded">
          {successMessage}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!showForm && !showMediaForm ? (
          <>
            <Button 
              variant="outline" 
              onClick={() => setShowForm(true)}
              disabled={!canComment() || (shouldUseMediaResponse() && userRole === 'SUPPORT')}
              title={!canComment() ? getCommentDisabledMessage() : undefined}
            >
              + Lisää tekstikommentti
            </Button>
            
            {/* Show media response button always for all support staff */}
            {(userRole === 'SUPPORT' || userRole === 'ADMIN') && (
              <Button
                variant="default"
                onClick={() => setShowMediaForm(true)}
                disabled={!canComment()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
            >
              Peruuta
            </Button>
            
            {showForm && (
              <Button
                type="submit"
                disabled={!canComment() || addCommentMutation.isLoading || !newComment.trim()}
                onClick={handleSubmit}
              >
                {addCommentMutation.isLoading ? 'Lisätään...' : 'Lisää kommentti'}
              </Button>
            )}
            
            {showMediaForm && (
              <Button
                type="submit"
                disabled={!canComment() || addCommentMutation.isLoading || !newComment.trim() || !mediaFile}
                onClick={handleMediaSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addCommentMutation.isLoading ? 'Lisätään...' : 'Lisää media'}
              </Button>
            )}
          </>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Label htmlFor="new-comment">Lisää kommentti</Label>
          <MentionInput
            value={newComment}
            onChange={(value) => setNewComment(value)}
            placeholder="Kirjoita kommentti... Käytä @-merkkiä mainitaksesi käyttäjän"
          />
        </form>
      )}
      
      {showMediaForm && (
        <form onSubmit={handleMediaSubmit} className="mt-4 space-y-4">
          <Label htmlFor="new-comment">Lisää media</Label>
          <MentionInput
            value={newComment}
            onChange={(value) => setNewComment(value)}
            placeholder="Kirjoita kommentti mediasisällölle... Käytä @-merkkiä mainitaksesi käyttäjän"
          />
          
          <div className="mt-2">
            <Label htmlFor="media-file">Valitse media</Label>
            <input
              id="media-file"
              type="file"
              accept={ticket.responseFormat === 'KUVA' 
                ? "image/*" 
                : ticket.responseFormat === 'VIDEO'
                ? "video/*"
                : "image/*,video/*"}
              onChange={handleMediaChange}
              className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
            />
            {mediaFile && (
              <p className="text-sm text-gray-600 mt-1">
                Valittu tiedosto: {mediaFile.name}
              </p>
            )}
          </div>
        </form>
      )}

      {!canComment() && (
        <div className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">
          {getCommentDisabledMessage()}
        </div>
      )}
      
      {shouldUseMediaResponse() && userRole === 'SUPPORT' && !showMediaForm && (
        <div className="text-sm text-blue-700 bg-blue-50 p-2 mt-2 rounded border border-blue-200">
          <p>Tämä tiketti vaatii mediavastauksen ({ticket.responseFormat.toLowerCase()}).</p>
        </div>
      )}
    </div>
  );
}
