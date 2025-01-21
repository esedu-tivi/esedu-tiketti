function NewTicketButton({ onClick }) {
  return (
    <button 
      className="new-ticket-btn"
      onClick={onClick}
    >
      Uusi tiketti
    </button>
  )
}

export default NewTicketButton 