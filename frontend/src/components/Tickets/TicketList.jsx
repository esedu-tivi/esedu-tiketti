function TicketList({ tickets = [], isLoading, error }) {
  if (isLoading) return <div>Ladataan tikettejä...</div>
  if (error) return <div>Virhe: {error.message}</div>
  
  return (
    <div className="ticket-list">
      {!tickets || tickets.length === 0 ? (
        <p>Ei tikettejä näytettäväksi</p>
      ) : (
        <ul>
          {tickets.map(ticket => (
            <li key={ticket.id} className="ticket-item">
              <h3>{ticket.title}</h3>
              <p>{ticket.description}</p>
              <div className="ticket-meta">
                <span>Status: {ticket.status}</span>
                <span>Luotu: {new Date(ticket.createdAt).toLocaleDateString('fi-FI')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default TicketList 