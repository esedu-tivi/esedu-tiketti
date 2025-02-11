import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { fetchMyTickets } from '../utils/api';
import TicketList from '../components/Tickets/TicketList';
import { Alert } from '../components/ui/Alert';
import FilterMenu from './FilterMenu';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const isMyTickets = true;

  // Tikettien lataaminen suodattimilla
    useEffect(() => {
      console.log("Haetaan tikettejä seuraavilla suodattimilla:", filters);
  
      const loadTickets = async (filters = {}) => {
        try {
          setLoading(true);
          const response = await fetchMyTickets(filters);
          console.log("Haetut tiketit:", response.tickets);
          setTickets(response.tickets);
          setError(null);
        } catch (err) {
          console.error('Error loading tickets:', err);
          setError('Tikettien lataaminen epäonnistui');
        } finally {
          setLoading(false);
        }
      }
  
      if (user) {
        loadTickets(filters); // Ladataan tiketit suodattimien kanssa
      }
    }, [user, filters]); // Käynnistetään aina kun käyttäjä tai suodattimet muuttuvat
  
    // Suodattimien päivitys
    const handleFilterChange = (newFilters) => {
      console.log("Päivitetyt suodattimet:", newFilters);
      setFilters(newFilters);
    }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="error" title="Virhe" message={error} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Omat tikettini</h1>
        <p className="mt-1 text-sm text-gray-500">
          Näet tässä kaikki luomasi tiketit
        </p>
      </div>

      <FilterMenu 
        onFilterChange={handleFilterChange} 
        isOpen={isFilterMenuOpen} 
        setIsOpen={setIsFilterMenuOpen}
        isMyTickets={isMyTickets}
      />

      {tickets.length === 0 ? (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-500">Et ole vielä luonut yhtään tikettiä</p>
        </div>
      ) : (
        <div className="mt-4">
          <TicketList tickets={tickets} />
        </div>
      )}
    </div>
  );
} 