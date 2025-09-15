import React, { useState } from 'react';
import TicketDetailsModal from './TicketDetailsModal';
import { AlertTriangle, Check, InfoIcon, Clock, Trash2 } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { authService } from '../../services/authService';
import { bulkDeleteTickets } from '../../utils/api';
import BulkActionToolbar from './BulkActionToolbar';

function TicketList({ tickets = [], isLoading, error }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
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

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteTickets,
    onSuccess: (response) => {
      const deletedCount = response.data?.deletedCount || response.deletedCount || 0;
      toast.success(`${deletedCount} tiketti${deletedCount !== 1 ? 'ä' : ''} poistettu onnistuneesti!`);
      setSelectedTickets(new Set());
      setIsSelectMode(false);
      queryClient.invalidateQueries(['tickets']);
      queryClient.invalidateQueries(['my-tickets']);
    },
    onError: (error) => {
      console.error('Error bulk deleting tickets:', error);
      toast.error(error.message || 'Tikettien poistaminen epäonnistui.');
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

  const handleTicketClick = (ticketId, event) => {
    // Don't do anything if clicking on the checkbox itself
    if (event.target.type === 'checkbox') {
      return;
    }
    
    if (isSelectMode && userRole === 'ADMIN') {
      event.preventDefault();
      event.stopPropagation();
      toggleTicketSelection(ticketId);
    } else {
      setSelectedTicketId(ticketId);
    }
  };

  const toggleTicketSelection = (ticketId) => {
    const newSelection = new Set(selectedTickets);
    if (newSelection.has(ticketId)) {
      newSelection.delete(ticketId);
    } else {
      newSelection.add(ticketId);
    }
    setSelectedTickets(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    const ticketIds = Array.from(selectedTickets);
    bulkDeleteMutation.mutate(ticketIds);
  };

  const handleClearSelection = () => {
    setSelectedTickets(new Set());
    setIsSelectMode(false);
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
      {userRole === 'ADMIN' && tickets.length > 0 && (
        <div className="mb-4 flex items-center gap-4">
          <Button
            variant={isSelectMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              setSelectedTickets(new Set());
            }}
          >
            {isSelectMode ? 'Lopeta valinta' : 'Valitse tikettejä'}
          </Button>
          {isSelectMode && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedTickets.size === tickets.length && tickets.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
              />
              Valitse kaikki
            </label>
          )}
        </div>
      )}
      
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
                className={`ticket-item bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition group relative ${
                  selectedTickets.has(ticket.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={(e) => handleTicketClick(ticket.id, e)}
              >
                {isSelectMode && userRole === 'ADMIN' && (
                  <div className="absolute top-4 left-4 z-10">
                    <input
                      type="checkbox"
                      checked={selectedTickets.has(ticket.id)}
                      onChange={() => toggleTicketSelection(ticket.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div className={`block ${isSelectMode && userRole === 'ADMIN' ? 'ml-8' : ''}`}>
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
                
                {userRole === 'ADMIN' && !isSelectMode && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-4 right-4 text-gray-400 hover:text-red-500 hover:bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeleteClick(e, ticket)}
                    aria-label="Poista tiketti"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
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
      
      {userRole === 'ADMIN' && (
        <BulkActionToolbar
          selectedCount={selectedTickets.size}
          onDelete={handleBulkDelete}
          onClearSelection={handleClearSelection}
          isDeleting={bulkDeleteMutation.isLoading}
        />
      )}
    </div>
  );
}

export default TicketList;
