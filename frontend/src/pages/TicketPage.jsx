import * as React from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTicket, addComment, addMediaComment, takeTicketIntoProcessing, releaseTicket, updateTicketStatusWithComment, transferTicket, fetchSupportUsers } from '../utils/api';
import { useAuth } from '../providers/AuthProvider';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
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
} from 'lucide-react';

import CommentSection from '../components/Tickets/CommentSection';

const SUPPORT_COLOR = {
  bg: 'bg-[#92C01F]',
  bgLight: 'bg-[#92C01F]/10',
  text: 'text-[#92C01F]',
  border: 'border-[#92C01F]/20'
};

export default function TicketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const queryClient = useQueryClient();
  const { userRole, user } = useAuth();

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => fetchTicket(id),
    enabled: !!id,
  });

  const { data: supportUsers } = useQuery({
    queryKey: ['support-users'],
    queryFn: async () => {
      const data = await fetchSupportUsers();
      // Näytetään kaikki tukihenkilöt paitsi tiketin nykyinen käsittelijä
      return data.filter(u => u.id !== ticketData?.assignedToId);
    },
    enabled: showTransferDialog,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      return addComment(id, commentData.content);
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData(['ticket', id], (oldData) => {
        if (!oldData || !oldData.ticket) return oldData;
        return {
          ...oldData,
          ticket: {
            ...oldData.ticket,
            comments: [...(oldData.ticket.comments || []), newComment],
          },
        };
      });
      queryClient.invalidateQueries(['ticket', id]);
    },
  });

  const addMediaCommentMutation = useMutation({
    mutationFn: (formData) => addMediaComment(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', id]);
    },
  });

  const takeIntoProcessingMutation = useMutation({
    mutationFn: () => takeTicketIntoProcessing(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', id]);
    },
  });

  const releaseTicketMutation = useMutation({
    mutationFn: () => releaseTicket(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', id]);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => updateTicketStatusWithComment(id, status),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', id]);
    },
  });

  const transferTicketMutation = useMutation({
    mutationFn: ({ targetUserId }) => transferTicket(id, targetUserId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', id], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', id]);
      setShowTransferDialog(false);
    },
  });

  const handleAddComment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addCommentMutation.mutateAsync({
        content: newComment,
      });

      setNewComment('');
    } catch (error) {
      console.error('Virhe kommentin lisäämisessä:', error);
    }
  };

  const handleAddMediaComment = async (formData) => {
    try {
      await addMediaCommentMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Virhe media-kommentin lisäämisessä:', error);
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
          animation: 'animate-pulse',
        };
      case 'IN_PROGRESS':
        return {
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          text: 'Käsittelyssä',
          animation: 'animate-bounce',
        };
      case 'RESOLVED':
        return {
          color: 'bg-green-100 text-green-800',
          icon: Check,
          text: 'Ratkaistu',
          animation: 'animate-fade-in',
        };
      case 'CLOSED':
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: Lock,
          text: 'Suljettu',
          animation: '',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          icon: InfoIcon,
          text: status,
          animation: '',
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

  if (isLoading) return <div>Ladataan...</div>;
  if (error) return <div>Virhe: {error.message}</div>;
  if (!ticket || !ticket.ticket) return <div>Tikettiä ei löytynyt</div>;

  const ticketData = ticket.ticket;
  const category = ticketData?.category?.name || 'Ei määritelty';
  const priorityInfo = getPriorityInfo(ticketData?.priority || 'MEDIUM');
  const statusInfo = getStatusInfo(ticketData?.status || 'OPEN');
  const PriorityIcon = priorityInfo.icon;
  const StatusIcon = statusInfo.icon;
  const timeLeft = calculateTimeLeft(ticketData.estimatedCompletionTime);
  
  // Debug tulostukset
  console.log('Tiketin tiedot:', ticketData);
  console.log('User role:', userRole);
  console.log('User id:', user?.id);
  console.log('Ticket status:', ticketData?.status);
  console.log('Ticket assignedToId:', ticketData?.assignedToId);

  const isSupportOrAdmin = userRole === 'SUPPORT' || userRole === 'ADMIN';
  const isAssignedToUser = ticketData?.assignedToId === user?.id;
  const canModifyTicket = isSupportOrAdmin && (isAssignedToUser || userRole === 'ADMIN');

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

  const Timeline = () => {
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
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    const systemEventsCount = allEvents.filter(e => e.isSystemEvent).length;
    const commentCount = allEvents.filter(e => !e.isSystemEvent).length;

    return (
      <div className="mt-8">
        <button
          onClick={() => setShowTimeline(!showTimeline)}
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
          {showTimeline ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showTimeline && (
          <div className="mt-4 relative pl-8 space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
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
                        event.hasMedia 
                          ? 'text-blue-600' 
                          : event.isSystemMessage 
                            ? `${event.color === 'transfer' ? 'text-transfer-600' : `text-${event.color}-600`}` 
                            : ''
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

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Card>
        <CardHeader className="p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  {ticketData.title || 'Ei määritelty'}
                </CardTitle>
                <p className="text-sm opacity-80">
                  Tiketti #{ticketData.id || 'Ei määritelty'}
                </p>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full shadow-lg border-2 bg-gray-100 ${priorityInfo.color}`}
            >
              <PriorityIcon className="w-5 h-5" />
              <span className="text-sm font-medium">{priorityInfo.text}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.color} ${statusInfo.animation}`}
              >
                <StatusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{statusInfo.text}</span>
              </div>
              {ticketData.createdById === user?.id && 
                ticketData.status !== 'CLOSED' && 
                ticketData.status !== 'RESOLVED' && (
                <Button
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={updateStatusMutation.isLoading}
                  variant="outline"
                  size="sm"
                  className="bg-gray-50 hover:bg-gray-100"
                >
                  {updateStatusMutation.isLoading ? 'Suljetaan...' : 'Sulje tiketti'}
                </Button>
              )}
              {isSupportOrAdmin && ticketData.status === 'OPEN' && !ticketData.assignedToId && (
                <Button
                  onClick={handleTakeIntoProcessing}
                  disabled={takeIntoProcessingMutation.isLoading}
                  variant="outline"
                  size="sm"
                >
                  {takeIntoProcessingMutation.isLoading ? 'Otetaan käsittelyyn...' : 'Ota käsittelyyn'}
                </Button>
              )}
              {isSupportOrAdmin && 
                ticketData.status === 'IN_PROGRESS' && 
                (isAssignedToUser || userRole === 'ADMIN') && (
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleReleaseTicket}
                    disabled={releaseTicketMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="bg-yellow-50 hover:bg-yellow-100"
                  >
                    {releaseTicketMutation.isLoading ? 'Vapautetaan...' : 'Vapauta tiketti'}
                  </Button>
                  <Button
                    onClick={() => setShowTransferDialog(true)}
                    disabled={transferTicketMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    {transferTicketMutation.isLoading ? 'Siirretään...' : 'Siirrä toiselle'}
                  </Button>
                  <Button
                    onClick={() => handleStatusChange('RESOLVED')}
                    disabled={updateStatusMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="bg-green-50 hover:bg-green-100"
                  >
                    Merkitse ratkaistuksi
                  </Button>
                  <Button
                    onClick={() => handleStatusChange('CLOSED')}
                    disabled={updateStatusMutation.isLoading}
                    variant="outline"
                    size="sm"
                    className="bg-gray-50 hover:bg-gray-100"
                  >
                    Sulje tiketti
                  </Button>
                </div>
              )}
              {isSupportOrAdmin && 
                (ticketData.status === 'RESOLVED' || ticketData.status === 'CLOSED') && (
                <Button
                  onClick={() => handleStatusChange('IN_PROGRESS')}
                  disabled={updateStatusMutation.isLoading}
                  variant="outline"
                  size="sm"
                  className="bg-blue-50 hover:bg-blue-100"
                >
                  Avaa tiketti uudelleen
                </Button>
              )}
            </div>
            {ticketData.assignedTo && (
              <div className="flex items-center space-x-2 text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                <User className="w-4 h-4" />
                <span>Käsittelijä: {ticketData.assignedTo.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            {ticketData.processingStartedAt && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Käsittely aloitettu</h3>
                <p className="text-sm">{formatDateTime(ticketData.processingStartedAt)}</p>
              </div>
            )}
            
            {ticketData.estimatedCompletionTime && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Arvioitu valmistuminen</h3>
                <p className="text-sm">
                  {new Date(ticketData.estimatedCompletionTime).toLocaleString('fi-FI', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {timeLeft && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      timeLeft === 'Ylitetty' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {timeLeft}
                    </span>
                  )}
                </p>
              </div>
            )}

            {ticketData.processingEndedAt && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Käsittely päättynyt</h3>
                <p className="text-sm">{formatDateTime(ticketData.processingEndedAt)}</p>
              </div>
            )}

            {ticketData.processingStartedAt && ticketData.processingEndedAt && (
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-gray-500">Käsittelyaika</h3>
                <p className="text-sm">{calculateProcessingTime(ticketData.processingStartedAt, ticketData.processingEndedAt)}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Kategoria</h3>
              <p>{category}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Laite</h3>
              <p>{ticketData.device ?? 'Ei määritelty'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">
              Ongelman kuvaus
            </h3>
            <p className="mt-1 whitespace-pre-wrap">
              {ticketData.description || 'Ei määritelty'}
            </p>
          </div>

          {ticketData.additionalInfo && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Lisätiedot
              </h3>
              <p className="mt-1 whitespace-pre-wrap">
                {ticketData.additionalInfo}
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <User className="w-4 h-4" />
            <span>
              Tiketin luonut: <br /> {createdBy}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Luotu: {createdAt}</span>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <MessageSquare className="w-4 h-4" />
            <span>Muokattu: {updatedAt}</span>
          </div>

          <div className="space-y-2">
            <Label>Vastausmuoto</Label>
            <p>{ticketData.responseFormat || 'Ei määritelty'}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Keskustelu</h3>
            <CommentSection
              comments={comments.filter(comment => comment.author?.email !== 'system@esedu.fi')}
              newComment={newComment}
              setNewComment={setNewComment}
              handleAddComment={handleAddComment}
              addCommentMutation={addCommentMutation}
              ticket={ticketData}
              onAddMediaComment={handleAddMediaComment}
            />
          </div>

          <Timeline />
        </CardContent>

        <CardFooter className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                window.close();
              }
            }}
          >
            Sulje
          </Button>
        </CardFooter>
      </Card>
      <TransferDialog />
    </div>
  );
}