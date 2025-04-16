import React, { useState } from 'react';
import TicketDetailsModal from './TicketDetailsModal';
import { AlertTriangle, Check, InfoIcon, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';

function TicketList({ tickets = [], isLoading, error }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const { userRole } = useAuth();
  const queryClient = useQueryClient();

  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId) => {
      const token = await authService.acquireToken();
      if (!token) {
        toast.error('Autentikointitietoja ei löytynyt. Kirjaudu sisään uudelleen.');
        throw new Error('Authentication token could not be acquired.');
      }
      const response = await axios.delete(`/api/tickets/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Tiketti poistettu onnistuneesti!');
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
    },
    onError: (error) => {
      console.error('Error deleting ticket:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Tiketin poistaminen epäonnistui.';
      toast.error(errorMessage);
    },
  });

  if (isLoading) return <div>Ladataan tikettejä...</div>;
  if (error) return <div>Virhe: {error.message}</div>;

  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'LOW':
        return {
          color: 'text-green-600 bg-green-50',
          icon: Check,
          text: 'Matala',
        };
      case 'MEDIUM':
        return {
          color: 'text-yellow-600 bg-yellow-50',
          icon: InfoIcon,
          text: 'Normaali',
        };
      case 'HIGH':
        return {
          color: 'text-orange-600 bg-orange-50',
          icon: AlertTriangle,
          text: 'Korkea',
        };
      case 'CRITICAL':
        return {
          color: 'text-red-600 bg-red-50',
          icon: AlertTriangle,
          text: 'Kriittinen',
        };
      default:
        return {
          color: 'text-yellow-600 bg-yellow-50',
          icon: InfoIcon,
          text: 'Normaali',
        };
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'OPEN':
        return 'bg-green-500';
      case 'IN_PROGRESS':
        return 'bg-yellow-500';
      case 'RESOLVED':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'Juuri nyt';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min sitten`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h sitten`;
    return `${Math.floor(diffInSeconds / 86400)} pv sitten`;
  };

  const handleTicketClick = (ticketId) => {
    setSelectedTicketId(ticketId);
  };

  const handleDeleteClick = (e, ticket) => {
    e.stopPropagation();

    toast(
      (t) => (
        <span className="flex flex-col items-center">
          <span>
            Haluatko varmasti poistaa tiketin <strong>"{ticket.title}"</strong> (#{ticket.id})?
          </span>
          <span className="mt-2">
            <Button
              variant="destructive"
              size="sm"
              className="mr-2"
              onClick={() => {
                deleteTicketMutation.mutate(ticket.id);
                toast.dismiss(t.id);
              }}
              disabled={deleteTicketMutation.isLoading}
            >
              {deleteTicketMutation.isLoading ? 'Poistetaan...' : 'Kyllä, poista'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.dismiss(t.id)}
            >
              Peruuta
            </Button>
          </span>
        </span>
      ),
      {
        duration: Infinity,
      }
    );
  };

  return (
    <div className="ticket-list">
      {!tickets || tickets.length === 0 ? (
        <p>Ei tikettejä näytettäväksi</p>
      ) : (
        <ul className="space-y-4">
          {tickets.map((ticket) => {
            const priorityInfo = getPriorityInfo(ticket.priority);
            const PriorityIcon = priorityInfo.icon;
            const statusColor = getStatusInfo(ticket.status);
            const timeAgo = formatTimeAgo(ticket.createdAt);

            return (
              <li
                key={ticket.id}
                className="ticket-item bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition group relative"
                onClick={() => handleTicketClick(ticket.id)}
              >
                {userRole === 'ADMIN' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteClick(e, ticket)}
                    aria-label="Poista tiketti"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <div className="block">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticket.title}
                    </h3>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${priorityInfo.color}`}>
                      <PriorityIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">{priorityInfo.text}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-600 line-clamp-2">{ticket.description}</p>
                  <div className="ticket-meta mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-2 ${statusColor}`} />
                      {ticket.status}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {timeAgo}
                    </span>
                    <span>
                      Tekijä: {ticket.createdBy?.name || 'Tuntematon'}
                    </span>
                    {ticket.assignedTo && (
                      <span className="text-blue-600">
                        Käsittelijä: {ticket.assignedTo.name}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedTicketId && (
        <TicketDetailsModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}

export default TicketList;
