import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

export const fetchTickets = async () => {
  const { data } = await api.get('/tickets')
  return data
}

export const createTicket = async (ticketData) => {
  const { data } = await api.post('/tickets', ticketData)
  return data
}

export const updateTicket = async (id, ticketData) => {
  const { data } = await api.put(`/tickets/${id}`, ticketData)
  return data
}

export const deleteTicket = async (id) => {
  const { data } = await api.delete(`/tickets/${id}`)
  return data
} 