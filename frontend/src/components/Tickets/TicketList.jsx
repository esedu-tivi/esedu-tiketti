function TicketList({ tickets = [], isLoading, error }) {
  if (isLoading) return <div>Ladataan tikettejä...</div>;
  if (error) return <div>Virhe: {error.message}</div>;

  return (
    <div className="ticket-list">
      {!tickets || tickets.length === 0 ? (
        <p>Ei tikettejä näytettäväksi</p>
      ) : (
        <ul className="space-y-4">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="ticket-item bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900">{ticket.title}</h3>
              <p className="mt-2 text-gray-600">{ticket.description}</p>
              <div className="ticket-meta mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    ticket.status === 'OPEN' ? 'bg-green-500' :
                    ticket.status === 'IN_PROGRESS' ? 'bg-yellow-500' :
                    ticket.status === 'RESOLVED' ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`} />
                  Status: {ticket.status}
                </span>
                <span>
                  Luotu:{' '}
                  {new Date(ticket.createdAt).toLocaleDateString('fi-FI')}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Tekijä: {ticket.createdBy?.name || 'Tuntematon'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TicketList;
