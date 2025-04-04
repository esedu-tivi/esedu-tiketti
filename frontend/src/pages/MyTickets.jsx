import { useState } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { fetchMyTickets } from '../utils/api';
import TicketList from '../components/Tickets/TicketList';
import TicketListView from '../components/Tickets/TicketListView';
import { Alert } from '../components/ui/Alert';
import FilterMenu from './FilterMenu';
import { useQuery } from '@tanstack/react-query';
import { List, Grid } from 'lucide-react';

export default function MyTickets() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState('card');

  const {
    data: ticketsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['my-tickets', filters],
    queryFn: () => fetchMyTickets(filters),
    enabled: !!user,
    refetchInterval: 30000, // Päivitä tiketit automaattisesti 30 sekunnin välein
  });

  // Suodattimien päivitys
  const handleFilterChange = (newFilters) => {
    console.log("Päivitetyt suodattimet:", newFilters);
    setFilters(newFilters);
  }

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
        isMyTickets={true}
      />
      <div className="container mx-auto p-4 mt-8">
        <div className="mb-6 flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Omat tikettini</h1>
            <p className="mt-1 text-sm text-gray-500">
              Näet tässä kaikki luomasi tiketit
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
          <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-500">Et ole vielä luonut yhtään tikettiä</p>
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
      </div>
    </>
  );
} 