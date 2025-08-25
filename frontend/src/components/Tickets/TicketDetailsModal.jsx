import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTicket, addComment, addMediaComment, takeTicketIntoProcessing, releaseTicket, updateTicketStatusWithComment, transferTicket } from '../../utils/api';
import { useAuth } from '../../providers/AuthProvider';
import { useSocket } from '../../hooks/useSocket';
import { useUsers } from '../../hooks/useUsers';
import axios from 'axios';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../ui/Card';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import {
  AlertTriangle,
  Check,
  InfoIcon,
  User,
  Calendar,
  MessageSquare,
  Clock,
  Lock,
  ArrowRight,
  Circle,
  ChevronDown,
  ChevronUp,
  History,
  ImageIcon,
  VideoIcon,
  FileIcon,
  MoreVertical,
  ChevronsUpDown,
  Settings,
  X,
  ExternalLink,
  Bot,
  Sparkles
} from 'lucide-react';

import CommentSection from '../Tickets/CommentSection';
import SupportAssistantChat from '../AI/SupportAssistantChat';

// Add keyframe animations
import { keyframes, css } from '@emotion/react';
import { Global } from '@emotion/react';

// Custom animation styles
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeInDelayed = keyframes`
  0% { opacity: 0; }
  50% { opacity: 0; }
  100% { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

// Add these animation classes to Tailwind (normally you'd do this in tailwind.config.js)
// But for our demo, we'll inject them with inline styles
const animationStyles = css`
  .animate-fadeIn {
    animation: ${fadeIn} 0.3s ease-out forwards;
  }
  .animate-fadeInDelayed {
    animation: ${fadeInDelayed} 0.6s ease-out forwards;
  }
  .animate-slideUp {
    animation: ${slideUp} 0.4s ease-out forwards;
  }
  .hover\:scale-102:hover {
    transform: scale(1.02);
  }
`;

const SUPPORT_COLOR = {
  bg: 'bg-[#92C01F]',
  bgLight: 'bg-[#92C01F]/10',
  text: 'text-[#92C01F]',
  border: 'border-[#92C01F]/20'
};

const TabButton = ({ isActive, onClick, icon, label, badge = null }) => {
  const IconComponent = icon;
  return (
    <button
      onClick={(e) => {
        e.preventDefault(); // Prevent default browser behavior
        onClick();
      }}
      className={`px-4 py-3 flex items-center gap-2 transition-all duration-200 font-medium relative group ${
        isActive 
          ? 'text-blue-600' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <div className={`flex items-center gap-2 ${isActive ? '' : 'group-hover:translate-y-[-1px] transition-transform'}`}>
        <div className={`${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'} transition-colors duration-200`}>
          <IconComponent className="w-4 h-4" />
        </div>
        <span>{label}</span>
        {badge !== null && (
          <span className={`text-xs px-2 py-0.5 rounded-full transition-colors duration-200 ${
            isActive 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }`}>
            {badge}
          </span>
        )}
      </div>
      {isActive ? (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t"></div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent group-hover:bg-gray-200 transition-colors duration-200 rounded-t"></div>
      )}
    </button>
  );
};

const StatusBadge = ({ status, icon: Icon, color, animation }) => {
  // Extract the color name from the color class (e.g., 'bg-blue-100 text-blue-800' -> 'blue')
  const colorName = color.match(/bg-(\w+)-\d+/)?.[1] || 'gray';
  
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full shadow-sm ${color.bg} ${color.border} ${animation ? 'animate-pulse' : ''}`}>
      <Icon className={`w-3.5 h-3.5 ${color.icon}`} />
      <span className={`text-xs font-medium ${color.text}`}>{status}</span>
    </div>
  );
};

export default function TicketDetailsModal({ ticketId, onClose }) {
  const [newComment, setNewComment] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showTicketActions, setShowTicketActions] = useState(false);
  const ticketActionsRef = useRef(null);
  const queryClient = useQueryClient();
  const { userRole, user } = useAuth();
  const { subscribe } = useSocket();
  const [activeTab, setActiveTab] = useState('details');
  const [showAssistantChat, setShowAssistantChat] = useState(false);

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: !!ticketId,
  });

  useEffect(() => {
    if (!ticketId || !subscribe || !queryClient) return;

    console.log(`[TicketDetailsModal] useEffect triggered with ticketId: ${ticketId}`);

    console.log(`[Socket] Subscribing to newComment events for ticket ${ticketId}`);

    const setupSubscription = async () => {
      try {
        const unsubscribe = await subscribe('newComment', (commentData) => {
          console.log(`[Socket] Received newComment event:`, commentData);
          if (commentData && commentData.ticketId === ticketId) {
            console.log(`[Socket] Comment matches current ticket (${ticketId}). Invalidating query.`);
            queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
          } else {
             console.log(`[Socket] Comment does not match current ticket (${ticketId}). Ignoring.`);
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('[Socket] Error setting up newComment subscription:', error);
        return () => {};
      }
    };

    const cleanupPromise = setupSubscription();

    return () => {
      console.log(`[Socket] Cleaning up newComment subscription for ticket ${ticketId}`);
      cleanupPromise.then(cleanup => cleanup());
    };
  }, [ticketId, subscribe, queryClient]);

  // Only fetch users if the current user has permission (SUPPORT or ADMIN)
  // This prevents 403 errors for regular users
  const isSupportOrAdminUser = userRole === 'SUPPORT' || userRole === 'ADMIN';
  const { data: allUsers } = useUsers(); // This hook internally checks permissions
  
  // Calculate support users - must be before any conditional returns
  const ticketDataForUsers = ticket?.data || ticket?.ticket;
  const supportUsers = React.useMemo(() => {
    // Only calculate if user has permission to see users list
    if (!isSupportOrAdminUser || !allUsers || !ticketDataForUsers) return [];
    // Näytetään kaikki tukihenkilöt paitsi tiketin nykyinen käsittelijä
    return allUsers.filter(u => 
      (u.role === 'SUPPORT' || u.role === 'ADMIN') && 
      u.id !== ticketDataForUsers?.assignedToId
    );
  }, [isSupportOrAdminUser, allUsers, ticketDataForUsers]);

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      return addComment(ticketId, commentData.content);
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData || !oldData.ticket) return oldData;
        return {
          ...oldData,
          ticket: {
            ...oldData.ticket,
            comments: [...(oldData.ticket.comments || []), newComment],
          },
        };
      });
      queryClient.invalidateQueries(['ticket', ticketId]);
    },
  });

  const addMediaCommentMutation = useMutation({
    mutationFn: (formData) => addMediaComment(ticketId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', ticketId]);
      setNewComment('');
    },
    onError: (error) => {
      console.error('Median lisääminen epäonnistui:', error.message || 'Median lisääminen epäonnistui');
    },
  });

  const takeIntoProcessingMutation = useMutation({
    mutationFn: () => takeTicketIntoProcessing(ticketId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.data || data.ticket,
        };
      });
      // Only invalidate list queries - ticket data was already updated via setQueryData
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
    },
  });

  const releaseTicketMutation = useMutation({
    mutationFn: () => releaseTicket(ticketId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.data || data.ticket,
        };
      });
      // Only invalidate list queries - ticket data was already updated via setQueryData
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => updateTicketStatusWithComment(ticketId, status),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.data || data.ticket,
        };
      });
      // Only invalidate list queries - ticket data was already updated via setQueryData
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
    },
  });

  const transferTicketMutation = useMutation({
    mutationFn: ({ targetUserId }) => transferTicket(ticketId, targetUserId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.data || data.ticket,
        };
      });
      // Only invalidate list queries - ticket data was already updated via setQueryData
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      setShowTransferDialog(false);
    },
  });

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        content: newComment,
      });
    } catch (error) {
      console.error('Virhe kommentin lisäämisessä:', error);
      // Rethrow the error so it can be caught by the CommentSection component
      throw error;
    }
  };

  const handleAddMediaComment = async (formData) => {
    if (!formData) return;
    try {
      await addMediaCommentMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Virhe media-kommentin lisäämisessä:', error);
      // Rethrow the error so it can be caught by the CommentSection component
      throw error;
    }
  };

  const handleTakeIntoProcessing = async () => {
    try {
      await takeIntoProcessingMutation.mutateAsync();
    } catch (error) {
      console.error('Error taking ticket into processing:', error);
    }
  };

  const handleReleaseTicket = async () => {
    try {
      await releaseTicketMutation.mutateAsync();
    } catch (error) {
      console.error('Error releasing ticket:', error);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateStatusMutation.mutateAsync(newStatus);
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const handleTransferTicket = async (targetUserId) => {
    try {
      await transferTicketMutation.mutateAsync({ targetUserId });
    } catch (error) {
      console.error('Error transferring ticket:', error);
    }
  };

  const handleImageClick = (attachment) => {
    setSelectedImage(attachment);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'LOW':
        return {
          color: 'text-green-600',
          icon: Check,
          text: 'Matala prioriteetti',
        };
      case 'MEDIUM':
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
      case 'HIGH':
        return {
          color: 'text-orange-600',
          icon: AlertTriangle,
          text: 'Korkea prioriteetti',
        };
      case 'CRITICAL':
        return {
          color: 'text-red-600',
          icon: AlertTriangle,
          text: 'Kriittinen prioriteetti',
        };
      default:
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali prioriteetti',
        };
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'OPEN':
        return {
          color: 'bg-blue-100 text-blue-800',
          icon: AlertTriangle,
          text: 'Avoin',
          animation: 'animate-pulse'
        };
      case 'IN_PROGRESS':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          text: 'Käsittelyssä',
          animation: 'animate-bounce'
        };
      case 'RESOLVED':
        return {
          color: 'bg-green-100 text-green-800',
          icon: Check,
          text: 'Ratkaistu',
          animation: 'animate-fade-in'
        };
      case 'CLOSED':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: Lock,
          text: 'Suljettu',
          animation: ''
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: InfoIcon,
          text: status,
          animation: ''
        };
    }
  };

  const formatDateTime = (date) => {
    if (!date) return 'Ei määritelty';
    const formattedDate = new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const timeAgo = formatTimeAgo(date);
    return `${formattedDate} (${timeAgo})`;
  };

  const formatTimeAgo = (date, isEstimate = false) => {
    const now = new Date();
    const target = new Date(date);
    const diffInSeconds = Math.floor((now - target) / 1000);
    
    // Jos kyseessä on arvioitu aika, käytetään eri formaattia
    if (isEstimate) {
      if (diffInSeconds < 0) {
        const absDiff = Math.abs(diffInSeconds);
        if (absDiff < 3600) return `${Math.ceil(absDiff / 60)} min`;
        if (absDiff < 86400) return `${Math.ceil(absDiff / 3600)} h`;
        return `${Math.ceil(absDiff / 86400)} pv`;
      }
      return 'Ylitetty';
    }
    
    // Normaalit aikaleimät
    if (diffInSeconds < 30) return 'juuri nyt';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min sitten`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h sitten`;
    return `${Math.floor(diffInSeconds / 86400)} pv sitten`;
  };

  const calculateTimeLeft = (estimatedTime) => {
    if (!estimatedTime) return null;
    const now = new Date();
    const estimated = new Date(estimatedTime);
    const diffInSeconds = Math.floor((estimated - now) / 1000);
    
    if (diffInSeconds < 0) return 'Ylitetty';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h`;
    return `${Math.floor(diffInSeconds / 86400)} pv`;
  };

  const calculateProcessingTime = (startDate, endDate) => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (ticketActionsRef.current && !ticketActionsRef.current.contains(event.target)) {
        setShowTicketActions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ticketActionsRef]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl p-6">
          <div className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Tiketin lataus epäonnistui</span>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket || (!ticket.data && !ticket.ticket)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl p-6">
          <div className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Tikettiä ei löytynyt</span>
          </div>
        </div>
      </div>
    );
  }

  const ticketData = ticket.data || ticket.ticket;
  const priorityInfo = getPriorityInfo(ticketData?.priority || 'MEDIUM');
  const statusInfo = getStatusInfo(ticketData?.status || 'OPEN');
  const PriorityIcon = priorityInfo.icon;
  const StatusIcon = statusInfo.icon;
  const timeLeft = calculateTimeLeft(ticketData.estimatedCompletionTime);
  const category = ticketData?.category?.name || 'Ei määritelty';

  const isSupportOrAdmin = userRole === 'SUPPORT' || userRole === 'ADMIN';
  const isAssignedToUser = ticketData?.assignedToId === user?.id;
  const canModifyTicket = isSupportOrAdmin && (isAssignedToUser || userRole === 'ADMIN');
  const canUseAssistant = isSupportOrAdmin && isAssignedToUser && ticketData?.status === 'IN_PROGRESS';

  const createdBy =
    ticketData?.createdBy?.name ||
    ticketData?.createdBy?.email ||
    'Ei määritelty';
  const createdAt = ticketData?.createdAt
    ? new Date(ticketData.createdAt).toLocaleDateString('fi-FI', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Ei määritelty';
  const updatedAt = ticketData?.updatedAt
    ? new Date(ticketData.updatedAt).toLocaleDateString('fi-FI', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Ei määritelty';

  const handleClose = (e) => {
    if (e.target.id === 'modal-background' || e.target.id === 'modal-content-area') {
      if (!showAssistantChat) {
      onClose();
      }
    }
  };

  const comments = ticketData?.comments || [];

  const TransferDialog = () => {
    if (!showTransferDialog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium mb-4">Siirrä tiketti toiselle tukihenkilölle</h3>
          <div className="space-y-4">
            {supportUsers && supportUsers.length > 0 ? (
              supportUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleTransferTicket(user.id)}
                  className="w-full text-left px-4 py-2 rounded hover:bg-gray-100 flex items-center justify-between"
                >
                  <span>{user.name}</span>
                  <span className="text-sm text-gray-500">{user.email}</span>
                </button>
              ))
            ) : (
              <p className="text-center text-gray-500">Ei muita tukihenkilöitä saatavilla</p>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowTransferDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              Peruuta
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Timeline = ({ showTimeline = false }) => {
    // If showTimeline is passed as true, we don't need the toggle button
    const [localShowTimeline, setLocalShowTimeline] = useState(showTimeline);

    useEffect(() => {
      setLocalShowTimeline(showTimeline);
    }, [showTimeline]);

    // Yhdistetään kaikki tapahtumat yhteen aikajanaan
    const allEvents = [
      {
        id: 'creation',
        type: 'system',
        date: ticketData.createdAt,
        icon: Calendar,
        color: 'blue',
        title: 'Tiketti luotu',
        details: `Luonut: ${ticketData.createdBy?.name}`,
        isSystemEvent: true,
        isSystemMessage: true
      },
      ...(ticketData.processingStartedAt ? [{
        id: 'start',
        type: 'system',
        date: ticketData.processingStartedAt,
        icon: Clock,
        color: 'yellow',
        title: 'Otettu käsittelyyn',
        details: ticketData.assignedTo ? `Käsittelijä: ${ticketData.assignedTo.name}` : null,
        isSystemEvent: true,
        isSystemMessage: true
      }] : []),
      // Järjestelmän automaattiset kommentit
      ...comments
        .filter(comment => comment.author?.email === 'system@esedu.fi')
        .map(comment => {
          // Määritellään värit viestin sisällön perusteella
          let color = 'gray';
          let isSystemMessage = true;
          
          // Tulostetaan viestin sisältö debuggausta varten
          console.log('System message content:', comment.content);
          
          if (comment.content.includes('IN_PROGRESS')) {
            color = 'yellow';
          } else if (comment.content.includes('RESOLVED')) {
            color = 'green';
          } else if (comment.content.includes('CLOSED')) {
            color = 'gray';
          } else if (comment.content.includes('vapautettu')) {
            color = 'blue';
          } else if (comment.content.includes('käsittelijä vaihdettu:') || comment.content.includes('→')) {
            color = 'transfer';
          }
          
          return {
            id: comment.id,
            type: 'system',
            date: comment.createdAt,
            icon: MessageSquare,
            color,
            title: 'Järjestelmäviesti',
            details: comment.content,
            isSystemEvent: true,
            isSystemMessage
          };
        }),
      // Käyttäjien kommentit pienemmässä koossa
      ...comments
        .filter(comment => comment.author?.email !== 'system@esedu.fi')
        .map(comment => {
          const isCreator = comment.author?.id === ticketData.createdById;
          const hasMedia = comment.mediaUrl && comment.mediaType;
          const mediaTypeDisplay = comment.mediaType === 'image' ? 'kuva' : 'video';

          // Create title with media info if present
          const title = isCreator 
            ? hasMedia ? `Käyttäjän kommentti (${mediaTypeDisplay})` : 'Käyttäjän kommentti'
            : hasMedia ? `Tukihenkilön kommentti (${mediaTypeDisplay})` : 'Tukihenkilön kommentti';

          return {
            id: comment.id,
            type: 'comment',
            date: comment.createdAt,
            icon: hasMedia ? (comment.mediaType === 'image' ? ImageIcon : VideoIcon) : MessageSquare,
            color: 'gray',
            title: title,
            details: comment.content + (hasMedia ? ` [Liitetty ${mediaTypeDisplay}]` : ''),
            author: comment.author?.name,
            isSystemEvent: false,
            customColors: !isCreator ? SUPPORT_COLOR : null,
            hasMedia: hasMedia,
            mediaType: comment.mediaType
          };
        }),
      ...(ticketData.processingEndedAt ? [{
        id: 'end',
        type: 'system',
        date: ticketData.processingEndedAt,
        icon: Check,
        color: 'green',
        title: 'Käsittely päättynyt',
        details: `Tila: ${ticketData.status}${ticketData.processingStartedAt ? 
          ` • Käsittelyaika: ${calculateProcessingTime(ticketData.processingStartedAt, ticketData.processingEndedAt)}` : ''}`,
        isSystemEvent: true,
        isSystemMessage: true
      }] : [])
    ].sort((a, b) => {
        const dateDiff = new Date(a.date) - new Date(b.date);
        if (dateDiff !== 0) {
          return dateDiff;
        }
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });

    const systemEventsCount = allEvents.filter(e => e.isSystemEvent).length;
    const commentCount = allEvents.filter(e => !e.isSystemEvent).length;

    return (
      <div className="mt-4">
        {!showTimeline && (
        <button
            onClick={() => setLocalShowTimeline(!localShowTimeline)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">Tiketin tapahtumahistoria</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">({systemEventsCount} tapahtumaa</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">{commentCount} kommenttia)</span>
            </div>
          </div>
            {localShowTimeline ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        )}

        {(showTimeline || localShowTimeline) && (
          <div className={`${!showTimeline ? 'mt-4' : ''} relative pl-8 space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200`}>
            {allEvents.map((event, index) => {
              const Icon = event.icon;
              return (
                <div key={event.id} className={`relative animate-fadeIn ${!event.isSystemEvent ? 'pl-4' : ''}`}>
                  <Circle className={`absolute -left-10 w-4 h-4 ${
                    event.customColors ? event.customColors.text : `text-${event.color === 'transfer' ? 'transfer-500' : `${event.color}-500`}`
                  } fill-white ${!event.isSystemEvent ? 'w-3 h-3' : ''}`} />
                  <div className={`${
                    event.hasMedia 
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : event.customColors 
                        ? `bg-[#92C01F]/10 border border-gray-200` 
                        : event.isSystemEvent 
                          ? `${event.color === 'transfer' ? 'bg-transfer-50 border-transfer-200' : `bg-${event.color}-50 border-${event.color}-200`} shadow-sm` 
                          : `bg-gray-50 border border-gray-200`
                  } p-${event.isSystemEvent ? '4' : '3'} rounded-lg`}>
                    <div className={`flex items-center gap-2 text-sm ${
                      event.hasMedia 
                        ? 'text-blue-700' 
                        : event.customColors 
                          ? 'text-gray-700' 
                          : event.isSystemMessage 
                            ? `${event.color === 'transfer' ? 'text-transfer-700' : `text-${event.color}-700`}` 
                            : `text-${event.color}-700`
                    }`}>
                      <Icon className={`${event.isSystemEvent ? 'w-4 h-4' : 'w-3.5 h-3.5'} ${
                        event.isSystemMessage ? `${event.color === 'transfer' ? 'text-transfer-600' : `text-${event.color}-600`}` : ''
                      }`} />
                      <span className={`${event.isSystemEvent ? 'font-medium' : ''}`}>{event.title}</span>
                      <span className={event.customColors ? 'text-gray-500' : event.isSystemMessage ? `${event.color === 'transfer' ? 'text-transfer-600' : `text-${event.color}-600`}` : `text-${event.color}-500`}>•</span>
                      <span className={`${!event.isSystemEvent ? 'text-xs' : ''} ${event.isSystemMessage ? `${event.color === 'transfer' ? 'text-transfer-600' : `text-${event.color}-600`}` : ''}`}>{formatDateTime(event.date)}</span>
                    </div>
                    {event.details && (
                      <div className={`mt-1 ${event.isSystemEvent ? 'text-sm' : 'text-xs'} ${
                        event.customColors ? 'text-gray-700' : event.isSystemMessage ? `${event.color === 'transfer' ? 'text-transfer-600' : `text-${event.color}-600`}` : `text-${event.color}-600`
                      }`}>
                        {event.author && <span className="font-medium text-gray-900">{event.author}: </span>}
                        {event.details}
                      </div>
                    )}
                  </div>
                  {index < allEvents.length - 1 && (
                    <div className="absolute -left-8 top-8 bottom-0 w-0.5 bg-gray-200" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Dropdown menu action item component
  const ActionMenuItem = ({ onClick, icon, label, color = 'gray', disabled = false }) => {
    const IconComponent = icon;
    const bgColorClass = `bg-${color}-50 hover:bg-${color}-100`;
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : `${bgColorClass} hover:bg-opacity-80`} rounded-md transition-all duration-200 group`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${color}-100 text-${color}-700 group-hover:scale-110 transition-transform`}>
          <IconComponent className="w-4 h-4 flex-shrink-0" />
        </div>
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div
      id="modal-background"
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 md:p-8 overflow-y-auto animate-fadeIn"
      onClick={handleClose}
    >
      <div
        id="modal-content-area"
        className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative shadow-2xl transform transition-all duration-300 ease-in-out animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-none shadow-none">
          <CardHeader className="p-6 md:p-8 bg-gradient-to-r from-blue-800 via-indigo-800 to-indigo-900 text-white rounded-t-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-pattern opacity-5"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-transparent"></div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent"></div>
            <div className="absolute top-4 right-4 z-20">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClose} 
                className="bg-white/15 border-white/20 text-white hover:bg-white/25 rounded-full w-8 h-8 p-0 flex items-center justify-center shadow-sm backdrop-blur-sm transition-all duration-200"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-11 h-11 bg-white/15 rounded-full flex items-center justify-center shadow-lg ring-1 ring-white/20">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                      <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-white/95">
                        {ticketData.title || 'Ei määritelty'}
                      </CardTitle>
                      <span className="bg-white/25 px-2 py-0.5 rounded-md text-xs font-mono font-medium shadow-inner hidden sm:inline-block text-white">#{ticketData.id || 'Ei määritelty'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/75">
                      <span className="bg-white/25 px-2 py-0.5 rounded-md text-xs font-mono font-medium shadow-inner sm:hidden text-white">#{ticketData.id || 'Ei määritelty'}</span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/80" /> 
                        <span>{new Date(ticketData.createdAt).toLocaleDateString('fi-FI')}</span>
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-white/80" />
                        <span>{ticketData.createdBy?.name || 'Ei määritelty'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 md:mt-0">
                <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full shadow-md backdrop-blur-sm transition-all duration-300 self-start ${
                  priorityInfo.color === 'text-green-600' ? 'bg-green-800/30 text-green-50 border border-green-500/30' :
                  priorityInfo.color === 'text-yellow-600' ? 'bg-yellow-700/30 text-yellow-50 border border-yellow-500/30' :
                  priorityInfo.color === 'text-orange-600' ? 'bg-orange-800/30 text-orange-50 border border-orange-500/30' :
                  priorityInfo.color === 'text-red-600' ? 'bg-red-800/30 text-red-50 border border-red-500/30' :
                  'bg-blue-800/30 text-blue-50 border border-blue-500/30'
                }`}>
                  <div className="flex-shrink-0 p-1 rounded-full bg-white/15 flex items-center justify-center">
                    <PriorityIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-medium tracking-wide whitespace-nowrap">{priorityInfo.text}</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4 sticky top-0 bg-white z-20 py-3 border-b border-gray-100 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge 
                  status={statusInfo.text}
                  icon={StatusIcon}
                  color={statusInfo.color}
                  animation={statusInfo.animation}
                />
                
                {/* User can close their own ticket if not closed/resolved */}
                {ticketData.createdById === user?.id && 
                 ticketData.status !== 'CLOSED' && 
                 ticketData.status !== 'RESOLVED' && (
                  <Button
                    onClick={() => handleStatusChange('CLOSED')}
                    disabled={updateStatusMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="bg-gray-50 hover:bg-gray-100 shadow-sm border-gray-200 hover:shadow-md transition-all"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    {updateStatusMutation.isLoading ? 'Suljetaan...' : 'Sulje tiketti'}
                  </Button>
                )}
                
                {/* Support staff can take open ticket into processing */}
                {isSupportOrAdmin && ticketData.status === 'OPEN' && !ticketData.assignedToId && (
                  <Button
                    onClick={handleTakeIntoProcessing}
                    disabled={takeIntoProcessingMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    {takeIntoProcessingMutation.isLoading ? 'Otetaan käsittelyyn...' : 'Ota käsittelyyn'}
                  </Button>
                )}
                
                {/* Ticket actions dropdown for assigned support staff or admin */}
                {isSupportOrAdmin && 
                  ticketData.status === 'IN_PROGRESS' && 
                  (isAssignedToUser || userRole === 'ADMIN') && (
                  <div className="relative" ref={ticketActionsRef}>
                    <Button
                      onClick={() => setShowTicketActions(!showTicketActions)}
                      variant="outline"
                      size="sm"
                      className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                      <div className="bg-indigo-100 p-1 rounded-full">
                        <Settings className="w-3 h-3 text-indigo-600" />
                      </div>
                      <span className="hidden sm:inline">Toiminnot</span>
                      <ChevronsUpDown className="w-3 h-3 ml-0.5 opacity-70" />
                    </Button>
                    
                    {/* Background overlay on mobile */}
                    {showTicketActions && (
                      <div className="sm:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={() => setShowTicketActions(false)}></div>
                    )}
                    
                    {/* Dropdown menu */}
                    {showTicketActions && (
                      <div className="fixed sm:absolute bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto sm:mt-2 sm:w-64 z-50 bg-white shadow-xl sm:shadow-lg sm:ring-1 sm:ring-black/5 sm:rounded-lg focus:outline-none divide-y divide-gray-100 sm:origin-top-left animate-fadeIn">
                        <div className="sm:hidden px-4 py-3 border-b font-medium text-gray-700 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-indigo-500" />
                            <span>Toiminnot</span>
                          </div>
                          <button 
                            onClick={() => setShowTicketActions(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-2 space-y-1">
                          <ActionMenuItem 
                            onClick={handleReleaseTicket}
                            disabled={releaseTicketMutation.isLoading}
                            icon={ArrowRight}
                            label={releaseTicketMutation.isLoading ? 'Vapautetaan...' : 'Vapauta tiketti'}
                            color="yellow"
                          />
                          <ActionMenuItem 
                            onClick={() => {
                              setShowTransferDialog(true);
                              setShowTicketActions(false);
                            }}
                            disabled={transferTicketMutation.isLoading}
                            icon={User}
                            label={transferTicketMutation.isLoading ? 'Siirretään...' : 'Siirrä toiselle'}
                            color="blue"
                          />
                        </div>
                        <div className="p-2 space-y-1">
                          <ActionMenuItem 
                            onClick={() => handleStatusChange('RESOLVED')}
                            disabled={updateStatusMutation.isLoading}
                            icon={Check}
                            label="Merkitse ratkaistuksi"
                            color="green"
                          />
                          <ActionMenuItem 
                            onClick={() => handleStatusChange('CLOSED')}
                            disabled={updateStatusMutation.isLoading}
                            icon={Lock}
                            label="Sulje tiketti"
                            color="gray"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {isSupportOrAdmin && 
                  (ticketData.status === 'RESOLVED' || ticketData.status === 'CLOSED') && (
                  <Button
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    disabled={updateStatusMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-sm hover:shadow-md transition-all"
                  >
                    <ArrowRight className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Avaa tiketti uudelleen
                  </Button>
                )}

                {/* Show Assistant Button */} 
                {canUseAssistant && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent default browser behavior
                      setShowAssistantChat(!showAssistantChat);
                    }}
                    className={`transition-all duration-200 flex items-center gap-1.5 shadow-sm border ${ 
                      showAssistantChat 
                      ? 'bg-purple-100 text-purple-800 border-purple-300 ring-2 ring-purple-200' 
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
                    }`}
                    aria-label={showAssistantChat ? 'Sulje tukiavustaja' : 'Avaa tukiavustaja'}
                    title={showAssistantChat ? 'Sulje tukiavustaja' : 'Avaa tukiavustaja'}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${showAssistantChat ? 'text-purple-600' : 'text-purple-500'}`} />
                    <span className="hidden sm:inline">{showAssistantChat ? 'Piilota avustaja' : 'Tukiavustaja'}</span>
                  </Button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {ticketData.assignedTo && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full shadow-sm border border-blue-100 hover:shadow-md transition-all">
                    <div className="bg-blue-100 p-1 rounded-full">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                    <span className="truncate max-w-[150px] sm:max-w-none font-medium">
                      Käsittelijä: {ticketData.assignedTo.name}
                      </span>
                </div>
                )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex space-x-1">
                <TabButton 
                  isActive={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                  icon={InfoIcon}
                  label="Tiedot"
                />
                <TabButton 
                  isActive={activeTab === 'conversation'}
                  onClick={() => setActiveTab('conversation')}
                  icon={MessageSquare}
                  label="Keskustelu"
                  badge={comments.filter(comment => comment.author?.email !== 'system@esedu.fi').length || null}
                />
                <TabButton 
                  isActive={activeTab === 'attachments'}
                  onClick={() => setActiveTab('attachments')}
                  icon={FileIcon}
                  label="Liitteet"
                  badge={ticketData.attachments?.length || null}
                />
                <TabButton 
                  isActive={activeTab === 'timeline'}
                  onClick={() => setActiveTab('timeline')}
                  icon={History}
                  label="Aikajana"
                />
                </div>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main content area - changes based on active tab */}
              <div className={`md:col-span-2 space-y-6 ${activeTab !== 'details' && activeTab !== 'conversation' ? 'hidden' : ''}`}>
                {/* Details tab content */}
                {activeTab === 'details' && (
                  <>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 animate-fadeIn">
                      <h3 className="text-base font-medium text-gray-700 mb-4 flex items-center">
                        <InfoIcon className="w-4 h-4 mr-2 text-blue-500" />
                Ongelman kuvaus
              </h3>
                      <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {ticketData.description || 'Ei määritelty'}
              </p>
            </div>

            {ticketData.additionalInfo && (
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 animate-fadeInDelayed">
                        <h3 className="text-base font-medium text-gray-700 mb-4 flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2 text-blue-500" />
                  Lisätiedot
                </h3>
                        <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {ticketData.additionalInfo}
                </p>
              </div>
                    )}
                  </>
                )}

                {/* Conversation tab content */}
                {activeTab === 'conversation' && (
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 animate-fadeIn">
                    <CommentSection
                      comments={(
                        (ticketData.comments || [])
                        .filter(comment => comment.author?.email !== 'system@esedu.fi')
                        .sort((a, b) => {
                          const dateDiff = new Date(a.createdAt) - new Date(b.createdAt);
                          if (dateDiff !== 0) return dateDiff;
                          if (a.id < b.id) return -1;
                          if (a.id > b.id) return 1;
                          return 0;
                        })
                      )}
                      newComment={newComment}
                      setNewComment={setNewComment}
                      handleAddComment={handleAddComment}
                      addCommentMutation={addCommentMutation}
                      ticket={ticketData}
                      onAddMediaComment={handleAddMediaComment}
                    />
                  </div>
                )}
              </div>

              {/* Attachments tab content - Full width when active */}
              {activeTab === 'attachments' && ticketData.attachments && ticketData.attachments.length > 0 && (
                <div className="md:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="text-base font-medium text-gray-700 mb-4 flex items-center">
                    <FileIcon className="w-4 h-4 mr-2 text-blue-500" />
                  Liitteet ({ticketData.attachments.length})
                </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {ticketData.attachments.map((attachment) => (
                    <div 
                      key={attachment.id} 
                      className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 group"
                    >
                      {attachment.mimetype.startsWith('image/') ? (
                        <div 
                          onClick={() => handleImageClick(attachment)}
                          className="cursor-pointer"
                        >
                          <div className="relative">
                            <img 
                              src={`http://localhost:3001${attachment.path}`} 
                              alt={attachment.filename} 
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                          </div>
                          <div className="p-2 text-xs truncate text-gray-600 border-t bg-gray-50 group-hover:bg-blue-50 transition-colors duration-200 flex items-center">
                            <ImageIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{attachment.filename}</span>
                          </div>
                        </div>
                      ) : attachment.mimetype.startsWith('video/') ? (
                        <a 
                          href={`http://localhost:3001${attachment.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200">
                            <VideoIcon className="w-10 h-10 text-blue-500 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                          </div>
                          <div className="p-2 text-xs truncate text-gray-600 border-t bg-gray-50 group-hover:bg-blue-50 transition-colors duration-200 flex items-center">
                            <VideoIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{attachment.filename}</span>
                          </div>
                        </a>
                      ) : (
                        <a 
                          href={`http://localhost:3001${attachment.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="w-full h-32 bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200">
                            <FileIcon className="w-10 h-10 text-gray-500 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                          </div>
                          <div className="p-2 text-xs truncate text-gray-600 border-t bg-gray-50 group-hover:bg-blue-50 transition-colors duration-200 flex items-center">
                            <FileIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{attachment.filename}</span>
                          </div>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Timeline tab content - Full width when active */}
              {activeTab === 'timeline' && (
                <div className="md:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <Timeline showTimeline={true} />
                </div>
              )}

              {/* Right sidebar - Only shown on details and conversation tabs */}
              {(activeTab === 'details' || activeTab === 'conversation') && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 animate-fadeIn">
                    <h3 className="text-base font-medium text-gray-700 mb-4 flex items-center">
                      <InfoIcon className="w-4 h-4 mr-2 text-blue-500" />
                      Tiketin tiedot
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Kategoria</span>
                        <span className="text-sm font-medium">{category}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Laite</span>
                        <span className="text-sm font-medium">{ticketData.device ?? 'Ei määritelty'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Luonut</span>
                        <span className="text-sm font-medium">{createdBy}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Luotu</span>
                        <span className="text-sm font-medium">{createdAt}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Muokattu</span>
                        <span className="text-sm font-medium">{updatedAt}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 animate-fadeInDelayed">
                    <h3 className="text-base font-medium text-gray-700 mb-4 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      Aikajana
                    </h3>
                    
                    <div className="space-y-4">
                      {ticketData.processingStartedAt && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-500">Käsittely aloitettu</span>
                          <span className="text-sm font-medium">{formatDateTime(ticketData.processingStartedAt)}</span>
                        </div>
                      )}
                      
                      {ticketData.estimatedCompletionTime && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-500">Arvioitu valmistuminen</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {new Date(ticketData.estimatedCompletionTime).toLocaleString('fi-FI', {
                                day: 'numeric',
                                month: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {timeLeft && (
                              <div className={`mt-1 px-2 py-0.5 rounded-full text-xs inline-block ${
                                timeLeft === 'Ylitetty' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                              }`}>
                                {timeLeft}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {ticketData.processingEndedAt && (
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-sm text-gray-500">Käsittely päättynyt</span>
                          <span className="text-sm font-medium">{formatDateTime(ticketData.processingEndedAt)}</span>
                        </div>
                      )}
                      
                      {ticketData.processingStartedAt && ticketData.processingEndedAt && (
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-500">Käsittelyaika</span>
                          <span className="text-sm font-medium">{calculateProcessingTime(ticketData.processingStartedAt, ticketData.processingEndedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Image Lightbox */}
            {selectedImage && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-md" onClick={closeLightbox}>
                <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
                  <div className="absolute top-4 right-4 z-10">
                    <button 
                      onClick={closeLightbox}
                      className="bg-black/50 text-white p-2 rounded-full hover:bg-opacity-70 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <img 
                    src={`http://localhost:3001${selectedImage.path}`} 
                    alt={selectedImage.filename} 
                    className="max-h-[90vh] max-w-full object-contain mx-auto rounded-lg shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="mt-2 text-center text-white">{selectedImage.filename}</div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between items-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 rounded-b-xl border-t border-gray-200">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="shadow-sm hover:shadow transition-shadow flex items-center gap-2 bg-white hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                <span>Sulje</span>
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => window.print()}
                variant="outline"
                className="shadow-sm hover:shadow-md transition-all hidden sm:flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Tulosta</span>
            </Button>
            <Button
                onClick={() => window.open(`/tickets/${ticketData.id}`, '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-700 opacity-0 group-hover:opacity-100 rounded-md transition-opacity duration-300"></div>
                <span className="relative flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>Avaa linkkinä</span>
                </span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
      
      {/* Render Support Assistant Chat conditionally */} 
      {showAssistantChat && canUseAssistant && (
        <SupportAssistantChat 
          ticket={ticketData} 
          user={user} 
          onClose={() => setShowAssistantChat(false)}
        />
      )}

      <TransferDialog />
    </div>
  );
}
