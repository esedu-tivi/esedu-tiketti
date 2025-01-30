import { useQuery } from '@tanstack/react-query';
import { fetchTickets } from '../utils/api';
import TicketList from '../components/Tickets/TicketList';

function Tickets() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  });

  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <h2>Tiketit</h2>
      </div>

      <TicketList tickets={data?.tickets} isLoading={isLoading} error={error} />
    </div>
  );
}

export default Tickets;
