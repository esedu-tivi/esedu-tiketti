import React, { useState } from 'react';
import TicketDetailsModal from './TicketDetailsModal';
import { AlertTriangle, Check, InfoIcon } from 'lucide-react';

const TicketListView = ({ tickets = [], isLoading, error }) => {
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  if (isLoading) return <div>Ladataan tikettejä...</div>;
  if (error) return <div>Virhe tikettien lataamisessa: {error.message}</div>;

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

  return (
    <div className="ticket-list">
      {!tickets || tickets.length === 0 ? (
        <p>Ei tikettejä näytettäväksi</p>
      ) : (
        <div className="w-full">
          <div className="grid grid-cols-[2fr_1fr_auto_1fr] border-b border-gray-300 text-m font-semibold bg-gray-100 p-2">
            <span>Otsikko</span>
            <span>Prioriteetti</span>
            <span>Status</span>
            <span className="text-right">Päivämäärä</span>
          </div>
          <ul className="p-0 m-0">
            {tickets.map((ticket) => {
              const priorityInfo = getPriorityInfo(ticket.priority);
              const statusClass = getStatusInfo(ticket.status);
              const createdDate = new Date(ticket.createdAt).toLocaleDateString('fi-FI', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              return (
                <li
                  key={ticket.id}
                  className="grid grid-cols-[2fr_1fr_auto_1fr] text-s border-b border-gray-200 cursor-pointer p-1 
                  hover:bg-gray-100 hover:shadow-sm transition-shadow duration-200"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <span className='text-blue-600'>{ticket.title}</span>
                  <span className={`flex items-center gap-1 w-fit w-[100px] ${priorityInfo.color}`}>
                    <priorityInfo.icon className="w-3 h-3" />
                    {priorityInfo.text}
                  </span>
                  <span className={`inline-block px-2 py-0.5 rounded-full w-[100px] text-center ${statusClass}`}>
                    {ticket.status === 'OPEN'
                      ? 'Avoin'
                      : ticket.status === 'IN_PROGRESS'
                      ? 'Käsittelyssä'
                      : ticket.status === 'RESOLVED'
                      ? 'Ratkaistu'
                      : 'Suljettu'}
                  </span>
                  <span className="text-right">{createdDate}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {selectedTicketId && (
        <TicketDetailsModal ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
      )}
    </div>
  );
};

export default TicketListView;

