import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Layout/Header'
import NewTicketForm from './components/Tickets/NewTicketForm'
import Tickets from './pages/Tickets'
import FilterMenu from './pages/FilterMenu'
import TicketDetails from './pages/TicketDetails'
import Login from './pages/Login'
import AuthGuard from './components/auth/AuthGuard'
import MyTickets from './pages/MyTickets'
import Unauthorized from './pages/Unauthorized'
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Julkiset reitit */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          
          {/* Oletusreitti ohjaa käyttäjän omiin tiketteihin */}
          <Route path="/" element={
            <AuthGuard>
              <Navigate to="/my-tickets" replace />
            </AuthGuard>
          } />

          {/* Suojatut käyttäjäreitit */}
          <Route path="/my-tickets" element={
            <AuthGuard>
              <>
                <Header />
                <main>
                  <MyTickets />
                </main>
              </>
            </AuthGuard>
          } />
          
          <Route path="/new-ticket" element={
            <AuthGuard>
              <>
                <Header />
                <main>
                  <NewTicketForm />
                </main>
              </>
            </AuthGuard>
          } />
          
          <Route path="/tickets/:id" element={
            <AuthGuard>
              <>
                <Header />
                <main>
                  <TicketDetails />
                </main>
              </>
            </AuthGuard>
          } />

          {/* Hallintareitit (admin ja tukihenkilöt) */}
          <Route path="/admin" element={
            <AuthGuard requiredRole="MANAGEMENT">
              <>
                <Header />
                <main>
                  <FilterMenu />
                  <Tickets />
                </main>
              </>
            </AuthGuard>
          } />
          
          <Route path="/admin/tickets" element={
            <AuthGuard requiredRole="MANAGEMENT">
              <>
                <Header />
                <main>
                  <FilterMenu />
                  <Tickets />
                </main>
              </>
            </AuthGuard>
          } />

          {/* Catch-all reitti tuntemattomille osoitteille */}
          <Route path="*" element={
            <Navigate to="/" replace />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 