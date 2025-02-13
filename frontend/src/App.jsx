import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Layout/Header'
import NewTicketForm from './components/Tickets/NewTicketForm'
import Tickets from './pages/Tickets'
import Login from './pages/Login'
import AuthGuard from './components/auth/AuthGuard'
import MyTickets from './pages/MyTickets'
import Unauthorized from './pages/Unauthorized'
import './styles/globals.css';
import MyWorkView from './pages/MyWorkView';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './providers/AuthProvider';
import ProfileView from './pages/ProfileView';

function App() {
  const { userRole } = useAuth();
  const isSupportOrAdmin = userRole === 'SUPPORT' || userRole === 'ADMIN';

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
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
                <main className="container mx-auto px-4 py-8">
                  <MyTickets />
                </main>
              </>
            </AuthGuard>
          } />
          
          <Route path="/new-ticket" element={
            <AuthGuard>
              <>
                <Header />
                <main className="container mx-auto px-4 py-8">
                  <NewTicketForm />
                </main>
              </>
            </AuthGuard>
          } />

          {/* Tukihenkilöiden työnäkymä */}
          <Route path="/my-work" element={
            <AuthGuard requiredRole={['SUPPORT', 'ADMIN']}>
              <>
                <Header />
                <main className="container mx-auto px-4 py-8">
                  <MyWorkView />
                </main>
              </>
            </AuthGuard>
          } />
        
          {/* Hallintareitit (admin ja tukihenkilöt) */}
          <Route path="/admin" element={
            <AuthGuard requiredRole="MANAGEMENT">
              <>
                <Header />
                <main className="container mx-auto px-4 py-8">
                  <Tickets />
                </main>
              </>
            </AuthGuard>
          } />
          
          <Route path="/admin/tickets" element={
            <AuthGuard requiredRole="MANAGEMENT">
              <>
                <Header />
                <main className="container mx-auto px-4 py-8">
                  <Tickets />
                </main>
              </>
            </AuthGuard>
          } />

          <Route path="/profile" element={
            <AuthGuard>
              <>
                <Header />
                <main className="container mx-auto px-4 py-8">
                  <ProfileView />
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
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#4F46E5',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  );
}

export default App; 