import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { fetchTickets } from '../utils/api';
import TicketList from '../components/Tickets/TicketList';
import TicketListView from '../components/Tickets/TicketListView';
import { Alert } from '../components/ui/Alert';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { List, Grid } from 'lucide-react';

export default function MyWorkView() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('card');

  // Query for tickets that are IN_PROGRESS and assigned to the current user
  const {
    data: inProgressTicketsData,
    isLoading: isLoadingInProgress,
    error: inProgressError
  } = useQuery({
    queryKey: ['tickets', { status: 'IN_PROGRESS' }],
    queryFn: () => {
      // Haetaan kaikki IN_PROGRESS-tilassa olevat tiketit ja suodatetaan clientillä ne jotka on osoitettu tälle käyttäjälle
      return fetchTickets({ status: 'IN_PROGRESS' }).then(data => ({
        tickets: data.tickets.filter(ticket => ticket.assignedToId === user?.id)
      }));
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Query for tickets that are OPEN and have no assignee
  const {
    data: unassignedTicketsData,
    isLoading: isLoadingUnassigned,
    error: unassignedError
  } = useQuery({
    queryKey: ['tickets', { status: 'OPEN' }],
    queryFn: () => {
      // Haetaan kaikki OPEN-tilassa olevat tiketit ja suodatetaan clientillä ne joilla ei ole käsittelijää
      return fetchTickets({ status: 'OPEN' }).then(data => ({
        tickets: data.tickets.filter(ticket => !ticket.assignedToId)
      }));
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Query for resolved and closed tickets that were handled by the current user
  const {
    data: historyTicketsData,
    isLoading: isLoadingHistory,
    error: historyError
  } = useQuery({
    queryKey: ['tickets', { status: ['RESOLVED', 'CLOSED'] }],
    queryFn: () => {
      // Haetaan kaikki tiketit ja suodatetaan ne jotka tämä käyttäjä on käsitellyt
      return fetchTickets({}).then(data => ({
        tickets: data.tickets.filter(ticket => {
          // Tarkistetaan onko tiketti ratkaistu/suljettu ja onko käyttäjä käsitellyt sen
          const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
          // Tarkistetaan että tiketti on ollut käsittelyssä (eli sillä on processingStartedAt)
          const wasHandledByUser = ticket.processingStartedAt && (ticket.assignedToId === user?.id || ticket.processingEndedAt);

          return isResolvedOrClosed && wasHandledByUser;
        }).sort((a, b) => {
          // Järjestetään uusimmat ensin
          const dateA = new Date(a.processingEndedAt || a.updatedAt);
          const dateB = new Date(b.processingEndedAt || b.updatedAt);
          return dateB - dateA;
        })
      }));
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  if (inProgressError || unassignedError || historyError) {
    return (
      <div className="container mx-auto p-4">
        <Alert 
          variant="error" 
          title="Virhe" 
          message={inProgressError?.message || unassignedError?.message || historyError?.message} 
        />
      </div>
    );
  }

  const inProgressTickets = inProgressTicketsData?.tickets || [];
  const unassignedTickets = unassignedTicketsData?.tickets || [];
  const historyTickets = historyTicketsData?.tickets || [];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oma työnäkymä</h1>
          <p className="mt-1 text-sm text-gray-500">
            Hallinnoi käsittelyssä olevia ja avoimia tikettejä
          </p>
      </div>

      {/* Ikonit näkymän vaihtamiseen */}
      <div className="ml-auto flex gap-2 sm:gap-4 items-center">
            <span className="hidden sm:inline text-xs text-gray-500 mr-1">Näkymä:</span>
            <button 
              className={`p-1.5 sm:p-2 rounded-md ${viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setViewMode('card')}
              title="Korttinäkymä"
              aria-label="Korttinäkymä"
            >
              <Grid size={18} />
            </button>
            <button 
              className={`p-1.5 sm:p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setViewMode('list')}
              title="Listanäkymä"
              aria-label="Listanäkymä"
            >
              <List size={18} />
            </button>
          </div>
        </div>

      <Tabs defaultValue="in-progress" className="w-full">
        <TabsList>
          <TabsTrigger value="in-progress">
            Käsittelyssä ({inProgressTickets.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            Avoimet tiketit ({unassignedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Historia ({historyTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress">
          <div className="mt-4">
            {viewMode === 'card' ? (
              <TicketList tickets={inProgressTickets} isLoading={isLoadingInProgress} error={inProgressError} 
              />
            ) : (
              <TicketListView tickets={inProgressTickets} isLoading={isLoadingInProgress} error={inProgressError} 
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="unassigned">
          <div className="mt-4">
            {viewMode === 'card' ? (
              <TicketList tickets={unassignedTickets} isLoading={isLoadingUnassigned} error={unassignedError} 
              />
            ) : (
              <TicketListView tickets={unassignedTickets} isLoading={isLoadingUnassigned} error={unassignedError} 
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="mt-4">
            {viewMode === 'card' ? (
              <TicketList tickets={historyTickets} isLoading={isLoadingHistory} error={historyError} 
              />
            ) : (
              <TicketListView tickets={historyTickets} isLoading={isLoadingHistory} error={historyError} 
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 