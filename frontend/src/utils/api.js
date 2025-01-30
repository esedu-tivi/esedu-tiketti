import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL
})

// Prioriteetin muunnos numerosta enum-arvoksi
const mapPriorityToEnum = (priority) => {
  switch (priority) {
    case 1: return 'LOW'
    case 2: return 'MEDIUM'
    case 3: return 'HIGH'
    case 4: return 'CRITICAL'
    default: return 'MEDIUM'
  }
}

export const fetchTickets = async () => {
  try {
    const { data } = await api.get('/tickets')
    return data
  } catch (error) {
    throw new Error('Tikettien haku epäonnistui')
  }
}

export const fetchCategories = async () => {
  try {
    const { data } = await api.get('/categories')
    return data
  } catch (error) {
    throw new Error('Kategorioiden haku epäonnistui')
  }
}

export const createTicket = async (ticketData) => {
  const transformedData = {
    title: ticketData.subject,
    description: ticketData.description,
    device: ticketData.device || null,
    additionalInfo: ticketData.additionalInfo || null,
    priority: mapPriorityToEnum(ticketData.priority),
    categoryId: ticketData.categoryId
  };

  try {
    const { data } = await api.post('/tickets', transformedData)
    return data
  } catch (error) {
    throw new Error('Tiketin luonti epäonnistui')
  }
}

export const updateTicket = async (id, ticketData) => {
  // Jos päivityksessä on prioriteetti, muunnetaan se
  const transformedData = {
    ...ticketData,
    priority: ticketData.priority ? mapPriorityToEnum(ticketData.priority) : undefined
  };

  try {
    const { data } = await api.put(`/tickets/${id}`, transformedData)
    return data
  } catch (error) {
    throw new Error('Tiketin päivitys epäonnistui')
  }
}

export const deleteTicket = async (id) => {
  try {
    const { data } = await api.delete(`/tickets/${id}`)
    return data
  } catch (error) {
    throw new Error('Tiketin poisto epäonnistui')
  }
}

// yksittäisen tiketin haku
export const fetchTicket = async (id) => {
  try {
    const { data } = await api.get(`/tickets/${id}`)
    return data
  } catch (error) {
    throw new Error('Tiketin haku epäonnistui')
  }
};