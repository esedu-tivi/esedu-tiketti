import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTicket } from '../utils/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  AlertTriangle,
  Check,
  InfoIcon,
  User,
  Calendar,
  MessageSquare,
} from 'lucide-react';

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
  });

  console.log('Mitä API:sta tulee:', ticket);

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
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="p-6">
          <div className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Tiketin lataus epäonnistui</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ticket || !ticket.ticket) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardContent className="p-6">
          <div className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Tikettiä ei löytynyt</span>
          </div>
        </CardContent>
      </Card>
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

  return (
    <Card className="max-w-2xl mx-auto mt-8">
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
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm ${statusClass}`}>
            {getStatusText(ticketData.status || 'OPEN')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Kategoria</h3>
            <p>{category}</p>
          </div>

          {ticketData.device && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Laite</h3>
              <p>{ticketData.device}</p>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500">Ongelman kuvaus</h3>
          <p className="mt-1 whitespace-pre-wrap">
            {ticketData.description || 'Ei määritelty'}
          </p>
        </div>

        {ticketData.additionalInfo && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Lisätiedot</h3>
            <p className="mt-1 whitespace-pre-wrap">
              {ticketData.additionalInfo}
            </p>
          </div>
        )}

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>{createdBy}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4" />
          <span>{createdAt}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <MessageSquare className="w-4 h-4" />
          <span>{updatedAt}</span>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Sulje
        </Button>
        {ticketData.attachment ? (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Liitteet</h3>
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
          <div className="text-sm font-medium text-gray-500">Ei liitteitä</div>
        )}
      </CardFooter>
    </Card>
  );
}
