import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
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
import TicketPage from './pages/TicketPage';
import Layout from './components/Layout/Layout';
import AITools from './pages/AITools';
import DiscordSettings from './pages/DiscordSettings';

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
              <Layout>
                <MyTickets />
              </Layout>
            </AuthGuard>
          } />

          <Route path="/tickets/:id" element={
            <AuthGuard>
              <Layout>
                <TicketPage />
              </Layout>
            </AuthGuard>
          } />
                  
          {/* Tukihenkilöiden työnäkymä */}
          <Route path="/my-work" element={
            <AuthGuard requiredRole={['SUPPORT', 'ADMIN']}>
              <Layout>
                <MyWorkView />
              </Layout>
            </AuthGuard>
          } />
        
          {/* Hallintareitit (admin ja tukihenkilöt) */}
          <Route path="/admin" element={
            <AuthGuard requiredRole="MANAGEMENT">
              <Layout>
                <Tickets />
              </Layout>
            </AuthGuard>
          } />
          
          <Route path="/admin/tickets" element={
            <AuthGuard requiredRole="MANAGEMENT">
              <Layout>
                <Tickets />
              </Layout>
            </AuthGuard>
          } />

          {/* Tekoälytyökalut (vain admin) */}
          <Route path="/ai-tools" element={
            <AuthGuard requiredRole="ADMIN">
              <Layout>
                <AITools />
              </Layout>
            </AuthGuard>
          } />

          {/* Discord-asetukset (vain admin) */}
          <Route path="/discord-settings" element={
            <AuthGuard requiredRole="ADMIN">
              <Layout>
                <DiscordSettings />
              </Layout>
            </AuthGuard>
          } />

          <Route path="/profile" element={
            <AuthGuard>
              <Layout>
                <ProfileView />
              </Layout>
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