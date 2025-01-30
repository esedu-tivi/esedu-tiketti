import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/Card';
import { AlertTriangle, Check, InfoIcon, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/Alert';

function TicketList({ tickets = [], isLoading, error }) {
  const getPriorityInfo = (priority) => {
    switch (priority) {
      case 'LOW':
        return {
          color: 'text-green-600',
          icon: Check,
          text: 'Matala',
        };
      case 'MEDIUM':
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali',
        };
      case 'HIGH':
        return {
          color: 'text-orange-600',
          icon: AlertTriangle,
          text: 'Korkea',
        };
      case 'CRITICAL':
        return {
          color: 'text-red-600',
          icon: AlertTriangle,
          text: 'Kriittinen',
        };
      default:
        return {
          color: 'text-yellow-600',
          icon: InfoIcon,
          text: 'Normaali',
        };
    }
  };

  const getStatusColor = (status) => {
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
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <span className="ml-2">Ladataan tikettejä...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="max-w-2xl mx-auto mt-4 bg-red-50 border-red-200">
        <AlertTriangle className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-600">
          {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <Alert className="max-w-2xl mx-auto mt-4">
        <InfoIcon className="w-4 h-4" />
        <AlertDescription>Ei tikettejä näytettäväksi</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-w-full mx-auto p-4">
      {tickets.map((ticket) => {
        const priorityInfo = getPriorityInfo(ticket.priority);
        const PriorityIcon = priorityInfo.icon;
        const statusColor = getStatusColor(ticket.status);

        return (
          <Link key={ticket.id} to={`/ticket/${ticket.id}`}>
            <Card className="hover:bg-gray-50 transition-colors">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-medium">{ticket.title}</h3>
                    <div className="flex items-center space-x-2">
                      <PriorityIcon
                        className={`w-4 h-4 ${priorityInfo.color}`}
                      />
                      <span className={`text-sm ${priorityInfo.color}`}>
                        {priorityInfo.text}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 line-clamp-2">
                    {ticket.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${statusColor}`}
                    >
                      {getStatusText(ticket.status)}
                    </span>
                    <span>Kategoria: {ticket.category?.name}</span>
                    <span>
                      Luotu:{' '}
                      {new Date(ticket.createdAt).toLocaleDateString('fi-FI')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export default TicketList;
