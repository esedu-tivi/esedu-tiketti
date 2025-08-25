import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useAllTickets } from '../hooks/useTickets';
import TicketList from '../components/Tickets/TicketList';
import TicketListView from '../components/Tickets/TicketListView';
import { Alert } from '../components/ui/Alert';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { List, Grid } from 'lucide-react';
import { useViewMode } from '../hooks/useViewMode';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSocket } from '../hooks/useSocket';

export default function MyWorkView() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useViewMode('myWorkView', 'card');
  const [activeTab, setActiveTab] = useLocalStorage('myWorkView_activeTab', 'in-progress');
  const queryClient = useQueryClient();
  const { subscribe } = useSocket();

  // Query for tickets that are IN_PROGRESS and assigned to the current user
  const {
    data: inProgressResponse,
    isLoading: isLoadingInProgress,
    error: inProgressError
  } = useAllTickets({ status: 'IN_PROGRESS' });
  
  const inProgressTicketsData = {
    tickets: (inProgressResponse?.data || []).filter(ticket => ticket.assignedToId === user?.id)
  };

  // Query for tickets that are OPEN and have no assignee
  const {
    data: openResponse,
    isLoading: isLoadingUnassigned,
    error: unassignedError
  } = useAllTickets({ status: 'OPEN' });
  
  const unassignedTicketsData = {
    tickets: (openResponse?.data || []).filter(ticket => !ticket.assignedToId)
  };

  // Query for resolved and closed tickets that were handled by the current user
  const {
    data: allTicketsResponse,
    isLoading: isLoadingHistory,
    error: historyError
  } = useAllTickets({});
  
  const historyTicketsData = {
    tickets: (allTicketsResponse?.data || []).filter(ticket => {
      const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
      const wasHandledByUser = ticket.processingStartedAt && (ticket.assignedToId === user?.id || ticket.processingEndedAt);
      return isResolvedOrClosed && wasHandledByUser;
    }).sort((a, b) => {
      const dateA = new Date(a.processingEndedAt || a.updatedAt);
      const dateB = new Date(b.processingEndedAt || b.updatedAt);
      return dateB - dateA;
    })
  };

  // Set up WebSocket listeners for ticket updates
  useEffect(() => {
    if (!user) return;

    const unsubscribers = [];

    // Listen for all ticket events and invalidate relevant queries
    const handleTicketUpdate = () => {
      // Invalidate all ticket queries to refresh the view
      queryClient.invalidateQueries(['tickets']);
    };

    // Subscribe to all ticket-related events
    subscribe('ticketCreated', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    subscribe('ticketUpdated', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    subscribe('ticketStatusChanged', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    subscribe('ticketAssigned', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    subscribe('ticketDeleted', handleTicketUpdate).then(unsub => unsubscribers.push(unsub));
    
    // Special handler for tickets assigned to current user
    subscribe('ticketAssignedToYou', () => {
      queryClient.invalidateQueries(['tickets']);
      // Could also show a toast notification here
    }).then(unsub => unsubscribers.push(unsub));

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [user, subscribe, queryClient]);

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

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
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