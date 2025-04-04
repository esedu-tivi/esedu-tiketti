import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { fetchTickets } from '../utils/api';
import TicketList from '../components/Tickets/TicketList';
import TicketListView from '../components/Tickets/TicketListView';
import { Alert } from '../components/ui/Alert';
import UserManagementDialog from '../components/Admin/UserManagementDialog';
import FilterMenu from './FilterMenu';
import { useQuery } from '@tanstack/react-query';
import { List, Grid } from 'lucide-react';

export default function Tickets() {
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const { user, userRole } = useAuth();
  const [filters, setFilters] = useState({});
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('card');

  const {
    data: ticketsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => fetchTickets(filters),
    enabled: !!user,
    refetchInterval: 30000, // Päivitä tiketit automaattisesti 30 sekunnin välein
  });

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

  const tickets = ticketsData?.tickets || [];

  return (
    <>
      <FilterMenu 
          onFilterChange={handleFilterChange} 
          isOpen={isFilterMenuOpen} 
          setIsOpen={setIsFilterMenuOpen}
        />
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

          {userRole === 'ADMIN' && (
            <button
              onClick={() => setIsUserManagementOpen(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
            >
              Hallitse käyttäjiä
            </button>
          )}
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

        <UserManagementDialog
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
        />
      </div>
    </>
  );
}
