import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Layout/Header'
import NewTicketForm from './components/Tickets/NewTicketForm'
import Tickets from './pages/Tickets'
import FilterMenu from './pages/FilterMenu'
import TicketDetails from './pages/TicketDetails'
import Login from './pages/Login'
import AuthGuard from './components/auth/AuthGuard'
import './styles/globals.css';

function App() {
  return (
    <Router>
      <AuthGuard>
        <div className="app">
          <Header />
          <main>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <>
                  <FilterMenu />
                  <Tickets />
                </>
              } />
              <Route path="/new-ticket" element={<NewTicketForm />} />
              <Route path="/tickets/:id" element={<TicketDetails />} />
            </Routes>
          </main>
        </div>
      </AuthGuard>
    </Router>
  );
}

export default App; 