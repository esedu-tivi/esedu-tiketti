import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTicket, addComment } from '../../utils/api';
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
  const queryClient = useQueryClient();

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: !!ticketId,
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
              <span className={`px-3 py-1 rounded-full text-sm ${statusClass}`}>
                {getStatusText(ticketData.status || 'OPEN')}
              </span>
              {ticketData.attachment ? (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Liitteet
                  </h3>
                  <img
                    src={ticketData.attachment.url}
                    alt={ticketData.attachment.filename || 'Liitteen kuva'}
                    className="w-full max-w-sm rounded-lg"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    {ticketData.attachment.filename}
                  </p>
                </div>
              ) : (
                <div className="text-sm font-medium text-gray-500 ml-auto">
                  Ei liitteitä
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
              />
            </div>
          </CardContent>

          <CardFooter className="flex justify-between items-center">
            <Button variant="outline">Valitse tiketti</Button>
            <Button variant="outline" onClick={onClose}>
              Sulje
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
