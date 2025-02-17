import React, { useState } from 'react';
import TicketDetailsModal from './TicketDetailsModal';
import { AlertTriangle, Check, InfoIcon, Clock } from 'lucide-react';

function TicketList({ tickets = [], isLoading, error }) {
  const [selectedTicketId, setSelectedTicketId] = useState(null);

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
                className="ticket-item bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition"
                onClick={() => handleTicketClick(ticket.id)}
              >
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
