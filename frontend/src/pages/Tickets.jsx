import { useQuery } from '@tanstack/react-query'
import { fetchTickets } from '../utils/api'
import TicketList from '../components/Tickets/TicketList'
import NewTicketButton from '../components/Tickets/NewTicketButton'

function Tickets() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets
  })

  const handleNewTicket = () => {
    // TODO: Implement new ticket creation
    console.log('New ticket button clicked')
  }

  return (
    <div className="tickets-page">
      <div className="tickets-header">
        <h2>Tiketit</h2>
        <NewTicketButton onClick={handleNewTicket} />
      </div>
      
      <TicketList 
        tickets={data?.tickets} 
        isLoading={isLoading} 
        error={error}
      />
    </div>
  )
}

export default Tickets 