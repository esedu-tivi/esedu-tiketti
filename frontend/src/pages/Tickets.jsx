import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { useAllTickets } from '../hooks/useTickets';
import TicketList from '../components/Tickets/TicketList';
import TicketListView from '../components/Tickets/TicketListView';
import { Alert } from '../components/ui/Alert';
import UserManagementDialog from '../components/Admin/UserManagementDialog';
import FilterMenu from './FilterMenu';
import { useQueryClient } from '@tanstack/react-query';
import { List, Grid } from 'lucide-react';
import { useViewMode } from '../hooks/useViewMode';
import { useSocket } from '../hooks/useSocket';

export default function Tickets() {
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const { user, userRole } = useAuth();
  const [filters, setFilters] = useState({});
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useViewMode('allTickets', 'card');
  const queryClient = useQueryClient();
  const { subscribe } = useSocket();

  const {
    data: ticketsData,
    isLoading,
    error
  } = useAllTickets(filters);

  // Set up WebSocket listeners for ticket updates
  useEffect(() => {
    if (!user) return;

    const unsubscribers = [];

    // Listen for new tickets
    subscribe('ticketCreated', () => {
      queryClient.invalidateQueries(['tickets']);
    }).then(unsub => unsubscribers.push(unsub));

    // Listen for ticket updates
    subscribe('ticketUpdated', () => {
      queryClient.invalidateQueries(['tickets']);
    }).then(unsub => unsubscribers.push(unsub));

    // Listen for ticket status changes
    subscribe('ticketStatusChanged', () => {
      queryClient.invalidateQueries(['tickets']);
    }).then(unsub => unsubscribers.push(unsub));

    // Listen for ticket assignments
    subscribe('ticketAssigned', () => {
      queryClient.invalidateQueries(['tickets']);
    }).then(unsub => unsubscribers.push(unsub));

    // Listen for ticket deletions
    subscribe('ticketDeleted', () => {
      queryClient.invalidateQueries(['tickets']);
    }).then(unsub => unsubscribers.push(unsub));

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [user, subscribe, queryClient]);

  // Suodattimien päivitys
  const handleFilterChange = (newFilters) => {
    console.log("Päivitetyt suodattimet:", newFilters);
    setFilters(newFilters);
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="error" title="Virhe" message={error.message} />
      </div>
    );
  }

  const tickets = ticketsData?.data || ticketsData?.tickets || [];

  return (
    <>
      <div className="sticky top-16 z-40 bg-white shadow-sm">
        <FilterMenu 
          onFilterChange={handleFilterChange} 
          isOpen={isFilterMenuOpen} 
          setIsOpen={setIsFilterMenuOpen}
        />
      </div>
      <div className="container mx-auto p-4 mt-8">
        <div className="mb-6 flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kaikki tiketit</h1>
            <p className="mt-1 text-sm text-gray-500">
              Hallinnoi ja seuraa kaikkia tikettejä
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

        {tickets.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-500">Ei tikettejä</p>
          </div>
        ) : (
          <div className="mt-4">
            {viewMode === 'card' ? (
              <TicketList tickets={tickets} isLoading={isLoading} error={error} />
            ) : (
              <TicketListView tickets={tickets} isLoading={isLoading} error={error} />
            )}
          </div>
        )}

        {userRole === 'ADMIN' && (
          <UserManagementDialog
            isOpen={isUserManagementOpen}
            onClose={() => setIsUserManagementOpen(false)}
          />
        )}
      </div>
    </>
  );
}
