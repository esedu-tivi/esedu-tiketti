import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Layout/Header'
import NewTicketForm from './components/Tickets/NewTicketForm'
import Tickets from './pages/Tickets'
import FilterMenu from './pages/FilterMenu'
import TicketDetails from './pages/TicketDetails'

import './styles/globals.css';

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={
                <>
                <FilterMenu />
                <Tickets />
                </>
                } 
              />
              <Route path="/new-ticket" element={<NewTicketForm />} />
              <Route path="/ticket/:id" element={<TicketDetails />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App 