import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTicket, addComment, takeTicketIntoProcessing, releaseTicket, updateTicketStatusWithComment, transferTicket, fetchSupportUsers } from '../../utils/api';
import { useAuth } from '../../providers/AuthProvider';
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
} from 'lucide-react';

import CommentSection from '../Tickets/CommentSection';

export default function TicketDetailsModal({ ticketId, onClose }) {
  const [newComment, setNewComment] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const queryClient = useQueryClient();
  const { userRole, user } = useAuth();

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: !!ticketId,
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

  const takeIntoProcessingMutation = useMutation({
    mutationFn: () => takeTicketIntoProcessing(ticketId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', ticketId]);
    },
  });

  const releaseTicketMutation = useMutation({
    mutationFn: () => releaseTicket(ticketId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', ticketId]);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => updateTicketStatusWithComment(ticketId, status),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', ticketId]);
    },
  });

  const transferTicketMutation = useMutation({
    mutationFn: ({ targetUserId }) => transferTicket(ticketId, targetUserId),
    onSuccess: (data) => {
      queryClient.setQueryData(['ticket', ticketId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          ticket: data.ticket,
        };
      });
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
      queryClient.invalidateQueries(['ticket', ticketId]);
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'RESOLVED':
        return 'bg-green-100 text-green-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'OPEN':
        return 'Avoin';
      case 'IN_PROGRESS':
        return 'Käsittelyssä';
      case 'RESOLVED':
        return 'Ratkaistu';
      case 'CLOSED':
        return 'Suljettu';
      default:
        return status;
    }
  };

  const formatDateTime = (date) => {
    if (!date) return 'Ei määritelty';
    return new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (!ticket || !ticket.ticket) {
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

  const ticketData = ticket.ticket;
  const priorityInfo = getPriorityInfo(ticketData?.priority || 'MEDIUM');
  const PriorityIcon = priorityInfo.icon;
  const statusClass = getStatusBadgeClass(ticketData?.status || 'OPEN');
  const category = ticketData?.category?.name || 'Ei määritelty';

  // Debug tulostukset
  console.log('User role:', userRole);
  console.log('User id:', user?.id);
  console.log('Ticket status:', ticketData?.status);
  console.log('Ticket assignedToId:', ticketData?.assignedToId);
  console.log('Should show take button:', (userRole === 'SUPPORT' || userRole === 'ADMIN') && ticketData?.status === 'OPEN' && !ticketData?.assignedToId);
  console.log('Should show control buttons:', (userRole === 'SUPPORT' || userRole === 'ADMIN') && ticketData?.status === 'IN_PROGRESS' && (ticketData?.assignedToId === user?.id || userRole === 'ADMIN'));

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

  const handleClose = (e) => {
    if (e.target.id === 'modal-background') {
      onClose();
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

  return (
    <div
      id="modal-background"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-none shadow-none">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">
                  {ticketData.title || 'Ei määritelty'}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Tiketti #{ticketData.id || 'Ei määritelty'}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <PriorityIcon className={`w-4 h-4 ${priorityInfo.color}`} />
                <span className={`text-sm ${priorityInfo.color}`}>
                  {priorityInfo.text}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm ${statusClass}`}>
                  {getStatusText(ticketData.status || 'OPEN')}
                </span>
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
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  <span>Käsittelijä: {ticketData.assignedTo.name}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              {ticketData.processingStartedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Käsittely aloitettu</h3>
                  <p>{formatDateTime(ticketData.processingStartedAt)}</p>
                </div>
              )}
              
              {ticketData.estimatedCompletionTime && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Arvioitu valmistuminen</h3>
                  <p>{formatDateTime(ticketData.estimatedCompletionTime)}</p>
                </div>
              )}

              {ticketData.processingEndedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Käsittely päättynyt</h3>
                  <p>{formatDateTime(ticketData.processingEndedAt)}</p>
                </div>
              )}

              {ticketData.processingStartedAt && ticketData.processingEndedAt && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Käsittelyaika</h3>
                  <p>{calculateProcessingTime(ticketData.processingStartedAt, ticketData.processingEndedAt)}</p>
                </div>
              )}
            </div>

            {ticketData && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Kategoria
                  </h3>
                  <p>{category}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">Laite</h3>
                  <p>{ticketData.device ?? 'Ei määritelty'}</p>
                </div>
              </div>
            )}

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
              <p>{ticketData.responseType || 'Ei määritelty'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Kommentit</h3>
              <CommentSection
                comments={comments}
                newComment={newComment}
                setNewComment={setNewComment}
                handleAddComment={handleAddComment}
                addCommentMutation={addCommentMutation}
                ticket={ticketData}
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center">
          
            <Button variant="outline" onClick={onClose}>
              Sulje
            </Button>
          </CardFooter>
        </Card>
      </div>
      <TransferDialog />
    </div>
  );
}
