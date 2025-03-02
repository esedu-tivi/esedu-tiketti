import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTicket, addComment, takeTicketIntoProcessing, releaseTicket, updateTicketStatusWithComment, transferTicket, fetchSupportUsers } from '../utils/api';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../components/ui/Card';
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
} from 'lucide-react';
import { Button } from '../components/ui/Button';

import CommentSection from '../components/Tickets/CommentSection';

export default function TicketPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data: ticket,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => fetchTicket(id),
    enabled: !!id,
  });

  if (isLoading) return <div>Ladataan...</div>;
  if (error) return <div>Virhe: {error.message}</div>;
  if (!ticket || !ticket.ticket) return <div>Tikettiä ei löytynyt</div>;

  const ticketData = ticket.ticket;
  const category = ticketData?.category?.name || 'Ei määritelty';
  const createdAt = new Date(ticketData.createdAt).toLocaleString('fi-FI');
  const updatedAt = new Date(ticketData.updatedAt).toLocaleString('fi-FI');
  const createdBy = ticketData.createdBy?.name || 'Tuntematon käyttäjä';

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

  const priorityInfo = getPriorityInfo(ticketData?.priority || 'MEDIUM');
  const PriorityIcon = priorityInfo.icon;

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
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${getStatusInfo(ticketData.status).color} ${getStatusInfo(ticketData.status).animation}`}
              >
                {React.createElement(getStatusInfo(ticketData.status).icon, {
                  className: 'w-5 h-5',
                })}
                <span className="text-sm font-medium">
                  {getStatusInfo(ticketData.status).text}
                </span>
              </div>
            </div>
            {ticketData.assignedTo && (
              <div className="flex items-center space-x-2 text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                <User className="w-4 h-4" />
                <span>Käsittelijä: {ticketData.assignedTo.name}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
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
              <span>Vastausmuoto</span>
              <p>{ticketData.responseFormat || 'Ei määritelty'}</p>
            </div>
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
            <p className="whitespace-pre-wrap">
              {ticketData.description || 'Ei määritelty'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Lisätiedot</h3>
            <p className="whitespace-pre-wrap">
              {ticketData.additionalInfo || 'Ei lisätietoja'}
            </p>
          </div>



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
    </div>
  );
}